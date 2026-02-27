// ============================================================================
// EFVM360 v3.2 — Hook: useAI
// Shared React hook for Anthropic Claude API calls with loading/error state
// ============================================================================

import { useState, useCallback, useRef } from 'react';
import { callClaudeAPI, type AIRequestOptions, type AIStatus } from '../services/aiService';

interface UseAIReturn<T> {
  data: T | null;
  raw: string;
  status: AIStatus;
  error: string | null;
  fromCache: boolean;
  request: (options: AIRequestOptions) => Promise<T | null>;
  reset: () => void;
}

export function useAI<T = unknown>(): UseAIReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [raw, setRaw] = useState('');
  const [status, setStatus] = useState<AIStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const abortRef = useRef(0);

  const request = useCallback(async (options: AIRequestOptions): Promise<T | null> => {
    const requestId = ++abortRef.current;
    setStatus('loading');
    setError(null);

    const result = await callClaudeAPI<T>(options);

    // Ignore if a newer request was made
    if (requestId !== abortRef.current) return null;

    if (result.error) {
      setStatus('error');
      setError(result.error);
      setData(null);
      setRaw('');
      setFromCache(false);
      return null;
    }

    setStatus('success');
    setData(result.data);
    setRaw(result.raw);
    setFromCache(result.fromCache);
    return result.data;
  }, []);

  const reset = useCallback(() => {
    abortRef.current++;
    setData(null);
    setRaw('');
    setStatus('idle');
    setError(null);
    setFromCache(false);
  }, []);

  return { data, raw, status, error, fromCache, request, reset };
}
