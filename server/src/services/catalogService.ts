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

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((w) => w.length > 1 && !FILLER.has(w));
}

function stem(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -1);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

/** Short needles would match too many unrelated words ("mar" -> "marco", "war" -> "backward"). */
const MIN_PREFIX = 5;

function wordsOf(text: string): string[] {
  const clean = normalize(text);
  return clean ? clean.split(" ") : [];
}

interface Field {
  words: string[];
  stems: string[];
  exact: number;
  prefix: number;
}

function makeField(text: string, exact: number, prefix: number): Field {
  const words = wordsOf(text);
  return { words, stems: words.map(stem), exact, prefix };
}

/** Raw word beats a plural/inflected match, which in turn beats a prefix match. */
function matchWeight(field: Field, rawNeedle: string, stemNeedle: string): number {
  let weight = 0;
  for (let i = 0; i < field.words.length; i++) {
    if (field.words[i] === rawNeedle) weight = Math.max(weight, field.exact);
    else if (field.stems[i] === stemNeedle) weight = Math.max(weight, field.exact - 0.5);
  }
  if (!weight && stemNeedle.length >= MIN_PREFIX) {
    for (const word of field.stems) {
      if (word.startsWith(stemNeedle)) {
        weight = field.prefix;
        break;
      }
    }
  }
  return weight;
}

function containsPhrase(fieldStems: string[], queryStems: string[]): boolean {
  if (!queryStems.length) return false;
  for (let start = 0; start + queryStems.length <= fieldStems.length; start++) {
    if (queryStems.every((needle, offset) => fieldStems[start + offset] === needle)) return true;
  }
  return false;
}

interface Scored {
  work: Work;
  score: number;
  matched: number;
  titleRank: number;
}

interface Hint {
  raw: string;
  stem: string;
}

function scoreWork(
  work: Work,
  tokens: string[],
  queryStems: string[],
  hints: Hint[][],
  normalizedQuery: string
): Scored {
  const fields: Field[] = [
    makeField(work.title, 6, 4),
    makeField(work.author, 5, 3.5),
    makeField(work.summary, 1.5, 1),
    makeField(work.roomLabel, 1.5, 1)
  ];

  const normalizedTitle = normalize(work.title);

  // Direct title matches always receive priority.
  let titleRank = 0;

  if (normalizedQuery) {
    if (normalizedTitle === normalizedQuery) {
      titleRank = 4;
    } else if (normalizedTitle.startsWith(normalizedQuery)) {
      titleRank = 3;
    } else if (normalizedTitle.includes(normalizedQuery)) {
      titleRank = 2;
    }
  }

  let score = 0;
  let matched = 0;

  queryStems.forEach((needle, index) => {
    let best = 0;

    for (const field of fields) {
      best = Math.max(
        best,
        matchWeight(field, tokens[index], needle)
      );
    }

    if (!best) {
      for (const hint of hints[index] ?? []) {
        if (
          fields.some(
            (field) => matchWeight(field, hint.raw, hint.stem) > 0
          )
        ) {
          best = 0.8;
          break;
        }
      }
    }

    if (best) {
      score += best;
      matched += 1;
    }
  });

  if (containsPhrase(fields[0].stems, queryStems)) score += 5;
  if (containsPhrase(fields[1].stems, queryStems)) score += 3;

  return { work, score, matched, titleRank };
}


export async function searchWorks(params: SearchParams): Promise<SearchResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, params.pageSize ?? 24));

  // Retrieve works, applying room and author filters.
  const rows = await db.work.findMany({
    where: {
      ...(params.room ? { roomKey: params.room } : {}),
      ...(params.author
        ? { author: { contains: params.author, mode: "insensitive" } }
        : {})
    }
  });

  // Normalize the search query.
  const query = params.q?.trim() ?? "";
  const normalizedQuery = normalize(query);
  const tokens = [...new Set(tokenize(query))];
  const queryStems = tokens.map(stem);

  // Generate topical hints.
  const hints = tokens.map((token) =>
    (TOPIC_HINTS[token] ?? [])
      .flatMap((hint) => tokenize(hint))
      .map((raw) => ({ raw, stem: stem(raw) }))
  );

  let ranked: Scored[];

  if (!tokens.length && !normalizedQuery) {
    ranked = rows.map((work) => ({
      work,
      score: 0,
      matched: 0,
      titleRank: 0
    }));
  } else {
    const scored = rows.map((work) =>
      scoreWork(work, tokens, queryStems, hints, normalizedQuery)
    );

    // Identify works matching every search token.
    const strict = scored.filter(
      (s) => s.matched === queryStems.length
    );

    // Always retain direct title matches.
    const pool = scored.filter((s) => {
      if (s.titleRank > 0) return true;

      if (strict.length) {
        return s.matched === queryStems.length;
      }

      return s.matched >= Math.max(1, Math.ceil(queryStems.length / 2));
    });

    // Prioritize direct title matches over other fields.
    ranked = pool.sort(
      (a, b) =>
        b.titleRank - a.titleRank ||
        b.matched - a.matched ||
        b.score - a.score ||
        a.work.title.localeCompare(b.work.title)
    );
  }

  // Apply the requested sorting option.
  const sort = params.sort ?? (tokens.length ? "relevance" : "title");

  if (sort === "title") {
    ranked.sort((a, b) =>
      a.work.title.localeCompare(b.work.title)
    );
  }

  if (sort === "year") {
    ranked.sort(
      (a, b) =>
        a.work.year - b.work.year ||
        a.work.title.localeCompare(b.work.title)
    );
  }

  if (sort === "author") {
    ranked.sort(
      (a, b) =>
        a.work.author.localeCompare(b.work.author) ||
        a.work.year - b.work.year
    );
  }

  // Paginate the ranked results.
  const start = (page - 1) * pageSize;

  return {
    items: ranked
      .slice(start, start + pageSize)
      .map((r) => presentWork(r.work)),
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
