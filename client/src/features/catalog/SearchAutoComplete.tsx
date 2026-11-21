
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { call } from "../../lib/api";
import type { SearchResult, Work } from "../../lib/types";
import "./SearchAutocomplete.css";

export function SearchAutocomplete() {
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<Work[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const query = value.trim();

    if (query.length < 2) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    let stale = false;

    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);

        const result = await call<SearchResult>("/catalog", {
          query: {
            q: query,
            page: 1,
            pageSize: 6,
            sort: "relevance"
          }
        });

        if (!stale) {
          setSuggestions(result.items);
          setOpen(true);
          setActiveIndex(-1);
        }
      } catch {
        if (!stale) {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        if (!stale) setLoading(false);
      }
    }, 280);

    return () => {
      stale = true;
      window.clearTimeout(timer);
    };
  }, [value]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  function selectWork(work: Work) {
    setValue("");
    setOpen(false);
    navigate(`/work/${work.id}`);
  }

  function searchAll() {
    const query = value.trim();
    if (!query) return;

    setOpen(false);
    navigate(`/?q=${encodeURIComponent(query)}`);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) =>
        current < suggestions.length - 1 ? current + 1 : 0
      );
    }

    if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setActiveIndex((current) =>
        current > 0 ? current - 1 : suggestions.length - 1
      );
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (activeIndex >= 0 && suggestions[activeIndex]) {
        selectWork(suggestions[activeIndex]);
      } else {
        searchAll();
      }
    }

    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="search-autocomplete" ref={wrapperRef}>
      <div className="search-autocomplete__input-wrap">
        <span className="search-autocomplete__icon">⌕</span>

        <input
          type="search"
          value={value}
          placeholder="Search books, authors, or subjects..."
          aria-label="Search books and authors"
          aria-expanded={open}
          aria-controls="search-suggestions"
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />

        {loading && (
          <span className="search-autocomplete__loading" />
        )}

        {value && (
          <button
            type="button"
            className="search-autocomplete__clear"
            onClick={() => {
              setValue("");
              setSuggestions([]);
              setOpen(false);
            }}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <div
          className="search-autocomplete__dropdown"
          id="search-suggestions"
          role="listbox"
        >
          {suggestions.length > 0 ? (
            <>
              {suggestions.map((work, index) => (
                <button
                  type="button"
                  key={work.id}
                  role="option"
                  aria-selected={activeIndex === index}
                  className={`search-autocomplete__suggestion ${
                    activeIndex === index ? "is-active" : ""
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectWork(work)}
                >
                  <span className="search-autocomplete__book-icon">
                    ▤
                  </span>

                  <span className="search-autocomplete__details">
                    <strong>{work.title}</strong>
                    <small>
                      {work.author}
                      {work.yearLabel ? ` · ${work.yearLabel}` : ""}
                    </small>
                  </span>
                </button>
              ))}

              <button
                type="button"
                className="search-autocomplete__all"
                onClick={searchAll}
              >
                Search all results for "{value}"
                <span>→</span>
              </button>
            </>
          ) : (
            <div className="search-autocomplete__empty">
              No matching books found.
              <button type="button" onClick={searchAll}>
                Search anyway
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
