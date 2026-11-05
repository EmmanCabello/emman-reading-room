import { env } from "../config/env";
import type { ProposalView } from "../services/shelfService";
import { isComparison } from "./intent";
import { planOffline } from "./offlinePlanner";
import { buildSystemPrompt } from "./persona";
import { TOOL_DEFINITIONS, newToolContext, runTool, type ToolContext, type TraceStep } from "./tools";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LibrarianTurn {
  reply: string;
  mode: "online" | "offline";
  trace: TraceStep[];
  proposals: ProposalView[];
  /** Catalogue ids under discussion; the client echoes these back as `focusIds` next turn. */
  focusIds: number[];
  notice?: string;
}

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}
interface WireMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

type ToolChoice = "auto" | { type: "function"; function: { name: string } };

async function callModel(messages: WireMessage[], toolChoice: ToolChoice): Promise<WireMessage> {
  const res = await fetch(`${env.openaiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.openaiKey}` },
    body: JSON.stringify({
      model: env.openaiModel,
      messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: toolChoice,
      temperature: 0.3
    }),
    signal: AbortSignal.timeout(40_000)
  });
  if (!res.ok) throw new Error(`Model request failed with status ${res.status}`);
  const body = (await res.json()) as { choices?: Array<{ message: WireMessage }> };
  const message = body.choices?.[0]?.message;
  if (!message) throw new Error("Model returned no message");
  return message;
}

const forceTool = (name: string): ToolChoice => ({ type: "function", function: { name } });

async function runOnline(history: ChatMessage[], message: string, ctx: ToolContext, recentIds: number[]) {
  const messages: WireMessage[] = [
    { role: "system", content: buildSystemPrompt({ signedIn: !!ctx.patronId, recentIds }) },
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content }) as WireMessage),
    { role: "user", content: message }
  ];

  const mustCompare = isComparison(message);
  let foundSomething = false;
  let readSomething = false;

  for (let round = 0; round < 7; round++) {
    // Comparison questions are forced through find_titles, then read_record.
    let choice: ToolChoice = "auto";
    if (mustCompare && !ctx.trace.some((t) => t.tool === "find_titles")) choice = forceTool("find_titles");
    else if (mustCompare && foundSomething && !readSomething) choice = forceTool("read_record");

    const reply = await callModel(messages, choice);

    if (reply.tool_calls?.length) {
      messages.push({ role: "assistant", content: reply.content ?? null, tool_calls: reply.tool_calls });
      for (const call of reply.tool_calls) {
        let args: unknown = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          args = {};
        }
        const output = await runTool(call.function.name, args, ctx);
        if (call.function.name === "find_titles" && ctx.foundIds.length) foundSomething = true;
        if (call.function.name === "read_record" && ctx.readIds.length) readSomething = true;
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(output) });
      }
      continue;
    }

    if (mustCompare && foundSomething && !readSomething) {
      // The model tried to answer without reading records; push it back through read_record.
      messages.push({ role: "assistant", content: reply.content ?? "" });
      messages.push({ role: "user", content: "Open the records of the works being compared with read_record before answering." });
      continue;
    }
    return (reply.content ?? "").trim();
  }
  throw new Error("Model did not finish within the tool budget");
}

export async function converse(opts: {
  patronId: string | null;
  message: string;
  history: ChatMessage[];
  focusIds: number[];
}): Promise<LibrarianTurn> {
  const ctx = newToolContext(opts.patronId);
  let reply = "";
  let mode: "online" | "offline" = "offline";
  let notice: string | undefined;

  if (env.openaiKey) {
    try {
      reply = await runOnline(opts.history, opts.message, ctx, opts.focusIds);
      mode = "online";
    } catch (err) {
      console.warn("[librarian] online mode failed, using offline planner:", err instanceof Error ? err.message : err);
      notice = "The online curator was unavailable, so the offline planner answered.";
      // Discard partial work from the failed attempt; the offline planner starts fresh.
      ctx.trace.length = 0;
      ctx.foundIds = [];
      ctx.readIds = [];
      ctx.proposals.length = 0;
    }
  }

  if (mode === "offline") {
    const outcome = await planOffline(opts.message, ctx, opts.focusIds);
    reply = outcome.reply;
  }

  const focusIds = ctx.readIds.length ? ctx.readIds : ctx.foundIds.length ? ctx.foundIds : opts.focusIds;
  return { reply, mode, trace: ctx.trace, proposals: ctx.proposals, focusIds, notice };
}
