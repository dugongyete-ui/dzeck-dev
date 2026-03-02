import { Sandbox } from "@e2b/code-interpreter";

import { SANDBOX_TIMEOUT } from "./types";

export async function getSandbox(sandboxId: string) {
  const sandbox = await Sandbox.connect(sandboxId);
  await sandbox.setTimeout(SANDBOX_TIMEOUT);
  return sandbox;
}

export function extractTaskSummary(text: string): string | null {
  const match = text.match(/<task_summary>([\s\S]*?)<\/task_summary>/);
  return match ? match[1].trim() : null;
}
