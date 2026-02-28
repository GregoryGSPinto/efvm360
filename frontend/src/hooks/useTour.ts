// ============================================================================
// EFVM360 v3.2 — useTour Hook
// Guided Tour state management with localStorage persistence
// ============================================================================

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'efvm360-tour-completo';

interface UseTourReturn {
  tourAtivo: boolean;
  tourCompleto: boolean;
  iniciarTour: () => void;
  completarTour: () => void;
  pularTour: () => void;
  resetarTour: () => void;
}

export function useTour(): UseTourReturn {
  const [tourAtivo, setTourAtivo] = useState(false);
  const [tourCompleto, setTourCompleto] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const iniciarTour = useCallback(() => {
    setTourAtivo(true);
  }, []);

  const completarTour = useCallback(() => {
    setTourAtivo(false);
    setTourCompleto(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch { /* fail silently */ }
  }, []);

  const pularTour = useCallback(() => {
    setTourAtivo(false);
    setTourCompleto(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch { /* fail silently */ }
  }, []);

  const resetarTour = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* fail silently */ }
    setTourCompleto(false);
  }, []);

  return { tourAtivo, tourCompleto, iniciarTour, completarTour, pularTour, resetarTour };
}
