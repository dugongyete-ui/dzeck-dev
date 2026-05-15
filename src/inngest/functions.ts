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

const COHERE_TOOLS: Cohere.Tool[] = [
  {
    name: "terminal",
    description: "Use the terminal to run commands",
    parameterDefinitions: {
      command: {
        description: "The shell command to run",
        type: "str",
        required: true,
      },
    },
  },
  {
    name: "createOrUpdateFiles",
    description:
      "Create or update files in the sandbox. Pass files as a JSON string.",
    parameterDefinitions: {
      files: {
        description:
          'JSON string of an array of objects with "path" and "content" keys. Example: [{"path":"app/page.tsx","content":"..."}]',
        type: "str",
        required: true,
      },
    },
  },
  {
    name: "readFiles",
    description: "Read files from the sandbox",
    parameterDefinitions: {
      files: {
        description:
          'JSON string of an array of file paths to read. Example: ["app/page.tsx", "lib/utils.ts"]',
        type: "str",
        required: true,
      },
    },
  },
];

async function callLLM(
  message: string,
  chatHistory: Cohere.Message[],
  options: {
    preamble?: string;
    tools?: Cohere.Tool[];
    toolResults?: Cohere.ToolResult[];
    temperature?: number;
  } = {},
): Promise<Cohere.NonStreamedChatResponse> {
  const params: Cohere.ChatRequest = {
    model: "command-r-plus",
    message,
    chatHistory,
    temperature: options.temperature ?? 0.1,
  };
  if (options.preamble) params.preamble = options.preamble;
  if (options.tools && options.tools.length > 0) params.tools = options.tools;
  if (options.toolResults && options.toolResults.length > 0)
    params.toolResults = options.toolResults;
  return cohere.chat(params);
}

function parseToolArg(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return JSON.stringify(value);
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
          role: m.role === "ASSISTANT" ? "CHATBOT" : "USER",
          message: m.content,
        })) as Cohere.Message[];
    });

    let chatHistory: Cohere.Message[] = previousMessages;
    const userMessage = event.data.value;

    const MAX_ITER = 15;
    let summary = "";
    let files: { [path: string]: string } = {};
    let pendingToolResults: Cohere.ToolResult[] = [];

    for (let i = 0; i < MAX_ITER; i++) {
      const llmResponse = await step.run(`llm-call-${i}`, async () => {
        return await callLLM(userMessage, chatHistory, {
          preamble: PROMPT,
          tools: COHERE_TOOLS,
          toolResults: pendingToolResults.length > 0 ? pendingToolResults : undefined,
          temperature: 0.1,
        });
      });

      chatHistory = (llmResponse.chatHistory as Cohere.Message[]) ?? chatHistory;
      pendingToolResults = [];

      const toolCalls = llmResponse.toolCalls ?? [];

      if (toolCalls.length === 0) {
        if (llmResponse.text?.includes("<task_summary>")) {
          summary = llmResponse.text;
        }
        break;
      }

      const toolResults: Cohere.ToolResult[] = [];

      for (let j = 0; j < toolCalls.length; j++) {
        const toolCall = toolCalls[j];
        const toolName = toolCall.name;
        const rawArgs = toolCall.parameters ?? {};

        let toolResult = "";

        if (toolName === "terminal") {
          const command = parseToolArg(rawArgs["command"]);
          toolResult = await step.run(`terminal-${i}-${j}`, async () => {
            const buffers = { stdout: "", stderr: "" };
            try {
              const sandbox = await getSandbox(sandboxId);
              const result = await sandbox.commands.run(command, {
                onStdout: (data: string) => { buffers.stdout += data; },
                onStderr: (data: string) => { buffers.stderr += data; },
              });
              return result.stdout || buffers.stdout || "(no output)";
            } catch (e) {
              return `Command failed: ${e}\nstdout: ${buffers.stdout}\nstderr: ${buffers.stderr}`;
            }
          });
        } else if (toolName === "createOrUpdateFiles") {
          const filesJson = parseToolArg(rawArgs["files"]);
          const newFiles = await step.run(`createOrUpdateFiles-${i}-${j}`, async () => {
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

        toolResults.push({
          call: toolCall,
          outputs: [{ result: toolResult }],
        });
      }

      pendingToolResults = toolResults;
    }

    const fragmentTitle = await step.run("generate-title", async () => {
      const res = await callLLM(summary || "An app was built.", [], {
        preamble: FRAGMENT_TITLE_PROMPT,
        temperature: 0.1,
      });
      return res.text?.trim() || "App";
    });

    const responseMessage = await step.run("generate-response", async () => {
      const res = await callLLM(summary || "An app was built.", [], {
        preamble: RESPONSE_PROMPT,
        temperature: 0.1,
      });
      return res.text?.trim() || "Your app is ready!";
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
