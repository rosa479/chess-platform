import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { PlayerInfo } from '@/components/chess/PlayerInfo';
import { GamePanel } from '@/components/chess/GamePanel';
import type { Move as MoveListMove } from '@/components/chess/MoveList';
import { useAuth } from '@/hooks/use-auth';
import * as gameApi from '@/lib/api-game-lifecycle-service';
import * as userApi from '@/lib/api-user-service';
import { toast } from '@/hooks/use-toast';
import { Chess } from 'chess.js';

const boardColorMap = {
  "blue-marble.jpg": { light: "210 80% 86%", dark: "210 85% 40%", highlight: "50 100% 60%" },
  "blue.png": { light: "210 80% 85%", dark: "215 85% 38%", highlight: "50 100% 60%" },
  "wood3.jpg": { light: "38 42% 85%", dark: "32 56% 47%", highlight: "50 100% 60%" },
  "canvas2.jpg": { light: "51 24% 85%", dark: "53 46% 38%", highlight: "50 100% 60%" },
  "default": { light: "210 30% 85%", dark: "210 70% 50%", highlight: "50 100% 60%" },
};

const Game = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [gameState, setGameState] = useState<gameApi.GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moves, setMoves] = useState<MoveListMove[]>([]);
  const [theme, setTheme] = useState("cardinal");
  const [board, setBoard] = useState("wood.jpg");
  const [whiteTimeLeft, setWhiteTimeLeft] = useState(0);
  const [blackTimeLeft, setBlackTimeLeft] = useState(0);
  const [gameOver, setGameOver] = useState<{ winner: string; reason: string } | null>(null);
  const [gameNotFound, setGameNotFound] = useState(false);
  const [whitePlayerInfo, setWhitePlayerInfo] = useState<{ username: string; rating: number } | null>(null);
  const [blackPlayerInfo, setBlackPlayerInfo] = useState<{ username: string; rating: number } | null>(null);

  // Chess instance for parsing moves - separate instance for tracking full game
  const chess = useMemo(() => new Chess(), []);
  const chessHistory = useRef<Chess>(new Chess()); // Keep full game history

  // Set board colors
  useEffect(() => {
    const colors = boardColorMap[board] || boardColorMap["default"];
    const root = document.documentElement;
    root.style.setProperty('--chess-light', colors.light);
    root.style.setProperty('--chess-dark', colors.dark);
    root.style.setProperty('--chess-highlight', colors.highlight);
  }, [board]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Track if this is the initial load
  const isInitialLoadRef = useRef(true);

  // Infer a timeout result when the server has already deleted the game (404)
  const inferTimeoutOutcome = () => {
    if (!gameState) return null;
    try {
      chess.load(gameState.fen);
      const turn = chess.turn(); // whose clock should be running
      const elapsed = Date.now() - gameState.lastMoveTimestamp;
      if (turn === 'w') {
        if (gameState.whiteTimeLeftMs - elapsed <= 0) {
          return { winner: 'black', reason: 'timeout' as const };
        }
      } else {
        if (gameState.blackTimeLeftMs - elapsed <= 0) {
          return { winner: 'white', reason: 'timeout' as const };
        }
      }
    } catch (e) {
      // If FEN fails, we can't infer the outcome
      return null;
    }
    return null;
  };

  // Fetch game state
  useEffect(() => {
    if (!gameId || !isAuthenticated || gameNotFound) return;
    
    // Reset initial load flag when gameId changes
    isInitialLoadRef.current = true;
    setGameNotFound(false);

    const fetchGameState = async () => {
      // Don't poll if game is over or not found
      if (gameOver || gameNotFound) return;
      
      try {
        // Only show loading on initial load
        if (isInitialLoadRef.current) {
          setLoading(true);
        }
        
        const state = await gameApi.getGameState(gameId);
        setGameState(state);
        setWhiteTimeLeft(state.whiteTimeLeftMs);
        setBlackTimeLeft(state.blackTimeLeftMs);
        
        // Load FEN into chess instance for board display
        chess.load(state.fen);
        
        // On initial load, we don't have move history from the server,
        // so we start a fresh history and only track moves made while
        // this client is connected.
        if (isInitialLoadRef.current) {
          chessHistory.current = new Chess();
          setMoves([]);
          
          // Fetch player info on initial load
          try {
            const [whitePlayer, blackPlayer] = await Promise.all([
              userApi.getUserById(state.whitePlayerId),
              userApi.getUserById(state.blackPlayerId)
            ]);
            setWhitePlayerInfo({ username: whitePlayer.username, rating: whitePlayer.rating });
            setBlackPlayerInfo({ username: blackPlayer.username, rating: blackPlayer.rating });
          } catch (err) {
            console.error('Failed to fetch player info:', err);
            // Set fallback values - use user's username if they're one of the players
            const isUserWhite = user.userId === state.whitePlayerId;
            const isUserBlack = user.userId === state.blackPlayerId;
            setWhitePlayerInfo({ username: isUserWhite ? user.username : 'Unknown', rating: 1200 });
            setBlackPlayerInfo({ username: isUserBlack ? user.username : 'Unknown', rating: 1200 });
          }
        } else {
          // For subsequent polls, try to infer the opponent's last move
          try {
            const historyChess = chessHistory.current;
            const beforeFen = historyChess.fen();
            const targetFen = state.fen;

            if (beforeFen !== targetFen) {
              const legalMoves = historyChess.moves({ verbose: true });
              let applied = false;

              for (const move of legalMoves as any[]) {
                historyChess.move(move);
                if (historyChess.fen() === targetFen) {
                  applied = true;
                  break;
                }
                historyChess.undo();
              }

              if (applied) {
                const history = historyChess.history({ verbose: true });
                const movesList: MoveListMove[] = [];
                for (let i = 0; i < history.length; i += 2) {
                  const whiteMove = history[i];
                  const blackMove = history[i + 1];
                  movesList.push({
                    number: Math.floor(i / 2) + 1,
                    white: whiteMove.san,
                    black: blackMove?.san,
                  });
                }
                setMoves(movesList);
              } else {
                // If we can't infer the move (e.g. multiple moves happened between polls),
                // reset local history to the current position and clear the list
                chessHistory.current = new Chess(targetFen);
                setMoves([]);
              }
            }
          } catch (err) {
            console.error('Failed to sync move list from server state:', err);
          }
        }
        
        setError(null);
      } catch (err: any) {
        // Check if it's a 404 (game not found)
        const isNotFound = err.status === 404 || err.message?.includes('404') || err.message?.includes('not found');
        
        if (isNotFound) {
          // Game doesn't exist - stop polling
          setGameNotFound(true);
          
          // If we already marked game over, just stop
          if (gameOver) {
            setLoading(false);
            return;
          }

          // Attempt to infer timeout locally when the server has cleaned up the game
          const inferred = inferTimeoutOutcome();
          if (inferred) {
            setGameOver(inferred);
            setLoading(false);
            return;
          }
          
          // Otherwise, game was never found or was deleted unexpectedly
          if (isInitialLoadRef.current) {
            setError('Game not found. It may have ended or been deleted.');
            setLoading(false);
            toast({
              title: 'Game Not Found',
              description: 'The game you are looking for does not exist. It may have ended.',
              variant: 'destructive',
            });
          }
          return; // Stop further polling
        }
        
        // Only show other errors on initial load
        if (isInitialLoadRef.current) {
          setError(err.message || 'Failed to load game');
          toast({
            title: 'Error',
            description: err.message || 'Failed to load game',
            variant: 'destructive',
          });
        }
      } finally {
        if (isInitialLoadRef.current) {
          setLoading(false);
          isInitialLoadRef.current = false;
        }
      }
    };

    fetchGameState();

    // Poll for game state updates every 2 seconds (but not if game is over or not found)
    const interval = setInterval(() => {
      if (!gameOver && !gameNotFound) {
        fetchGameState();
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [gameId, isAuthenticated, gameOver, gameNotFound]);

  // Show Game Over notification whenever gameOver becomes true
  useEffect(() => {
    if (gameOver) {
      toast({
        title: 'Game Over',
        description: gameOver.winner === 'draw'
          ? `Game ended in a draw by ${gameOver.reason}`
          : `${gameOver.winner} wins by ${gameOver.reason}`,
      });
    }
  }, [gameOver]);

  // Track last move timestamp to prevent unnecessary timer restarts
  const lastMoveTimestampRef = useRef<number>(0);

  // Update time display based on last move timestamp
  useEffect(() => {
    if (!gameState || gameOver) return;

    // Only restart timer if lastMoveTimestamp actually changed
    if (gameState.lastMoveTimestamp === lastMoveTimestampRef.current) {
      // Just update the times based on current state
      setWhiteTimeLeft(gameState.whiteTimeLeftMs);
      setBlackTimeLeft(gameState.blackTimeLeftMs);
      return;
    }

    lastMoveTimestampRef.current = gameState.lastMoveTimestamp;

    const updateTimes = () => {
      if (!gameState) return;
      
      const now = Date.now();
      const elapsed = now - gameState.lastMoveTimestamp;
      
      // Determine whose turn it is
      try {
        chess.load(gameState.fen);
        const turn = chess.turn();
        
        if (turn === 'w') {
          // White's turn, white's clock is running (counting down)
          setWhiteTimeLeft(Math.max(0, gameState.whiteTimeLeftMs - elapsed));
          setBlackTimeLeft(gameState.blackTimeLeftMs); // Black's clock is stopped
        } else {
          // Black's turn, black's clock is running (counting down)
          setBlackTimeLeft(Math.max(0, gameState.blackTimeLeftMs - elapsed));
          setWhiteTimeLeft(gameState.whiteTimeLeftMs); // White's clock is stopped
        }
      } catch (e) {
        // If FEN loading fails, just use stored times
        setWhiteTimeLeft(gameState.whiteTimeLeftMs);
        setBlackTimeLeft(gameState.blackTimeLeftMs);
      }
    };

    updateTimes();
    const interval = setInterval(updateTimes, 100);
    return () => clearInterval(interval);
  }, [gameState?.lastMoveTimestamp, gameOver]); // Only depend on lastMoveTimestamp, not whole gameState

  const handleMoveAttempt = async (move: { from: string; to: string; promotion?: string }) => {
    if (!gameId || !user || !gameState || gameOver) return;

    // Check if it's the user's turn
    try {
      chess.load(gameState.fen);
    } catch (e) {
      console.error('Failed to load FEN for move validation:', e);
      return;
    }
    
    const turn = chess.turn();
    const isWhiteTurn = turn === 'w';
    const isUserWhite = user.userId === gameState.whitePlayerId;
    const isUserBlack = user.userId === gameState.blackPlayerId;
    
    if ((isWhiteTurn && !isUserWhite) || (!isWhiteTurn && !isUserBlack)) {
      toast({
        title: 'Not your turn',
        description: 'Please wait for your opponent to move',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await gameApi.makeMove(gameId, user.userId, move);
      
      if (!result.success) {
        toast({
          title: 'Invalid move',
          description: result.error || 'Cannot make that move',
          variant: 'destructive',
        });
        return;
      }

      // Apply move to history tracking chess instance
      const moveObj = { from: move.from, to: move.to, promotion: move.promotion } as any;
      const moveResult = chessHistory.current.move(moveObj);
      
      if (moveResult) {
        // Update moves list from history
        const history = chessHistory.current.history({ verbose: true });
        const movesList: MoveListMove[] = [];
        for (let i = 0; i < history.length; i += 2) {
          const whiteMove = history[i];
          const blackMove = history[i + 1];
          movesList.push({
            number: Math.floor(i / 2) + 1,
            white: whiteMove.san,
            black: blackMove?.san,
          });
        }
        setMoves(movesList);
      }

      // Check if game is over
      if ('gameOver' in result && result.gameOver) {
        setGameOver(result.outcome);
        toast({
          title: 'Game Over',
          description: result.outcome.winner === 'draw' 
            ? `Game ended in a draw by ${result.outcome.reason}`
            : `${result.outcome.winner} wins by ${result.outcome.reason}`,
        });
        // Update game state to show final position
        if ('newState' in result && result.newState) {
          setGameState(result.newState);
        }
        return;
      }

      // Update game state for normal move
      if ('newState' in result && result.newState) {
        setGameState(result.newState);
        // Time will be updated by the timer effect
        setWhiteTimeLeft(result.newState.whiteTimeLeftMs);
        setBlackTimeLeft(result.newState.blackTimeLeftMs);
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to make move',
        variant: 'destructive',
      });
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isAuthenticated || !user) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-2xl font-bold mb-2 text-destructive">Not authenticated</div>
            <div className="text-muted-foreground mb-4">You must be logged in to view this game.</div>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Go to Login
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-2xl font-bold mb-2">Loading game...</div>
            <div className="text-muted-foreground">Please wait</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if ((error || gameNotFound) && !gameState) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-2xl font-bold mb-2 text-destructive">Game Not Found</div>
            <div className="text-muted-foreground mb-4">{error || 'The game you are looking for does not exist. It may have ended.'}</div>
            <button
              onClick={() => navigate('/play')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Back to Matchmaking
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Determine player colors and info
  const isUserWhite = user.userId === gameState.whitePlayerId;
  const isUserBlack = user.userId === gameState.blackPlayerId;
  
  // Determine turn
  let isWhiteTurn = true;
  try {
    chess.load(gameState.fen);
    const turn = chess.turn();
    isWhiteTurn = turn === 'w';
  } catch (e) {
    console.error('Failed to load FEN to determine turn:', e);
  }

  // Get player names and ratings
  const whitePlayerName = whitePlayerInfo?.username || (isUserWhite ? user.username : 'Loading...');
  const blackPlayerName = blackPlayerInfo?.username || (isUserBlack ? user.username : 'Loading...');
  const whitePlayerRating = whitePlayerInfo?.rating || 1200;
  const blackPlayerRating = blackPlayerInfo?.rating || 1200;
  
  // Calculate if board should be disabled
  const isMyTurn = (isWhiteTurn && isUserWhite) || (!isWhiteTurn && isUserBlack);
  const boardDisabled = gameOver !== null || !isMyTurn;

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row min-h-screen">
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-auto">
          <div className="w-full max-w-[90vw] sm:max-w-[600px] flex flex-col gap-2">
            {/* Theme/Board selectors - could be moved to settings */}
            <div className="flex gap-2">
              <select
                className="border p-2 rounded bg-background text-foreground text-xs"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                <option value="cardinal">Cardinal</option>
                <option value="california">California</option>
                <option value="cburnett">CBurnett</option>
              </select>
              <select
                className="border p-2 rounded bg-background text-foreground text-xs"
                value={board}
                onChange={(e) => setBoard(e.target.value)}
              >
                <option value="wood.jpg">Wood</option>
                <option value="blue-marble.jpg">Blue Marble</option>
                <option value="wood3.jpg">Wood 3</option>
              </select>
            </div>

            {/* Opponent info (always top) */}
            {isUserWhite ? (
              <PlayerInfo
                username={blackPlayerName}
                rating={blackPlayerRating}
                isTop={true}
                timeLeft={formatTime(blackTimeLeft)}
                isActive={!isWhiteTurn && !gameOver && !isUserWhite}
              />
            ) : (
              <PlayerInfo
                username={whitePlayerName}
                rating={whitePlayerRating}
                isTop={true}
                timeLeft={formatTime(whiteTimeLeft)}
                isActive={isWhiteTurn && !gameOver && !isUserBlack}
              />
            )}

            {/* Chess board */}
            <ChessBoard
              theme={theme}
              boardImage={board}
              fen={gameState.fen}
              onMoveAttempt={handleMoveAttempt}
              disabled={boardDisabled}
              flipped={!isUserWhite} // Flip board if user is black
            />

            {/* User info (always bottom) */}
            {isUserWhite ? (
              <PlayerInfo
                username={whitePlayerName}
                rating={whitePlayerRating}
                isTop={false}
                timeLeft={formatTime(whiteTimeLeft)}
                isActive={isWhiteTurn && !gameOver}
              />
            ) : (
              <PlayerInfo
                username={blackPlayerName}
                rating={blackPlayerRating}
                isTop={false}
                timeLeft={formatTime(blackTimeLeft)}
                isActive={!isWhiteTurn && !gameOver}
              />
            )}

            {/* Game over message */}
            {gameOver && (
              <div className="text-center p-4 bg-card border border-border rounded-lg">
                <div className="text-xl font-bold mb-2">Game Over</div>
                <div className="text-muted-foreground">
                  {gameOver.winner === 'draw' 
                    ? `Draw by ${gameOver.reason}`
                    : `${gameOver.winner === 'white' ? whitePlayerName : blackPlayerName} wins by ${gameOver.reason}`
                  }
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="w-full md:w-80 md:border-l border-t md:border-t-0 p-4">
          <GamePanel className="h-full" moves={moves} />
        </div>
      </div>
    </MainLayout>
  );
};

export default Game;

