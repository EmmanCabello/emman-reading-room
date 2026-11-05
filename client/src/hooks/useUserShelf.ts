import { useContext } from "react";
import { ShelfContext, type ShelfValue } from "../features/shelf/ShelfProvider";

export function useUserShelf(): ShelfValue {
  const ctx = useContext(ShelfContext);
  if (!ctx) throw new Error("useUserShelf must be used inside ShelfProvider");
  return ctx;
}
