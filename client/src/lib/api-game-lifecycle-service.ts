// Game Lifecycle Service API utility
// Game Lifecycle Service runs on port 3003
const GAME_LIFECYCLE_SERVICE_URL =
  import.meta.env.VITE_GAME_LIFECYCLE_SERVICE_URL || "http://localhost:3003";

export type TimeControl = {
  initialMs: number;
  incrementMs: number;
};

export type GameState = {
  gameId: string;
  whitePlayerId: string;
  blackPlayerId: string;
  fen: string;
  whiteTimeLeftMs: number;
  blackTimeLeftMs: number;
  lastMoveTimestamp: number;
};

export type CreateGameResponse = {
  gameId: string;
  initialState: GameState;
};

export type Move = {
  from: string;
  to: string;
  promotion?: string;
};

export type MoveResult =
  | { success: true; newState: GameState }
  | { success: true; gameOver: true; outcome: { winner: string; reason: string } }
  | { success: false; error: string };

// Note: in production, games are created by the matchmaking service.
// This helper is useful for tooling / debugging.
export async function createGameDirect(
  whitePlayerId: string,
  blackPlayerId: string,
  timeControl: TimeControl
): Promise<CreateGameResponse> {
  const res = await fetch(`${GAME_LIFECYCLE_SERVICE_URL}/games`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ whitePlayerId, blackPlayerId, timeControl }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to create game");
  }
  return data;
}

export async function getGameState(gameId: string): Promise<GameState> {
  const res = await fetch(`${GAME_LIFECYCLE_SERVICE_URL}/games/${gameId}`);
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.error || "Failed to get game state") as any;
    error.status = res.status; // Add status code to error
    throw error;
  }
  return data as GameState;
}

export async function makeMove(
  gameId: string,
  playerId: string,
  move: Move
): Promise<MoveResult> {
  const res = await fetch(`${GAME_LIFECYCLE_SERVICE_URL}/games/${gameId}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId, move }),
  });

  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || "Failed to make move" };
  }

  if (data.error) {
    return { success: false, error: data.error };
  }

  // Check if game is over
  if (data.gameOver) {
    return { 
      success: true, 
      gameOver: true, 
      outcome: data.outcome as { winner: string; reason: string } 
    };
  }

  return { success: true, newState: data.newState as GameState };
}


