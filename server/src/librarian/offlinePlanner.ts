import { getWorks, listRooms, tokenize, type PublicWork } from "../services/catalogService";
import {
  comparisonSubjects,
  isComparison,
  isGreeting,
  pickFromPrior,
  refersToPrior,
  stageFromText,
  topicOf,
  wantsDetails,
  wantsSave
} from "./intent";
import { PERSONA_GREETING } from "./persona";
import { runTool, type ToolContext } from "./tools";

interface Brief {
  id: number;
  title: string;
  author: string;
  year: string;
  room: string;
  blurb: string;
}
interface FindResult {
  total: number;
  titles: Brief[];
}
interface RecordResult {
  record?: {
    id: number;
    title: string;
    author: string;
    authorLife: string;
    firstPublished: string;
    room: string;
    summary: string;
    gutenberg: string | null;
  };
  error?: string;
}

const find = async (ctx: ToolContext, query: string, limit = 5) =>
  (await runTool("find_titles", { query, limit }, ctx)) as FindResult;
const read = async (ctx: ToolContext, id: number) =>
  ((await runTool("read_record", { id }, ctx)) as RecordResult).record;

const listLine = (b: Brief, i: number) => `${i + 1}. ${b.title} - ${b.author}, ${b.year} (${b.room})`;

function sharedThemes(a: string, b: string): string[] {
  const left = new Set(tokenize(a));
  return [...new Set(tokenize(b).filter((t) => left.has(t) && t.length > 4))].slice(0, 4);
}

type Rec = NonNullable<RecordResult["record"]>;

function yearOf(r: Rec): number {
  const m = r.firstPublished.match(/^(\d+)( BCE)?$/);
  return m ? (m[2] ? -Number(m[1]) : Number(m[1])) : 0;
}

function compareReply(records: Rec[]): string {
  const lines = [`Great pairing! Here is how ${records.map((r) => `"${r.title}"`).join(" and ")} stack up.`, ""];
  for (const r of records) {
    lines.push(`- ${r.title}: ${r.author} (${r.authorLife || "dates unknown"}), first published ${r.firstPublished}, shelved in ${r.room}. ${r.summary}`);
  }
  lines.push("");
  const [a, b] = records;
  if (a && b) {
    if (a.author === b.author) lines.push(`Both are by ${a.author}, so the fun part is the shift in subject and period rather than voice.`);
    else lines.push(`Two different voices here: ${a.author} and ${b.author}.`);
    const gap = Math.abs(yearOf(a) - yearOf(b));
    if (gap > 0) {
      const earlier = yearOf(a) <= yearOf(b) ? a : b;
      lines.push(`${earlier.title} came first, by ${gap} year${gap === 1 ? "" : "s"}.`);
    }
    lines.push(a.room === b.room ? `Both live in ${a.room}, so they make a natural double feature.` : `One lives in ${a.room} and the other in ${b.room}, so you get a nice change of genre.`);
    const common = sharedThemes(a.summary, b.summary);
    if (common.length) lines.push(`Threads they share: ${common.join(", ")}.`);
  }
  lines.push("", "Want both on your shelf? Say \"save them\" and I will stage them for you to confirm.");
  return lines.join("\n");
}

export interface OfflineOutcome {
  reply: string;
}

/**
 * Rule-based stand-in for the language model. It drives the very same tools,
 * including the mandatory find_titles -> read_record sequence for comparisons.
 */
