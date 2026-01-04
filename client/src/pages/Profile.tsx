import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { GameHistory } from '@/components/GameHistory';
import { Trophy, Target, Gamepad2, Settings, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import * as ratingApi from '@/lib/api-rating-service';
import * as userApi from '@/lib/api-user-service';

type RatingsByTC = {
  bullet?: ratingApi.Rating;
  blitz?: ratingApi.Rating;
  rapid?: ratingApi.Rating;
  overall?: ratingApi.Rating;
};

const Profile = () => {
  const { user, isAuthenticated } = useAuth();

  const [ratings, setRatings] = useState<RatingsByTC>({});
  const [profileData, setProfileData] = useState<any>(user);
  const [editing, setEditing] = useState(false);
  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [loadingRating, setLoadingRating] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);

  /* =========================
     FETCH RATINGS (FIX)
     ========================= */
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    let cancelled = false;

    (async () => {
      try {
        setLoadingRating(true);
        setRatingError(null);

        const [bullet, blitz, rapid, overall] = await Promise.all([
          ratingApi.getUserRating(user.userId, 'bullet'),
          ratingApi.getUserRating(user.userId, 'blitz'),
          ratingApi.getUserRating(user.userId, 'rapid'),
          ratingApi.getUserRating(user.userId, 'overall'),
        ]);

        if (!cancelled) {
          setRatings({ bullet, blitz, rapid, overall });
        }
      } catch (err: any) {
        if (!cancelled) setRatingError(err.message || 'Failed to load rating');
      } finally {
        if (!cancelled) setLoadingRating(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isAuthenticated, user]);

  /* =========================
     FETCH USER PROFILE
     ========================= */
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    userApi.getUserById(user.userId)
      .then(data => {
        setProfileData(data);
        setEmailInput(data.email);
      })
      .catch(() => {});
  }, [isAuthenticated, user]);

  /* =========================
     FETCH GAME HISTORY
     ========================= */
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    userApi.getUserGames(user.userId, 10)
      .then(setGameHistory)
      .catch(err => setHistoryError(err.message));
  }, [isAuthenticated, user]);

  const handleSave = async () => {
    try {
      setUpdateError(null);
      const token = localStorage.getItem('auth_token');
      const updated = await userApi.updateUser(
        user.userId,
        { email: emailInput },
        token ?? ''
      );
      setProfileData(updated);
      setEditing(false);
    } catch (error: any) {
      setUpdateError(error.message || 'Failed to update');
    }
  };

  const displayName = profileData?.username ?? 'Guest';
  const displayRating = ratings.overall?.rating ?? 1500;
  const gamesPlayed = ratings.overall?.gamesPlayed ?? 0;
  const gamesWon = profileData?.gamesWon ?? 0;

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 md:p-8 max-w-full md:max-w-4xl lg:max-w-6xl mx-auto">

        {/* Profile Header */}
        <div className="relative rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-border shadow-xl">
          <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.25),transparent_70%)]"></div>

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-0">
            <div className="flex items-center gap-4 sm:gap-6 w-full">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/60 to-accent/60 blur-md animate-pulse"></div>
                <div className="w-20 h-20 sm:w-24 sm:h-24 relative rounded-full bg-secondary flex items-center justify-center text-3xl sm:text-4xl border-2 border-primary/40 shadow-lg backdrop-blur-sm">
                  ♟️
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
                  {displayName}
                </h1>
                <p className="text-muted-foreground mt-1 text-sm sm:text-base truncate">
                  Member since December 2024
                </p>

                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-4">
                  <span className="px-2 sm:px-3 py-1 rounded-full bg-primary/20 text-primary text-xs sm:text-sm font-medium shadow-sm">
                    Rating: {loadingRating ? '…' : Math.round(displayRating)}
                  </span>
                  <span className="px-2 sm:px-3 py-1 rounded-full bg-primary/20 text-primary text-xs sm:text-sm font-medium shadow-sm">
                    LBS Hall of Residence
                  </span>
                  <span className="px-2 sm:px-3 py-1 rounded-full bg-primary/20 text-primary text-xs sm:text-sm font-medium shadow-sm">
                    #69 in IIT KGP
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">

            {/* Rating Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Bullet', rating: ratings.bullet?.rating ?? 1500, icon: '⚡' },
                { label: 'Blitz', rating: ratings.blitz?.rating ?? 1500, icon: '🔥' },
                { label: 'Rapid', rating: ratings.rapid?.rating ?? 1500, icon: '⏱️' },
                { label: 'Puzzles', rating: profileData?.puzzlesRating ?? 1200, icon: '🧩' },
              ].map(item => (
                <div key={item.label} className="bg-card rounded-xl p-4 text-center hover-lift">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="text-2xl font-bold text-foreground">
                    {loadingRating ? '…' : item.rating}
                  </div>
                  <div className="text-sm text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>

            {historyError && (
              <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                {historyError}
              </div>
            )}

            <GameHistory games={gameHistory} />
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6 mt-6 md:mt-0">
            <div className="bg-card rounded-xl p-4 sm:p-6">
              <h2 className="font-semibold mb-4">Statistics</h2>

              <div className="space-y-4">
                <Stat icon={<Gamepad2 size={18} />} label="Games Played" value={gamesPlayed.toLocaleString()} />
                <Stat
                  icon={<Trophy size={18} />}
                  label="Wins"
                  value={`${gamesWon.toLocaleString()}${gamesPlayed > 0 ? ` (${Math.round((gamesWon / gamesPlayed) * 100)}%)` : ''}`}
                />
                <Stat icon={<Target size={18} />} label="Puzzles Solved" value={profileData?.puzzlesSolved ?? 0} />
                <Stat icon={<Calendar size={18} />} label="Current Streak" value={`${profileData?.currentStreak ?? 0} days 🔥`} />
                <Stat icon={<Settings size={18} />} label="Campus Rank" value={`#${profileData?.campusRank ?? '-'}`} />
              </div>

              {ratingError && (
                <div className="text-xs text-destructive bg-destructive/10 p-2 rounded mt-3">
                  {ratingError}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
};

const Stat = ({ icon, label, value }: any) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3 text-muted-foreground">
      {icon}
      <span>{label}</span>
    </div>
    <span className="font-medium text-foreground">{value}</span>
  </div>
);

export default Profile;
