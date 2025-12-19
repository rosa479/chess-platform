import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { GameHistory } from '@/components/GameHistory';
import { Trophy, Target, Gamepad2, Settings, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import * as ratingApi from '@/lib/api-rating-service';
import * as userApi from '@/lib/api-user-service';

const Profile = () => {
  const { user, isAuthenticated } = useAuth();
  const [rating, setRating] = useState<ratingApi.Rating | null>(null);
  const [profileData, setProfileData] = useState(user);
  const [editing, setEditing] = useState(false);
  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [loadingRating, setLoadingRating] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingRating(true);
        setRatingError(null);
        const data = await ratingApi.getUserRating(user.userId, 'overall');
        if (!cancelled) setRating(data);
      } catch (err: any) {
        if (!cancelled) setRatingError(err.message || 'Failed to load rating');
      } finally {
        if (!cancelled) setLoadingRating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    userApi.getUserById(user.userId).then(data => {
      setProfileData(data);
      setEmailInput(data.email);
    }).catch(() => {});
  }, [isAuthenticated, user]);

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
      const updated = await userApi.updateUser(user.userId, { email: emailInput }, token ?? '');
      setProfileData(updated);
      setEditing(false);
    } catch (error: any) {
      setUpdateError(error.message || 'Failed to update');
    }
  };

  const displayName = profileData?.username ?? 'Guest';
  const displayRating = rating?.rating ?? profileData?.rating ?? 1500;
  const gamesPlayed = rating?.gamesPlayed ?? profileData?.gamesPlayed ?? 0;
  const gamesWon = profileData?.gamesWon ?? 0;

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 md:p-8 max-w-full md:max-w-4xl lg:max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="relative rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-border shadow-xl">
          <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.25),transparent_70%)]"></div>
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-0">
            {/* Left Section */}
            <div className="flex items-center gap-4 sm:gap-6 w-full">
              {/* Avatar with glowing animated ring */}
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/60 to-accent/60 blur-md animate-pulse"></div>
                <div className="w-20 h-20 sm:w-24 sm:h-24 relative rounded-full bg-secondary flex items-center justify-center text-3xl sm:text-4xl border-2 border-primary/40 shadow-lg backdrop-blur-sm">
                  ♟️
                </div>
              </div>
              {/* User Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3 truncate">
                  {displayName}
                </h1>
                {/* Member since */}
                <p className="text-muted-foreground mt-1 text-sm sm:text-base truncate">Member since December 2024</p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-4">
                  {/* Rating bubble */}
                  <span className="px-2 sm:px-3 py-1 rounded-full bg-primary/20 text-primary text-xs sm:text-sm font-medium shadow-sm">
                    Rating: {loadingRating ? "…" : Math.round(displayRating)}
                  </span>
                  <span className="px-2 sm:px-3 py-1 rounded-full bg-primary/20 text-primary text-xs sm:text-sm font-medium shadow-sm">LBS Hall of Residence</span>
                  <span className="px-2 sm:px-3 py-1 rounded-full bg-primary/20 text-primary text-xs sm:text-sm font-medium shadow-sm">#69 in IIT KGP</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Rating Cards (You can expand to show real data for each control) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Bullet', rating: profileData?.bullet ?? 1200, icon: '⚡' },
                { label: 'Blitz', rating: profileData?.blitz ?? 1200, icon: '🔥' },
                { label: 'Rapid', rating: profileData?.rapid ?? 1200, icon: '⏱️' },
                { label: 'Puzzles', rating: profileData?.puzzles ?? 1200, icon: '🧩' },
              ].map((item) => (
                <div key={item.label} className="bg-card rounded-xl p-4 text-center hover-lift">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="text-2xl font-bold text-foreground">{item.rating}</div>
                  <div className="text-sm text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>
            {historyError ? (
  <div className="text-xs text-destructive bg-destructive/10 p-2 rounded mb-4">{historyError}</div>
) : null}
<GameHistory games={gameHistory} />
          </div>
          {/* Stats Sidebar */}
          <div className="space-y-6 mt-6 md:mt-0">
            <div className="bg-card rounded-xl p-4 sm:p-6">
              <h2 className="font-semibold mb-4">Statistics</h2>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><Gamepad2 size={18} className="text-muted-foreground" /><span className="text-muted-foreground">Games Played</span></div>
                  <span className="font-medium text-foreground">{gamesPlayed.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><Trophy size={18} className="text-muted-foreground" /><span className="text-muted-foreground">Wins</span></div>
                  <span className="font-medium text-foreground">{gamesWon.toLocaleString()}{gamesPlayed > 0 ? ` (${Math.round((gamesWon / gamesPlayed) * 100)}%)` : ""}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><Target size={18} className="text-muted-foreground" /><span className="text-muted-foreground">Puzzles Solved</span></div>
                  <span className="font-medium text-foreground">{profileData?.puzzlesSolved?.toLocaleString?.() ?? '2,341'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><Calendar size={18} className="text-muted-foreground" /><span className="text-muted-foreground">Current Streak</span></div>
                  <span className="font-medium text-foreground">{profileData?.currentStreak ?? 7} days <span role="img" aria-label="fire">🔥</span></span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><Settings size={18} className="text-muted-foreground" /><span className="text-muted-foreground">Campus Rank</span></div>
                  <span className="font-medium text-foreground">#{profileData?.campusRank ?? 69}</span>
                </div>
                {ratingError && (<div className="text-xs text-destructive bg-destructive/10 p-2 rounded">{ratingError}</div>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
