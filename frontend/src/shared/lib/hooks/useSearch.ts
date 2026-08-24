import { useState, useCallback, useRef, useEffect } from 'react';

interface UseSearchOptions<T> {
  onSearch: (query: string, signal: AbortSignal) => Promise<T>;
  debounceMs?: number;
  enabled?: boolean;
}

interface UseSearchResult<T> {
  search: (query: string) => void;
  cancel: () => void;
  isSearching: boolean;
  error: Error | null;
  data: T | null;
}

export function useSearch<T>({
  onSearch,
  debounceMs = 300,
  enabled = true,
}: UseSearchOptions<T>): UseSearchResult<T> {
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingQueryRef = useRef<string | null>(null);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingQueryRef.current = null;
    setIsSearching(false);
  }, []);

  const executeSearch = useCallback(
    async (query: string) => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsSearching(true);
      setError(null);

      try {
        const result = await onSearch(query, controller.signal);
        if (!controller.signal.aborted) {
          setData(result);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return; // Ignore aborted requests
        }
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err : new Error('Search failed'));
          setData(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [onSearch]
  );

  const search = useCallback(
    (query: string) => {
      if (!enabled) return;

      pendingQueryRef.current = query;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (query.trim() === '') {
        // Execute immediately for empty query (reset)
        debounceTimerRef.current = setTimeout(() => {
          if (pendingQueryRef.current === query) {
            executeSearch(query);
          }
        }, 0);
        return;
      }

      debounceTimerRef.current = setTimeout(() => {
        if (pendingQueryRef.current === query) {
          executeSearch(query);
        }
      }, debounceMs);
    },
    [enabled, debounceMs, executeSearch]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return {
    search,
    cancel,
    isSearching,
    error,
    data,
  };
}