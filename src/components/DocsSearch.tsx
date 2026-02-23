'use client';

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { useI18n } from "@/i18n/provider";

type SearchScope = "documentation" | "implementation";

type SearchResult = {
  id: string;
  title: string;
  snippet: string;
  href: string;
  scope: SearchScope;
};

export default function DocsSearch() {
  const { language, messages } = useI18n();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const trimmedQuery = query.trim();
  const shouldSearch = trimmedQuery.length >= 2;

  const scopeLabelByKey = useMemo(
    () => ({
      documentation: messages.common.searchDocsDocumentation,
      implementation: messages.common.searchDocsImplementation,
    }),
    [messages.common.searchDocsDocumentation, messages.common.searchDocsImplementation]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current) {
        return;
      }

      if (event.target instanceof Node && !rootRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!shouldSearch) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/docs-search?q=${encodeURIComponent(trimmedQuery)}&lang=${encodeURIComponent(language)}`,
          {
            signal: controller.signal,
            cache: "no-store",
          }
        );

        if (!response.ok) {
          setResults([]);
          return;
        }

        const payload = (await response.json()) as { results?: SearchResult[] };
        setResults(Array.isArray(payload.results) ? payload.results : []);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error(error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 240);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [language, shouldSearch, trimmedQuery]);

  const handleFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }, []);

  const handleResultClick = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <div className="docs-search-wrap" ref={rootRef}>
      <label className="sr-only" htmlFor="docs-search-input">
        {messages.common.searchDocsAria}
      </label>
      <input
        ref={inputRef}
        id="docs-search-input"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        className="docs-search-input"
        placeholder={messages.common.searchDocsPlaceholder}
        autoComplete="off"
        spellCheck={false}
      />

      {isOpen ? (
        <div className="docs-search-panel" role="listbox" aria-label={messages.common.searchDocsAria}>
          {!shouldSearch ? (
            <p className="docs-search-state">{messages.common.searchDocsEmpty}</p>
          ) : isLoading ? (
            <p className="docs-search-state">{messages.common.searchDocsSearching}</p>
          ) : results.length === 0 ? (
            <p className="docs-search-state">{messages.common.searchDocsNoResults}</p>
          ) : (
            <ul className="docs-search-list">
              {results.map((result) => (
                <li key={result.id}>
                  <Link href={result.href} className="docs-search-item" onClick={handleResultClick}>
                    <span className="docs-search-item-title">{result.title}</span>
                    <span className="docs-search-item-snippet">{result.snippet}</span>
                    <span className="docs-search-item-scope">{scopeLabelByKey[result.scope]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
