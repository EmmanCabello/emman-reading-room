import { z } from "zod";
import { getWork, searchWorks, type PublicWork } from "../services/catalogService";
import { SHELF_STAGES, stageProposal, type ProposalView } from "../services/shelfService";

export interface TraceStep {
  tool: "find_titles" | "read_record" | "save_to_shelf";
  args: Record<string, unknown>;
  summary: string;
}

export interface ToolContext {
  patronId: string | null;
  trace: TraceStep[];
  proposals: ProposalView[];
  /** Ids returned by the most recent find_titles call this turn. */
  foundIds: number[];
  /** Ids opened with read_record this turn. */
  readIds: number[];
}

export function newToolContext(patronId: string | null): ToolContext {
  return { patronId, trace: [], proposals: [], foundIds: [], readIds: [] };
}

/** Function-calling schema shared with the online model. */
export const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "find_titles",
      description:
        "Search the catalogue by topic, title words, author, or reading room. Returns up to 8 short matches with ids.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Topic, title words or author, e.g. 'Darwin evolution'." },
          room: {
            type: "string",
            enum: ["natural-science", "chronicle", "thought", "journeys", "essays", "romance"],
            description: "Optional reading room filter."
          },
          limit: { type: "integer", minimum: 1, maximum: 8 }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "read_record",
      description:
        "Open the full catalogue record for one title: author, dates, reading room, summary and Gutenberg link.",
      parameters: {
        type: "object",
        properties: { id: { type: "integer", description: "Catalogue id from find_titles." } },
        required: ["id"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "save_to_shelf",
      description:
        "STAGE titles for the reader's shelf. This does not write to the shelf; the reader must confirm separately.",
      parameters: {
        type: "object",
        properties: {
          ids: { type: "array", items: { type: "integer" }, minItems: 1, maxItems: 8 },
          stage: { type: "string", enum: [...SHELF_STAGES] }
        },
        required: ["ids"]
      }
    }
  }
];

const findArgs = z.object({
  query: z.string().min(1).max(200),
  room: z.string().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(8).optional()
});
const readArgs = z.object({ id: z.coerce.number().int() });
const saveArgs = z.object({
  ids: z.array(z.coerce.number().int()).min(1).max(8),
  stage: z.enum(SHELF_STAGES).optional()
});

const brief = (w: PublicWork) => ({
  id: w.id,
  title: w.title,
  author: w.author,
  year: w.yearLabel,
  room: w.room.label,
  blurb: w.summary.length > 120 ? `${w.summary.slice(0, 117)}...` : w.summary
});

export async function runTool(name: string, rawArgs: unknown, ctx: ToolContext): Promise<unknown> {
  try {
    switch (name) {
      case "find_titles": {
        const args = findArgs.parse(rawArgs);
        const result = await searchWorks({ q: args.query, room: args.room, pageSize: args.limit ?? 5 });
        ctx.foundIds = result.items.map((w) => w.id);
        ctx.trace.push({
          tool: "find_titles",
          args: { ...args },
          summary: result.items.length
            ? `${result.total} match${result.total === 1 ? "" : "es"}; top: ${result.items[0].title}`
            : "no matches"
        });
        return { total: result.total, titles: result.items.map(brief) };
      }
      case "read_record": {
        const args = readArgs.parse(rawArgs);
        const work = await getWork(args.id);
        if (!work) {
          ctx.trace.push({ tool: "read_record", args: { ...args }, summary: "no such record" });
          return { error: `No record with id ${args.id}.` };
        }
        if (!ctx.readIds.includes(work.id)) ctx.readIds.push(work.id);
        ctx.trace.push({ tool: "read_record", args: { ...args }, summary: `${work.title} (${work.yearLabel})` });
        return {
          record: {
            id: work.id,
            title: work.title,
            author: work.author,
            authorLife: work.authorLife,
            firstPublished: work.yearLabel,
            room: work.room.label,
            summary: work.summary,
            gutenberg: work.gutenberg.available ? work.gutenberg.url : null
          }
        };
      }
      case "save_to_shelf": {
        const args = saveArgs.parse(rawArgs);
        if (!ctx.patronId) {
          ctx.trace.push({ tool: "save_to_shelf", args: { ...args }, summary: "blocked: reader is not signed in" });
          return { staged: false, error: "The reader is not signed in, so nothing can be staged. Ask them to sign in." };
        }
        const proposal = await stageProposal(ctx.patronId, args.ids, args.stage ?? "to-read");
        ctx.proposals.push(proposal);
        ctx.trace.push({
          tool: "save_to_shelf",
          args: { ...args },
          summary: `staged ${proposal.works.length} title(s), awaiting confirmation`
        });
        return {
          staged: true,
          status: "awaiting_confirmation",
          proposalId: proposal.id,
          titles: proposal.works.map((w) => ({ id: w.id, title: w.title })),
          note: "Nothing has been written to the shelf. The reader must confirm in the app."
        };
      }
      default:
        return { error: `Unknown tool ${name}.` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool failed.";
    return { error: message };
  }
}
