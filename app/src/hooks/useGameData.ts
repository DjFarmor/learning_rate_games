import { useState, useCallback } from 'react';
import { LeaderboardEntry } from '../types/game';

export const useGameData = (nickname: string) => {
  const [currentGameAttemptId, setCurrentGameAttemptId] = useState(1);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [aggregateStats, setAggregateStats] = useState<any>(null);

  const getAndSetNextAttempt = useCallback(async (game: string) => {
    try {
      const res = await fetch(`/api/next-attempt?game=${encodeURIComponent(game)}&nickname=${encodeURIComponent(nickname)}`);
      const data = await res.json();
      setCurrentGameAttemptId(data.nextAttempt);
      return data.nextAttempt;
    } catch (e) {
      console.error('Failed to fetch next attempt');
      const fallback = Date.now();
      setCurrentGameAttemptId(fallback);
      return fallback;
    }
  }, [nickname]);

  const fetchLeaderboard = useCallback(async (game: string) => {
    try {
      const res = await fetch(`/api/leaderboard?game=${encodeURIComponent(game)}`);
      const data = await res.json();
      setLeaderboard(data);
    } catch (e) {
      console.error('Failed to fetch leaderboard');
    }
  }, []);

  const fetchStats = useCallback(async (game: string) => {
    try {
      const res = await fetch(`/api/stats?game=${encodeURIComponent(game)}&nickname=${encodeURIComponent(nickname)}`);
      const data = await res.json();
      setAggregateStats(data);
    } catch (e) {
      console.error('Failed to fetch stats');
    }
  }, [nickname]);

  const saveResult = useCallback(async (game: string, resultData: any) => {
    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game,
          nickname,
          ...resultData
        }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Failed to save results: ${res.status} ${errorText}`);
      }
    } catch (e) {
      console.error('Failed to save results:', e);
    }
  }, [nickname]);

  return {
    currentGameAttemptId,
    getAndSetNextAttempt,
    leaderboard,
    fetchLeaderboard,
    aggregateStats,
    fetchStats,
    saveResult
  };
};