export async function planOffline(
  message: string,
  ctx: ToolContext,
  priorIds: number[]
): Promise<OfflineOutcome> {
  const text = message.trim();

  // 1. Comparison: always find_titles, then read_record on each work.
  if (isComparison(text)) {
    const subjects = comparisonSubjects(text);
    const picks: number[] = [];
    const queries = subjects.length === 2 ? subjects : [topicOf(text.replace(/\b(compare|comparison|versus|vs\.?|difference|differ|contrast)\b/gi, " "))];
    for (const q of queries) {
      if (!q) continue;
      const result = await find(ctx, q, 3);
      for (const t of result.titles) {
        if (!picks.includes(t.id)) {
          picks.push(t.id);
          if (subjects.length === 2) break;
        }
      }
    }
    if (picks.length < 2 && queries[0]) {
      const wide = await find(ctx, queries.join(" "), 4);
      for (const t of wide.titles) if (!picks.includes(t.id) && picks.length < 3) picks.push(t.id);
    }
    if (picks.length < 2 && priorIds.length >= 2 && refersToPrior(text)) {
      for (const id of priorIds.slice(0, 2)) if (!picks.includes(id)) picks.push(id);
    }
    if (picks.length < 2) {
      return {
        reply:
          "I would love to compare them, I just need two works from the catalogue. Name two titles or authors, for example: compare Darwin's Origin of Species with Wallace's Darwinism."
      };
    }
    const records: Rec[] = [];
    for (const id of picks.slice(0, 3)) {
      const rec = await read(ctx, id);
      if (rec) records.push(rec);
    }
    return { reply: compareReply(records) };
  }

  // 2. Save: stage only, never write.
  if (wantsSave(text)) {
    let ids: number[] = [];
    if (refersToPrior(text) && priorIds.length) ids = pickFromPrior(text, priorIds);
    if (!ids.length) {
      const q = topicOf(text);
      if (q) {
        const found = await find(ctx, q, 3);
        if (found.titles.length) ids = [found.titles[0].id];
      }
    }
    if (!ids.length) {
      return { reply: "Happy to line something up. Tell me which title you have in mind, or run a search first and then say 'save the second one'." };
    }
    if (!ctx.patronId) {
      const works = await getWorks(ids);
      return {
        reply: `Good pick! To save titles you will need to sign in first. Once you are in, ask me again about ${works.map((w) => `"${w.title}"`).join(" and ")} and I will line it up.`
      };
    }
    const result = (await runTool("save_to_shelf", { ids, stage: stageFromText(text) }, ctx)) as {
      staged?: boolean;
      titles?: Array<{ title: string }>;
      error?: string;
    };
    if (!result.staged) return { reply: result.error ?? "I could not stage that." };
    const names = (result.titles ?? []).map((t) => `"${t.title}"`).join(" and ");
    return {
      reply: `Nice choice! I have staged ${names} for your shelf. Nothing is saved yet: press Confirm below to place ${ids.length === 1 ? "it" : "them"} on your shelf, or Dismiss if you change your mind.`
    };
  }

  // 3. Greeting / help.
  if (isGreeting(text)) {
    const rooms = await listRooms();
    return {
      reply: `${PERSONA_GREETING}\n\nYou can browse these reading rooms: ${rooms.map((r) => `${r.label} (${r.count})`).join(", ")}.\n\nA few easy ways to start: "books about polar exploration", "compare Mill's On Liberty with Thoreau's Civil Disobedience", or "tell me about Frankenstein".`
    };
  }

  // 4. Search, optionally opening the best record.
  const topic = topicOf(text) || text;
  const found = await find(ctx, topic, 5);
  if (!found.titles.length) {
    const rooms = await listRooms();
    return {
      reply: `I could not find "${topic}" in the catalogue, but do not stop there. Try an author or a subject such as ${rooms.slice(0, 3).map((r) => r.label.toLowerCase()).join(", ")} and we will find something good.`
    };
  }
  if (wantsDetails(text)) {
    const rec = await read(ctx, found.titles[0].id);
    if (rec) {
      const link = rec.gutenberg ? ` Project Gutenberg: ${rec.gutenberg}.` : "";
      return {
        reply: `${rec.title} by ${rec.author} (${rec.authorLife || "dates unknown"}), first published ${rec.firstPublished}, in ${rec.room}. ${rec.summary}${link}\n\nSounds like your kind of read? I can stage it for your shelf whenever you like.`
      };
    }
  }
  const lines = found.titles.map(listLine);
  const more = found.total > found.titles.length ? `\n\nThere are ${found.total - found.titles.length} more matches if you want to keep exploring.` : "";
  return {
    reply: `Great topic! For "${topic}" I would start here:\n${lines.join("\n")}${more}\n\nNext step: say "tell me about the first one", "compare the first two", or "save the second one".`
  };
}

export type { PublicWork };
