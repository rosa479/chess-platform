// Rating Service API utility
// Rating service runs on port 3002
const RATING_SERVICE_URL =
  import.meta.env.VITE_RATING_SERVICE_URL || "http://localhost:3002";

export type Rating = {
  userId: string;
  timeControl: string;
  rating: number;
  ratingDeviation: number;
  volatility: number;
  gamesPlayed: number;
  lastUpdated: string;
};

export type RatingHistoryEntry = {
  rating: number;
  ratingDeviation: number;
  volatility: number;
  timestamp: string;
  timeControl: string;
};

export type LeaderboardEntry = {
  userId: string;
  username: string;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
};

export async function getUserRating(
  userId: string,
  timeControl?: string
): Promise<Rating> {
  const url = new URL(`/ratings/${userId}`, RATING_SERVICE_URL);
  if (timeControl) {
    url.searchParams.set("timeControl", timeControl);
  }

  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch rating");
  }
  return data;
}

export async function getRatingHistory(
  userId: string,
  timeControl?: string,
  limit = 100
): Promise<RatingHistoryEntry[]> {
  const url = new URL(`/ratings/${userId}/history`, RATING_SERVICE_URL);
  if (timeControl) {
    url.searchParams.set("timeControl", timeControl);
  }
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch rating history");
  }
  return data;
}

export async function getLeaderboard(
  timeControl: string,
  limit = 50
): Promise<LeaderboardEntry[]> {
  const url = new URL(`/leaderboards/${timeControl}`, RATING_SERVICE_URL);
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch leaderboard");
  }
  return data;
}


