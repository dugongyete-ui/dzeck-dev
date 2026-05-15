import { Sandbox } from "@e2b/code-interpreter";
import { CohereClient } from "cohere-ai";
import type { Cohere } from "cohere-ai";

import { prisma } from "@/lib/db";
import { FRAGMENT_TITLE_PROMPT, PROMPT, RESPONSE_PROMPT } from "@/prompt";

import { inngest } from "./client";
import { SANDBOX_TIMEOUT } from "./types";
import { getSandbox } from "./utils";

if (!process.env.COHERE_API_KEY) {
  throw new Error("COHERE_API_KEY environment variable is not set");
}

const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });

const MODEL = "command-r-plus-08-2024";

// Cohere v2 tools use JSON schema format
const TOOLS_V2: Cohere.ToolV2[] = [
  {
    type: "function",
    function: {
      name: "terminal",
      description: "Use the terminal to run shell commands in the sandbox",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The shell command to run",
          },
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
            type: "string",
            description:
              'JSON string of an array of objects with "path" and "content" keys. Example: [{"path":"app/page.tsx","content":"..."}]',
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
            type: "string",
            description:
              'JSON string of an array of file paths to read. Example: ["app/page.tsx", "lib/utils.ts"]',
          },
        },
        required: ["files"],
      },
    },
  },
];

function parseToolArg(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return JSON.stringify(value);
}

async function setStatus(projectId: string, status: string | null) {
  await prisma.project.update({
    where: { id: projectId },
    data: { generationStatus: status },
  });
}

