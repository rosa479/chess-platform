import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { GameHistory } from '@/components/GameHistory';
import { Trophy, Target, Gamepad2, School, Calendar, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import * as ratingApi from '@/lib/api-rating-service';

const Profile = () => {
  const { user, isAuthenticated } = useAuth();
  const [rating, setRating] = useState<ratingApi.Rating | null>(null);
  const [loadingRating, setLoadingRating] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    let cancelled = false;
    (async () => {
      try {
        setLoadingRating(true);
        setRatingError(null);
        const data = await ratingApi.getUserRating(user.userId, "overall");
        if (!cancelled) {
          setRating(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setRatingError(err.message || "Failed to load rating");
        }
      } finally {
        if (!cancelled) {
          setLoadingRating(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user]);

  const displayName = user?.username ?? "Guest";
  const displayRating =
    rating?.rating ?? user?.rating ?? 1500;

  const gamesPlayed = rating?.gamesPlayed ?? user?.gamesPlayed ?? 0;
  const gamesWon = user?.gamesWon ?? 0;

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 md:p-8 max-w-full md:max-w-4xl lg:max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="relative rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-border shadow-xl">
          
          {/* subtle glow background */}
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

                <p className="text-muted-foreground mt-1 text-sm sm:text-base truncate">Member since December 2024</p>

                {/* small stats row */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-4">

                  {/* Rating bubble */}
                  <span className="px-2 sm:px-3 py-1 rounded-full bg-primary/20 text-primary text-xs sm:text-sm font-medium shadow-sm">
                    Rating:{" "}
                    {loadingRating ? "…" : Math.round(displayRating)}
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

            {/* Settings Button - move below info in mobile */}
            <button className="mt-4 sm:mt-0 px-3 py-2 sm:px-4 sm:py-2 rounded-lg bg-secondary hover:bg-muted transition-colors flex items-center gap-2 shadow-sm w-full sm:w-auto justify-center">
              <Settings size={18} />
              <span className="text-sm">Settings</span>
            </button>

          </div>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Rating Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Bullet', rating: 1423, icon: '⚡' },
                { label: 'Blitz', rating: 1523, icon: '🔥' },
                { label: 'Rapid', rating: 1612, icon: '⏱️' },
                { label: 'Puzzles', rating: 1856, icon: '🧩' },
              ].map((item) => (
                <div key={item.label} className="bg-card rounded-xl p-4 text-center hover-lift">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="text-2xl font-bold text-foreground">{item.rating}</div>
                  <div className="text-sm text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>

            <GameHistory
              games={[
                {
                  timeControl: "10 min",
                  modeIcon: "blitz",
                  result: "Won",
                  date: "Dec 9, 2025",
                  white: { name: "mr_rohit03", rating: 939, won: true },
                  black: { name: "mohitgamer8", rating: 794, won: false },
                },
                {
                  timeControl: "10 min",
                  modeIcon: "blitz",
                  result: "Lost",
                  date: "Dec 9, 2025",
                  white: { name: "mohitgamer8", rating: 794, won: true },
                  black: { name: "mr_rohit03", rating: 939, won: false },
                },
                {
                  timeControl: "1 min",
                  modeIcon: "bullet",
                  result: "Won",
                  date: "Dec 6, 2025",
                  white: { name: "mr_rohit03", rating: 545, won: true },
                  black: { name: "jerin22", rating: 499, won: false },
                },
                {
                  timeControl: "bot",
                  modeIcon: "bot",
                  result: "Won",
                  date: "Dec 6, 2025",
                  white: { name: "mr_rohit03", rating: 400, won: true },
                  black: { name: "Frosty-BOT", rating: 1350, won: false },
                },
              ]}
            />

          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6 mt-6 md:mt-0">
            <div className="bg-card rounded-xl p-4 sm:p-6">
              <h2 className="font-semibold mb-4">Statistics</h2>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Gamepad2 size={18} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Games Played</span>
                  </div>
                  <span className="font-medium text-foreground">
                    {gamesPlayed}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy size={18} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Wins</span>
                  </div>
                  <span className="font-medium text-foreground">
                    {gamesWon}
                    {gamesPlayed > 0
                      ? ` (${Math.round((gamesWon / gamesPlayed) * 100)}%)`
                      : ""}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Target size={18} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Rating Deviation</span>
                  </div>
                  <span className="font-medium text-foreground">
                    {rating ? Math.round(rating.ratingDeviation) : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Last Updated</span>
                  </div>
                  <span className="font-medium text-foreground text-xs sm:text-sm">
                    {rating
                      ? new Date(rating.lastUpdated).toLocaleDateString()
                      : "—"}
                  </span>
                </div>

                {ratingError && (
                  <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                    {ratingError}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
