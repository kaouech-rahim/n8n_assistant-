import { useState, useEffect, useCallback } from 'react';
import { fetchSpamResults } from '../api/client.js';

export function useSpamResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSpamResults();
      setResults(data);
    } catch (err) {
      console.error('Erreur dans useSpamResults:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch initial results
    fetchResults();

    // Set up polling every 10 seconds
    const interval = setInterval(fetchResults, 10000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [fetchResults]);

  return {
    results,
    loading,
    error,
    refetch: fetchResults,
  };
}