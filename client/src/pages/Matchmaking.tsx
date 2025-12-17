import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import * as matchmakingApi from '@/lib/api-matchmaking-service';
import { Clock, Search, X, Loader2 } from 'lucide-react';

const Matchmaking = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [timeControls, setTimeControls] = useState<matchmakingApi.TimeControls>({});
  const [selectedTimeControl, setSelectedTimeControl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInQueue, setIsInQueue] = useState(false);
  const [waitTime, setWaitTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Fetch time controls on mount
  useEffect(() => {
    const fetchTimeControls = async () => {
      try {
        const controls = await matchmakingApi.getTimeControls();
        setTimeControls(controls);
        // Set default selection to first time control
        const firstKey = Object.keys(controls)[0];
        if (firstKey) {
          setSelectedTimeControl(firstKey);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load time controls');
      }
    };

    if (isAuthenticated) {
      fetchTimeControls();
      checkQueueStatus();
    }
  }, [isAuthenticated]);

  // Check queue status periodically
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const checkStatus = async () => {
      try {
        const status = await matchmakingApi.getMatchmakingStatus(user.userId);
        setIsInQueue(status.inQueue);
        if (status.waitTime) {
          setWaitTime(status.waitTime);
        }
      } catch (err) {
        // Ignore errors for status checks
      }
    };

    // Check immediately
    checkStatus();

    // Poll every 2 seconds if in queue
    const interval = setInterval(() => {
      if (isInQueue) {
        checkStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user, isInQueue]);

  // Update wait time display
  useEffect(() => {
    if (!isInQueue) {
      setWaitTime(0);
      return;
    }

    const interval = setInterval(() => {
      setWaitTime((prev) => prev + 1000);
    }, 1000);

    return () => clearInterval(interval);
  }, [isInQueue]);

  const checkQueueStatus = async () => {
    if (!user) return;
    try {
      const status = await matchmakingApi.getMatchmakingStatus(user.userId);
      setIsInQueue(status.inQueue);
      if (status.timeControl) {
        setSelectedTimeControl(status.timeControl);
      }
    } catch (err) {
      // Ignore errors
    }
  };

  const handleJoinQueue = async () => {
    if (!user || !selectedTimeControl) return;

    setIsLoading(true);
    setError(null);

    try {
      await matchmakingApi.joinMatchmaking(user.userId, selectedTimeControl, user.rating);
      setIsInQueue(true);
      setWaitTime(0);
    } catch (err: any) {
      setError(err.message || 'Failed to join queue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveQueue = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      await matchmakingApi.leaveMatchmaking(user.userId);
      setIsInQueue(false);
      setWaitTime(0);
    } catch (err: any) {
      setError(err.message || 'Failed to leave queue');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeControl = (key: string, control: matchmakingApi.TimeControl) => {
    const minutes = Math.floor(control.initialMs / 60000);
    const seconds = (control.initialMs % 60000) / 1000;
    const increment = control.incrementMs / 1000;
    
    if (increment > 0) {
      return `${minutes}${seconds > 0 ? `:${seconds.toString().padStart(2, '0')}` : ''}+${increment}`;
    }
    return `${minutes}${seconds > 0 ? `:${seconds.toString().padStart(2, '0')}` : ''}`;
  };

  const getTimeControlLabel = (key: string) => {
    const labels: { [key: string]: string } = {
      bullet: 'Bullet',
      blitz: 'Blitz',
      rapid: 'Rapid',
      classical: 'Classical',
      bullet_increment: 'Bullet',
      blitz_increment: 'Blitz',
      rapid_increment: 'Rapid',
    };
    return labels[key] || key;
  };

  if (!isAuthenticated || !user) {
    return null;
  }

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
                        onClick={() => setSelectedTimeControl(key)}
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
                              {formatTimeControl(key, control)}
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
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
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
                  <div className="text-lg font-mono text-foreground">
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
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Leaving...
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4" />
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

