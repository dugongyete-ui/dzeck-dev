import { Sandbox } from "@e2b/code-interpreter";

import { prisma } from "@/lib/db";
import { FRAGMENT_TITLE_PROMPT, PROMPT, RESPONSE_PROMPT } from "@/prompt";

import { inngest } from "./client";
import { SANDBOX_TIMEOUT } from "./types";
import { getSandbox } from "./utils";

const POLLINATIONS_BASE = "https://gen.pollinations.ai/v1";
const API_KEY = process.env.API_KEY || "";

const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "terminal",
      description: "Use the terminal to run commands",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "The shell command to run" },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createOrUpdateFiles",
      description: "Create or update files in the sandbox",
      parameters: {
        type: "object",
        properties: {
          files: {
            type: "array",
            items: {
              type: "object",
              properties: {
                path: { type: "string" },
                content: { type: "string" },
              },
              required: ["path", "content"],
            },
          },
        },
        required: ["files"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "readFiles",
      description: "Read files from the sandbox",
      parameters: {
        type: "object",
        properties: {
          files: {
            type: "array",
            items: { type: "string" },
            description: "List of file paths to read",
          },
        },
        required: ["files"],
      },
    },
  },
];

async function callLLM(
  model: string,
  messages: object[],
  tools?: object[],
  temperature = 0.1,
) {
  const body: Record<string, unknown> = { model, messages, temperature };
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const res = await fetch(`${POLLINATIONS_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data;
}

export const codeAgentFunction = inngest.createFunction(
  { id: "code-agent" },
  { event: "code-agent/run" },
  async ({ event, step }) => {
    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create("vibe-nextjs-test-2");
      await sandbox.setTimeout(SANDBOX_TIMEOUT);
      return sandbox.sandboxId;
    });

    const previousMessages = await step.run("get-previous-messages", async () => {
      const messages = await prisma.message.findMany({
        where: { projectId: event.data.projectId },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      return messages
        .reverse()
        .map((m) => ({
          role: m.role === "ASSISTANT" ? "assistant" : "user",
          content: m.content,
        }));
    });

    const conversationMessages: object[] = [
      { role: "system", content: PROMPT },
      ...previousMessages,
      { role: "user", content: event.data.value },
    ];

    const MAX_ITER = 15;
    let summary = "";
    let files: { [path: string]: string } = {};

    for (let i = 0; i < MAX_ITER; i++) {
      const llmResponse = await step.run(`llm-call-${i}`, async () => {
        return await callLLM("openai-large", conversationMessages, AGENT_TOOLS, 0.1);
      });

      const choice = llmResponse.choices?.[0];
      if (!choice) break;

      const message = choice.message;
      conversationMessages.push(message);

      const content: string = typeof message.content === "string" ? message.content : "";

      if (!message.tool_calls || message.tool_calls.length === 0) {
        if (content.includes("<task_summary>")) {
          summary = content;
        }
        break;
      }

      for (const toolCall of message.tool_calls) {
        const toolName: string = toolCall.function.name;
        let args: Record<string, unknown>;
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          conversationMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: "Error: failed to parse tool arguments",
          });
          continue;
        }

        let toolResult = "";

        if (toolName === "terminal") {
          toolResult = await step.run(`terminal-${i}-${toolCall.id}`, async () => {
            const buffers = { stdout: "", stderr: "" };
            try {
              const sandbox = await getSandbox(sandboxId);
              const result = await sandbox.commands.run(args.command as string, {
                onStdout: (data: string) => { buffers.stdout += data; },
                onStderr: (data: string) => { buffers.stderr += data; },
              });
              return result.stdout || buffers.stdout || "(no output)";
            } catch (e) {
              return `Command failed: ${e}\nstdout: ${buffers.stdout}\nstderr: ${buffers.stderr}`;
            }
          });
        } else if (toolName === "createOrUpdateFiles") {
          const fileList = args.files as Array<{ path: string; content: string }>;
          const newFiles = await step.run(`createOrUpdateFiles-${i}-${toolCall.id}`, async () => {
            const updated: { [p: string]: string } = {};
            try {
              const sandbox = await getSandbox(sandboxId);
              for (const file of fileList) {
                await sandbox.files.write(file.path, file.content);
                updated[file.path] = file.content;
              }
              return updated;
            } catch (e) {
              return `Error writing files: ${e}`;
            }
          });

          if (typeof newFiles === "object" && !Array.isArray(newFiles)) {
            files = { ...files, ...(newFiles as { [p: string]: string }) };
            toolResult = `Files written: ${Object.keys(newFiles).join(", ")}`;
          } else {
            toolResult = String(newFiles);
          }
        } else if (toolName === "readFiles") {
          toolResult = await step.run(`readFiles-${i}-${toolCall.id}`, async () => {
            try {
              const sandbox = await getSandbox(sandboxId);
              const contents = [];
              for (const filePath of args.files as string[]) {
                const content = await sandbox.files.read(filePath);
                contents.push({ path: filePath, content });
              }
              return JSON.stringify(contents);
            } catch (e) {
              return `Error reading files: ${e}`;
            }
          });
        } else {
          toolResult = `Unknown tool: ${toolName}`;
        }

        conversationMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult,
        });
      }
    }

    const fragmentTitle = await step.run("generate-title", async () => {
      const res = await callLLM("openai-fast", [
        { role: "system", content: FRAGMENT_TITLE_PROMPT },
        { role: "user", content: summary || "An app was built." },
      ]);
      return res.choices?.[0]?.message?.content?.trim() || "App";
    });

    const responseMessage = await step.run("generate-response", async () => {
      const res = await callLLM("openai-fast", [
        { role: "system", content: RESPONSE_PROMPT },
        { role: "user", content: summary || "An app was built." },
      ]);
      return res.choices?.[0]?.message?.content?.trim() || "Your app is ready!";
    });

    const isError = !summary || Object.keys(files).length === 0;

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      const host = sandbox.getHost(3000);
      return `https://${host}`;
    });

    await step.run("save-result", async () => {
      if (isError) {
        return await prisma.message.create({
          data: {
            projectId: event.data.projectId,
            content: "Something went wrong. Please try again.",
            role: "ASSISTANT",
            type: "ERROR",
          },
        });
      }

      return await prisma.message.create({
        data: {
          projectId: event.data.projectId,
          content: responseMessage,
          role: "ASSISTANT",
          type: "RESULT",
          fragment: {
            create: {
              sandboxUrl,
              title: fragmentTitle,
              files,
            },
          },
        },
      });
    });

    return {
      url: sandboxUrl,
      title: fragmentTitle,
      files,
      summary,
    };
  },
);
