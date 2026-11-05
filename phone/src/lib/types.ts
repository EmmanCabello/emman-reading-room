export interface Work {
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

export interface Room {
  key: string;
  label: string;
  count: number;
}

export interface SearchResult {
  items: Work[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Patron {
  id: string;
  email: string;
  displayName: string;
  role: "reader" | "admin";
}

export interface Allowance {
  audience: "guest" | "reader";
  cap: number;
  used: number;
  remaining: number;
}

export type Stage = "to-read" | "reading" | "finished";

export interface ShelfEntry {
  workId: number;
  stage: Stage;
  addedAt: string;
  updatedAt: string;
  work: Work;
}

export interface PinEntry {
  id: string;
  workId: number;
  locator: string;
  createdAt: string;
  work: Work;
}

export interface ShelfSnapshot {
  entries: ShelfEntry[];
  pins: PinEntry[];
  revision: string;
}

export interface Proposal {
  id: string;
  stage: Stage;
  works: Work[];
}

export interface TraceStep {
  tool: "find_titles" | "read_record" | "save_to_shelf";
  args: Record<string, unknown>;
  summary: string;
}

export interface LibrarianTurn {
  reply: string;
  mode: "online" | "offline";
  trace: TraceStep[];
  proposals: Proposal[];
  focusIds: number[];
  notice?: string;
}

export interface AdminOverview {
  totals: Record<string, number>;
  popular: Array<{ claims: number; work: Work }>;
  recent: Array<{ claimedAt: string; patron: string; email: string; work: Work }>;
  guests: Array<{ ip: string; claims: number }>;
}
