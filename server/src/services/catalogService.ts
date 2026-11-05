import type { Work } from "@prisma/client";
import { db } from "../data/client";

export interface PublicWork {
  id: number;
  slug: string;
  title: string;
  author: string;
  authorLife: string;
  year: number;
  yearLabel: string;
  summary: string;
  room: { key: string; label: string };
  gutenberg: { available: boolean; id: number | null; url: string };
}

export interface RoomSummary {
  key: string;
  label: string;
  count: number;
}

export interface SearchParams {
  q?: string;
  room?: string;
  author?: string;
  sort?: "relevance" | "title" | "year" | "author";
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  items: PublicWork[];
  total: number;
  page: number;
  pageSize: number;
}

export function yearLabel(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : String(year);
}

export function gutenbergLink(work: Pick<Work, "gutenbergId" | "title" | "author">) {
  if (work.gutenbergId) {
    return {
      available: true,
      id: work.gutenbergId,
      url: `https://www.gutenberg.org/ebooks/${work.gutenbergId}`
    };
  }
  const query = encodeURIComponent(`${work.title} ${work.author}`);
  return {
    available: false,
    id: null,
    url: `https://www.gutenberg.org/ebooks/search/?query=${query}`
  };
}

export function presentWork(work: Work): PublicWork {
  return {
    id: work.id,
    slug: work.slug,
    title: work.title,
    author: work.author,
    authorLife: work.authorLife,
    year: work.year,
    yearLabel: yearLabel(work.year),
    summary: work.summary,
    room: { key: work.roomKey, label: work.roomLabel },
    gutenberg: gutenbergLink(work)
  };
}

const FILLER = new Set([
  "a", "an", "the", "and", "or", "of", "in", "on", "to", "for", "with", "about", "by", "from",
  "is", "are", "was", "were", "be", "me", "my", "i", "you", "any", "some", "that", "this", "these",
  "those", "it", "its", "do", "does", "did", "can", "could", "would", "should", "please", "show",
  "find", "give", "recommend", "suggest", "books", "book", "titles", "title", "works", "work",
  "have", "has", "what", "which", "who", "how", "where", "when", "tell", "looking", "look", "want",
  "need", "like", "read", "reading", "interested", "something", "anything", "good", "best", "more",
  "other", "else", "s"
]);

/** Loose topical synonyms so conversational queries still land on the right shelves. */
const TOPIC_HINTS: Record<string, string[]> = {
  evolution: ["species", "natural selection", "darwin", "wallace", "heredity"],
  electricity: ["electrical", "current", "tesla", "alternating"],
  electric: ["electrical", "current", "tesla", "alternating"],
  slavery: ["slave", "enslaved", "abolition", "freedom"],
  abolition: ["slave", "enslaved", "douglass"],
  stoic: ["stoic", "marcus aurelius", "epictetus", "seneca"],
  stoicism: ["stoic", "marcus aurelius", "epictetus", "seneca"],
  polar: ["antarctic", "arctic", "pole", "ice"],
  antarctic: ["pole", "shackleton", "scott", "amundsen"],
  arctic: ["pole", "nansen", "peary"],
  space: ["moon", "comet", "astronomy", "planet", "mars"],
  astronomy: ["planet", "stars", "mars", "moon"],
  radioactivity: ["radium", "radioactive", "curie"],
  physics: ["motion", "light", "relativity", "newton", "einstein"],
  ethics: ["virtue", "morals", "duty"],
  morality: ["ethics", "virtue", "morals", "duty"],
  politics: ["government", "state", "liberty", "democracy"],
  government: ["state", "liberty", "democracy", "political"],
  feminism: ["woman", "women"],
  women: ["woman", "wollstonecraft", "fuller", "stanton"],
  exploration: ["expedition", "voyage", "travel", "journey"],
  adventure: ["expedition", "voyage", "journey"],
  sea: ["ocean", "voyage", "sailing", "ship"],
  ocean: ["sea", "voyage", "submarine", "sailing"],
  nature: ["naturalist", "wilderness", "forest", "plants"],
  wilderness: ["nature", "forest", "mountains"],
  mountains: ["sierra", "alps", "rocky"],
  frontier: ["west", "plains", "ranch"],
  america: ["american", "united states", "democracy"],
  freedom: ["liberty", "slave", "independence"],
  liberty: ["freedom", "independence", "rights"],
  science: ["experiments", "nature", "discovery"],
  scifi: ["romance", "moon", "machine", "invisible"],
  fiction: ["romance", "novel"],
  essays: ["essay", "lectures"],
  history: ["empire", "revolution", "war", "chronicle"],
  rome: ["roman", "empire", "caesar"],
  greek: ["athens", "sparta", "plato", "aristotle"],
  mind: ["psychology", "understanding", "knowledge", "consciousness"],
  happiness: ["virtue", "ethics", "utility"],
  inventor: ["inventions", "engine", "electrical"],
  machine: ["engine", "invention", "mechanical"]
};

export function tokenize(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !FILLER.has(w));
}

