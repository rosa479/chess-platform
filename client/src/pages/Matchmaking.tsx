import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import * as matchmakingApi from '@/lib/api-matchmaking-service';
import { Clock, Search, X, Loader2 } from 'lucide-react';

const Matchmaking = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [timeControls, setTimeControls] = useState({});
  const [selectedTimeControl, setSelectedTimeControl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInQueue, setIsInQueue] = useState(false);
  const [activeQueueType, setActiveQueueType] = useState<string | null>(null);
  const [joinedAt, setJoinedAt] = useState<number | null>(null);
  const [waitTime, setWaitTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingActive = useRef(false);
  const hasJoinedQueue = useRef(false); // New: prevent duplicate join

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const init = async () => {
      if (!isAuthenticated || !user) return;
      try {
        // clearActiveGame REMOVED
        const controls = await matchmakingApi.getTimeControls();
        setTimeControls(controls);
        const firstKey = Object.keys(controls)[0];
        if (firstKey) setSelectedTimeControl(firstKey);
        // Don't checkQueueStatus here -- always start on join
      } catch (err) {
        setError('Failed to load matchmaking configuration');
      }
    };
    init();
    return () => stopPolling();
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!isInQueue || !joinedAt) {
      setWaitTime(0);
      return;
    }
    const interval = setInterval(() => {
      setWaitTime(Date.now() - joinedAt);
    }, 500);
    return () => clearInterval(interval);
  }, [isInQueue, joinedAt]);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    isPollingActive.current = false;
  };

  // Use /matchmaking/game/:userId for polling (per new request)
  const startPolling = () => {
    if (isPollingActive.current) return;
    isPollingActive.current = true;
    pollingRef.current = setInterval(async () => {
      if (!user) return;
      try {
        const game = await matchmakingApi.getActiveGame(user.userId);
        if (game && game.gameId) {
          stopPolling();
          setIsInQueue(false);
          setIsLoading(false);
          setJoinedAt(null);
          setWaitTime(0);
          navigate(`/game/${game.gameId}`);
          return;
        }
      } catch (err) {
        // No game found
      }
    }, 2000);
  };

  const handleJoinQueue = async () => {
    if (!user || !selectedTimeControl || hasJoinedQueue.current || (activeQueueType && activeQueueType !== selectedTimeControl)) return;
    setIsLoading(true);
    setError(null);
    hasJoinedQueue.current = true;
    setActiveQueueType(selectedTimeControl);
    try {
      await matchmakingApi.joinMatchmaking(user.userId, selectedTimeControl, user.rating);
      setIsInQueue(true);
      setJoinedAt(Date.now());
      startPolling();
    } catch (err: any) {
      setError(err.message || 'Failed to join queue');
      setIsInQueue(false);
      hasJoinedQueue.current = false;
      setActiveQueueType(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveQueue = async () => {
    if (!user) return;
    setIsLoading(true);
    stopPolling();
    hasJoinedQueue.current = false;
    setActiveQueueType(null);
    try {
      await matchmakingApi.leaveMatchmaking(user.userId);
      setIsInQueue(false);
      setJoinedAt(null);
    } catch (err: any) {
      setError(err.message || 'Failed to leave queue');
      setIsInQueue(false);
      setJoinedAt(null);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const safeMs = Math.max(0, ms);
    const seconds = Math.floor(safeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };
  const formatTimeControl = (control: any) => {
    if (!control) return '';
    const minutes = Math.floor(control.initialMs / 60000);
    const seconds = (control.initialMs % 60000) / 1000;
    const increment = control.incrementMs / 1000;
    const timeStr = `${minutes}${seconds > 0 ? `:${seconds.toString().padStart(2, '0')}` : ''}`;
    return increment > 0 ? `${timeStr}+${increment}` : timeStr;
  };
  const getTimeControlLabel = (key: string) => {
    const labels: Record<string, string> = {
      bullet: 'Bullet', blitz: 'Blitz', rapid: 'Rapid', classical: 'Classical',
      bullet_increment: 'Bullet', blitz_increment: 'Blitz', rapid_increment: 'Rapid',
    };
    return labels[key] || key;
  };
  if (!isAuthenticated || !user) return null;
  return (
    <MainLayout>
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-card border border-border rounded-lg shadow-lg p-6 md:p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Find a Match</h1>
              <p className="text-muted-foreground">Select a time control and start playing</p>
            </div>
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                {error}
              </div>
            )}
            {!isInQueue ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Select Time Control
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(timeControls).map(([key, control]) => (
                      <button
                        key={key}
                        onClick={() => {if (!isInQueue) setSelectedTimeControl(key)}}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          selectedTimeControl === key
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-foreground">
                              {getTimeControlLabel(key)}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <Clock className="w-4 h-4" />
                              {formatTimeControl(control)}
                            </div>
                          </div>
                          {selectedTimeControl === key && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={handleJoinQueue}
                  disabled={isLoading || !selectedTimeControl}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Find Game
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground mb-2">
                    Searching for opponent...
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Time control: <span className="font-medium">{getTimeControlLabel(selectedTimeControl)}</span>
                  </p>
                  <div className="text-3xl font-mono text-primary font-bold">
                    {formatTime(waitTime)}
                  </div>
                </div>
                <Button
                  onClick={handleLeaveQueue}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Leaving...
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Cancel Search
                    </>
                  )}
                </Button>
              </div>
            )}
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Your Rating</span>
                <span className="font-semibold text-foreground">{user.rating}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
export default Matchmaking;
