import { useState, useEffect, useCallback } from 'react';
import { fetchEmailResults } from '../api/client.js';

export function useEmailResults(pollMs = 10000) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({});

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchEmailResults(filters);
      setResults(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
    const id = setInterval(load, pollMs);
    return () => clearInterval(id);
  }, [load, pollMs]);

  return { results, loading, error, refetch: load, filters, setFilters };
}