function stem(word: string): string {
  if (word.length > 5 && word.endsWith("ies")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

interface Scored {
  work: Work;
  score: number;
  matched: number;
}

function scoreWork(work: Work, tokens: string[], phrase: string): Scored {
  const title = work.title.toLowerCase();
  const author = work.author.toLowerCase();
  const summary = work.summary.toLowerCase();
  const room = work.roomLabel.toLowerCase();
  let score = 0;
  let matched = 0;

  if (phrase.length > 3 && title.includes(phrase)) score += 12;
  if (phrase.length > 3 && author.includes(phrase)) score += 8;

  for (const token of tokens) {
    const base = stem(token);
    const hints = TOPIC_HINTS[token] ?? [];
    let hit = false;
    if (title.includes(base)) {
      score += 5;
      hit = true;
    }
    if (author.includes(base)) {
      score += 4;
      hit = true;
    }
    if (summary.includes(base)) {
      score += 1.5;
      hit = true;
    }
    if (room.includes(base)) {
      score += 1;
      hit = true;
    }
    if (!hit) {
      for (const hint of hints) {
        if (title.includes(hint) || summary.includes(hint) || author.includes(hint)) {
          score += 0.8;
          hit = true;
          break;
        }
      }
    }
    if (hit) matched += 1;
  }
  return { work, score, matched };
}

export async function searchWorks(params: SearchParams): Promise<SearchResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, params.pageSize ?? 24));

  const rows = await db.work.findMany({
    where: {
      ...(params.room ? { roomKey: params.room } : {}),
      ...(params.author ? { author: { contains: params.author } } : {})
    }
  });

  const query = params.q?.trim() ?? "";
  const tokens = tokenize(query);
  let ranked: Scored[];

  if (!tokens.length) {
    ranked = rows.map((work) => ({ work, score: 0, matched: 0 }));
  } else {
    const phrase = query.toLowerCase();
    const scored = rows.map((w) => scoreWork(w, tokens, phrase));
    const threshold = Math.max(1, Math.ceil(tokens.length / 2));
    ranked = scored.filter((s) => s.matched >= threshold);
    ranked.sort((a, b) => b.matched - a.matched || b.score - a.score || a.work.title.localeCompare(b.work.title));
  }

  const sort = params.sort ?? (tokens.length ? "relevance" : "title");
  if (sort === "title") ranked.sort((a, b) => a.work.title.localeCompare(b.work.title));
  if (sort === "year") ranked.sort((a, b) => a.work.year - b.work.year);
  if (sort === "author") {
    ranked.sort((a, b) => a.work.author.localeCompare(b.work.author) || a.work.year - b.work.year);
  }

  const start = (page - 1) * pageSize;
  return {
    items: ranked.slice(start, start + pageSize).map((r) => presentWork(r.work)),
    total: ranked.length,
    page,
    pageSize
  };
}

export async function getWork(id: number): Promise<PublicWork | null> {
  const row = await db.work.findUnique({ where: { id } });
  return row ? presentWork(row) : null;
}

export async function getWorks(ids: number[]): Promise<PublicWork[]> {
  if (!ids.length) return [];
  const rows = await db.work.findMany({ where: { id: { in: ids } } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((r): r is Work => !!r).map(presentWork);
}

export async function listRooms(): Promise<RoomSummary[]> {
  const groups = await db.work.groupBy({
    by: ["roomKey", "roomLabel"],
    _count: { _all: true }
  });
  return groups
    .map((g) => ({ key: g.roomKey, label: g.roomLabel, count: g._count._all }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function relatedWorks(id: number, limit = 6): Promise<PublicWork[]> {
  const base = await db.work.findUnique({ where: { id } });
  if (!base) return [];
  const peers = await db.work.findMany({
    where: { id: { not: id }, OR: [{ author: base.author }, { roomKey: base.roomKey }] }
  });
  peers.sort((a, b) => {
    const sameA = a.author === base.author ? 0 : 1;
    const sameB = b.author === base.author ? 0 : 1;
    return sameA - sameB || Math.abs(a.year - base.year) - Math.abs(b.year - base.year);
  });
  return peers.slice(0, limit).map(presentWork);
}

export interface WorkInput {
  title: string;
  author: string;
  authorLife?: string;
  year: number;
  summary: string;
  roomKey: string;
  roomLabel: string;
  gutenbergId?: number | null;
}

export function slugify(title: string, author: string): string {
  return `${title} ${author}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export async function createWork(input: WorkInput): Promise<PublicWork> {
  const row = await db.work.create({
    data: {
      slug: `${slugify(input.title, input.author)}-${Date.now().toString(36)}`,
      title: input.title,
      author: input.author,
      authorLife: input.authorLife ?? "",
      year: input.year,
      summary: input.summary,
      roomKey: input.roomKey,
      roomLabel: input.roomLabel,
      gutenbergId: input.gutenbergId ?? null
    }
  });
  return presentWork(row);
}

export async function updateWork(id: number, input: Partial<WorkInput>): Promise<PublicWork | null> {
  const existing = await db.work.findUnique({ where: { id } });
  if (!existing) return null;
  const row = await db.work.update({ where: { id }, data: input });
  return presentWork(row);
}

export async function deleteWork(id: number): Promise<boolean> {
  const existing = await db.work.findUnique({ where: { id } });
  if (!existing) return false;
  await db.work.delete({ where: { id } });
  return true;
}
