import { useEffect, useState } from "react";
import { call } from "../lib/api";
import type { Room, SearchResult } from "../lib/types";

export interface CatalogFilters {
  q: string;
  room: string;
  sort: "relevance" | "title" | "year" | "author";
  page: number;
}

export function useCatalogSearch(filters: CatalogFilters) {
  const [result, setResult] = useState<SearchResult | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    call<{ rooms: Room[] }>("/catalog/rooms")
      .then((r) => setRooms(r.rooms))
      .catch(() => setRooms([]));
  }, []);

  useEffect(() => {
    let stale = false;
    setLoading(true);
    const timer = setTimeout(() => {
      call<SearchResult>("/catalog", {
        query: { q: filters.q, room: filters.room, sort: filters.sort, page: filters.page, pageSize: 24 }
      })
        .then((r) => {
          if (!stale) {
            setResult(r);
            setError(null);
          }
        })
        .catch((e: Error) => !stale && setError(e.message))
        .finally(() => !stale && setLoading(false));
    }, 180);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [filters.q, filters.room, filters.sort, filters.page]);

  return { result, rooms, loading, error };
}