export const codeAgentFunction = inngest.createFunction(
  { id: "code-agent" },
  { event: "code-agent/run" },
  async ({ event, step }) => {
    const projectId = event.data.projectId;

    await setStatus(projectId, "Initializing sandbox...");
    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create("vibe-nextjs-test-2");
      await sandbox.setTimeout(SANDBOX_TIMEOUT);
      return sandbox.sandboxId;
    });

    await setStatus(projectId, "Loading context...");
    const previousMessages = await step.run("get-previous-messages", async () => {
      const messages = await prisma.message.findMany({
        where: { projectId: event.data.projectId },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      // Convert DB messages to Cohere v2 format
      return messages
        .reverse()
        .map((m): Cohere.ChatMessageV2 => {
          if (m.role === "ASSISTANT") {
            return { role: "assistant", content: m.content };
          }
          return { role: "user", content: m.content };
        });
    });

    // Build initial messages array: system + history + user message
    const userMessage = event.data.value;
    const messages: Cohere.ChatMessageV2[] = [
      ...previousMessages,
      { role: "user", content: userMessage },
    ];

    const MAX_ITER = 15;
    let summary = "";
    let files: { [path: string]: string } = {};

    for (let i = 0; i < MAX_ITER; i++) {
      await setStatus(projectId, i === 0 ? "Analyzing your request..." : "Thinking about next steps...");
      // Extract only plain-serializable data inside step.run to survive Inngest JSON serialization
      const llmResult = await step.run(`llm-call-${i}`, async () => {
        const res = await cohere.v2.chat({
          model: MODEL,
          messages: [{ role: "system", content: PROMPT }, ...messages],
          tools: TOOLS_V2,
          temperature: 0.1,
        });
        const msg = res.message;
        const content = msg.content;
        const textContent =
          typeof content === "string"
            ? content
            : Array.isArray(content)
              ? content.map((c) => ("text" in c ? (c as { text: string }).text : "")).join("")
              : "";
        return {
          toolCalls: (msg.toolCalls ?? []).map((tc) => ({
            id: tc.id,
            name: tc.function?.name ?? "",
            arguments: tc.function?.arguments ?? "{}",
          })),
          toolPlan: msg.toolPlan ?? "",
          text: textContent,
        };
      });

      // Append assistant response to messages for next iteration
      const assistantMsg: Cohere.ChatMessageV2 = {
        role: "assistant",
        toolCalls: llmResult.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.name, arguments: tc.arguments },
        })),
        toolPlan: llmResult.toolPlan,
        content: llmResult.text,
      };
      messages.push(assistantMsg);

      const toolCalls = llmResult.toolCalls;

      if (toolCalls.length === 0) {
        if (llmResult.text.includes("<task_summary>")) {
          summary = llmResult.text;
        }
        break;
      }

      // Execute each tool call and collect results
      for (let j = 0; j < toolCalls.length; j++) {
        const toolCall = toolCalls[j];
        const toolName = toolCall.name;
        const rawArgs = JSON.parse(toolCall.arguments);
        const toolCallId = toolCall.id;

        let toolResult = "";

        if (toolName === "terminal") {
          const command = parseToolArg(rawArgs["command"]);
          await setStatus(projectId, `Running: ${command.slice(0, 60)}${command.length > 60 ? "..." : ""}`);
          toolResult = await step.run(`terminal-${i}-${j}`, async () => {
            const buffers = { stdout: "", stderr: "" };
            try {
              const sandbox = await getSandbox(sandboxId);
              const result = await sandbox.commands.run(command, {
                cwd: "/home/user",
                onStdout: (data: string) => {
                  buffers.stdout += data;
                },
                onStderr: (data: string) => {
                  buffers.stderr += data;
                },
              });
              return result.stdout || buffers.stdout || "(no output)";
            } catch (e) {
              return `Command failed: ${e}\nstdout: ${buffers.stdout}\nstderr: ${buffers.stderr}`;
            }
          });
        } else if (toolName === "createOrUpdateFiles") {
          const filesJson = parseToolArg(rawArgs["files"]);
          await setStatus(projectId, "Writing code files...");
          const newFiles = await step.run(
            `createOrUpdateFiles-${i}-${j}`,
            async () => {
              const updated: { [p: string]: string } = {};
              try {
                let fileList: Array<{ path: string; content: string }>;
                try {
                  fileList = JSON.parse(filesJson);
                } catch {
                  return `Error: could not parse files argument as JSON: ${filesJson}`;
                }
                const sandbox = await getSandbox(sandboxId);
                for (const file of fileList) {
                  // E2B requires absolute paths — prefix relative paths with /home/user/
                  const absolutePath = file.path.startsWith("/")
                    ? file.path
                    : `/home/user/${file.path}`;
                  await sandbox.files.write(absolutePath, file.content);
                  // Store with relative path for display in code viewer
                  updated[file.path] = file.content;
                }
                return updated;
              } catch (e) {
                return `Error writing files: ${e}`;
              }
            },
          );

          if (typeof newFiles === "object" && !Array.isArray(newFiles)) {
            files = { ...files, ...(newFiles as { [p: string]: string }) };
            toolResult = `Files written: ${Object.keys(newFiles).join(", ")}`;
          } else {
            toolResult = String(newFiles);
          }
        } else if (toolName === "readFiles") {
          const filesJson = parseToolArg(rawArgs["files"]);
          toolResult = await step.run(`readFiles-${i}-${j}`, async () => {
            try {
              let filePaths: string[];
              try {
                filePaths = JSON.parse(filesJson);
              } catch {
                return `Error: could not parse files argument as JSON: ${filesJson}`;
              }
              const sandbox = await getSandbox(sandboxId);
              const contents = [];
              for (const filePath of filePaths) {
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

        // Append tool result message
        messages.push({
          role: "tool",
          toolCallId: toolCallId,
          content: toolResult,
        });
      }
    }

    await setStatus(projectId, "Finishing up...");
    const fragmentTitle = await step.run("generate-title", async () => {
      const res = await cohere.v2.chat({
        model: MODEL,
        messages: [
          { role: "system", content: FRAGMENT_TITLE_PROMPT },
          { role: "user", content: summary || "An app was built." },
        ],
        temperature: 0.1,
      });
      const content = res.message.content;
      const text =
        typeof content === "string"
          ? content
          : Array.isArray(content)
            ? content.map((c) => ("text" in c ? c.text : "")).join("")
            : "";
      return text.trim() || "App";
    });

    const responseMessage = await step.run("generate-response", async () => {
      const res = await cohere.v2.chat({
        model: MODEL,
        messages: [
          { role: "system", content: RESPONSE_PROMPT },
          { role: "user", content: summary || "An app was built." },
        ],
        temperature: 0.1,
      });
      const content = res.message.content;
      const text =
        typeof content === "string"
          ? content
          : Array.isArray(content)
            ? content.map((c) => ("text" in c ? c.text : "")).join("")
            : "";
      return text.trim() || "Your app is ready!";
    });

    const isError = !summary || Object.keys(files).length === 0;

    // Wait for Next.js hot-reload to pick up written files before grabbing the URL
    await step.sleep("wait-for-hotreload", "5 seconds");

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      const host = sandbox.getHost(3000);
      return `https://${host}`;
    });

    await step.run("save-result", async () => {
      // Clear generation status once done
      await prisma.project.update({
        where: { id: event.data.projectId },
        data: { generationStatus: null },
      });

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
