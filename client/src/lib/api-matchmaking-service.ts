// Matchmaking Service API utility
// Per currWorking.md, matchmaking-service runs on port 3004
const MATCHMAKING_SERVICE_URL = import.meta.env.VITE_MATCHMAKING_SERVICE_URL || 'http://localhost:3004';

export type TimeControl = {
  initialMs: number;
  incrementMs: number;
};

export type TimeControls = {
  [key: string]: TimeControl;
};

export type MatchmakingStatus = {
  inQueue: boolean;
  timeControl?: string;
  rating?: number;
  waitTime?: number;
  hasGame?: boolean;
  gameId?: string | null;
  joinedAt?: number;
};

export async function getTimeControls(): Promise<TimeControls> {
  const res = await fetch(`${MATCHMAKING_SERVICE_URL}/matchmaking/time-controls`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch time controls');
  return data;
}

export async function joinMatchmaking(userId: string, timeControl: string, rating: number) {
  const res = await fetch(`${MATCHMAKING_SERVICE_URL}/matchmaking/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, timeControl, rating }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to join matchmaking');
  return data;
}

export async function leaveMatchmaking(userId: string) {
  const res = await fetch(`${MATCHMAKING_SERVICE_URL}/matchmaking/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to leave matchmaking');
  return data;
}

export async function getMatchmakingStatus(userId: string): Promise<MatchmakingStatus> {
  const res = await fetch(`${MATCHMAKING_SERVICE_URL}/matchmaking/status/${userId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to get matchmaking status');
  return data;
}

export async function getActiveGame(userId: string): Promise<{ gameId: string } | null> {
  try {
    const res = await fetch(`${MATCHMAKING_SERVICE_URL}/matchmaking/game/${userId}`);
    if (res.status === 404) return null;
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to get active game');
    return data;
  } catch (err) {
    return null;
  }
}

export async function clearActiveGame(userId: string) {
  const res = await fetch(`${MATCHMAKING_SERVICE_URL}/matchmaking/clear-active-game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to clear active game');
  return data;
}

