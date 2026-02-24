// ============================================================================
// EFVM360 — useProjections Hook — Performance & Ranking Data
// ============================================================================

import { useMemo } from 'react';
import type { YardCode } from '../domain/aggregates/YardRegistry';
import {
  getTeamPerformance,
  getYardPerformance,
  getUserRanking,
  getTeamRanking,
  getOrCreatePerformance,
  type TeamPerformanceView,
  type YardPerformanceView,
  type UserPerformance,
} from '../services/teamPerformanceService';

interface UseProjectionsReturn {
  teamPerformance: TeamPerformanceView[];
  yardPerformance: YardPerformanceView;
  userRanking: UserPerformance[];
  teamRanking: TeamPerformanceView[];
  myPerformance: UserPerformance | null;
}

export function useProjections(yardCode: YardCode, matricula?: string): UseProjectionsReturn {
  const teamPerformance = useMemo(() => getTeamPerformance(yardCode), [yardCode]);
  const yardPerf = useMemo(() => getYardPerformance(yardCode), [yardCode]);
  const userRank = useMemo(() => getUserRanking(yardCode), [yardCode]);
  const teamRank = useMemo(() => getTeamRanking(yardCode), [yardCode]);
  const myPerf = useMemo(() => {
    if (!matricula) return null;
    return getOrCreatePerformance(matricula, yardCode);
  }, [matricula, yardCode]);

  return {
    teamPerformance,
    yardPerformance: yardPerf,
    userRanking: userRank,
    teamRanking: teamRank,
    myPerformance: myPerf,
  };
}
