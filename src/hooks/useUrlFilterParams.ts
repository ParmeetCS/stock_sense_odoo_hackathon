import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Custom React hook to sync filter & search state with URL query parameters
 */
export function useUrlFilterParams<T extends Record<string, any>>(defaults: T) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Helper to read a param value from URL or default
  const getParam = useCallback(
    (key: keyof T, fallback: any = defaults[key]) => {
      const val = searchParams.get(String(key));
      if (val === null || val === undefined) return fallback;
      if (typeof fallback === 'number') return Number(val) || fallback;
      return val;
    },
    [searchParams, defaults]
  );

  // Helper to update one or multiple params in URL
  const updateParams = useCallback(
    (newParams: Partial<T>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          Object.entries(newParams).forEach(([key, val]) => {
            const defaultVal = defaults[key];
            if (
              val === undefined ||
              val === null ||
              val === '' ||
              val === 'all' ||
              val === defaultVal
            ) {
              next.delete(key);
            } else {
              next.set(key, String(val));
            }
          });

          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams, defaults]
  );

  // Helper to reset all params to defaults
  const resetParams = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  return {
    getParam,
    updateParams,
    resetParams,
    searchParams,
  };
}
