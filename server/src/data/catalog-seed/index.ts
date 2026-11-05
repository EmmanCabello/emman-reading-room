import { shelfChronicle } from "./shelfChronicle";
import { shelfEssays } from "./shelfEssays";
import { shelfJourneys } from "./shelfJourneys";
import { shelfNatural } from "./shelfNatural";
import { shelfRomances } from "./shelfRomances";
import { shelfThought } from "./shelfThought";
import { lifespans } from "./lifespans";
import { gutenbergIds } from "./gutenbergIds";
import type { RawWork } from "./types";

export const ROOMS = [
  { key: "natural-science", label: "Natural Science", works: shelfNatural },
  { key: "chronicle", label: "History & Memoir", works: shelfChronicle },
  { key: "thought", label: "Philosophy & Politics", works: shelfThought },
  { key: "journeys", label: "Travel & Exploration", works: shelfJourneys },
  { key: "essays", label: "Essays & Letters", works: shelfEssays },
  { key: "romance", label: "Scientific Romance", works: shelfRomances }
] as const;

export interface SeedWork {
  slug: string;
  title: string;
  author: string;
  authorLife: string;
  year: number;
  summary: string;
  roomKey: string;
  roomLabel: string;
  gutenbergId: number | null;
}

export function slugFor(title: string, author: string): string {
  const raw = `${title} ${author}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return raw.slice(0, 90).replace(/-+$/g, "");
}

export function buildSeedWorks(): SeedWork[] {
  const out: SeedWork[] = [];
  const seen = new Set<string>();
  for (const room of ROOMS) {
    for (const entry of room.works as RawWork[]) {
      const [title, author, year, summary] = entry;
      const slug = slugFor(title, author);
      if (seen.has(slug)) throw new Error(`Duplicate seed work: ${slug}`);
      seen.add(slug);
      out.push({
        slug,
        title,
        author,
        authorLife: lifespans[author] ?? "",
        year,
        summary,
        roomKey: room.key,
        roomLabel: room.label,
        gutenbergId: gutenbergIds[slug] ?? null
      });
    }
  }
  return out;
}
