import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Trophy, Target, Gamepad2, Clock, TrendingUp, Calendar, Settings } from 'lucide-react';

const ratingHistory = [1200, 1250, 1230, 1280, 1320, 1350, 1340, 1380, 1420, 1450, 1480, 1523];

const recentGames = [
  { opponent: 'ChessKing99', result: 'win', rating: '+8', opening: "Queen's Gambit", time: '5 min ago' },
  { opponent: 'Pawn_Master', result: 'loss', rating: '-7', opening: 'Sicilian Defense', time: '1 hour ago' },
  { opponent: 'RookieMoves', result: 'win', rating: '+12', opening: 'Italian Game', time: '2 hours ago' },
  { opponent: 'BishopPair', result: 'draw', rating: '+1', opening: 'Ruy Lopez', time: '5 hours ago' },
];

const Profile = () => {
  return (
    <MainLayout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="bg-card rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center text-4xl">
                👤
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Noobmaster69</h1>
                <p className="text-muted-foreground">Member since December 2024</p>
                <div className="flex items-center gap-4 mt-3">
                  <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">
                    Premium
                  </span>
                  <span className="text-sm text-muted-foreground">🇺🇸 United States</span>
                </div>
              </div>
            </div>
            <button className="p-2 rounded-lg bg-secondary hover:bg-muted transition-colors">
              <Settings size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            {/* Rating Cards */}
            <div className="grid grid-cols-4 gap-4">
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

            {/* Rating Chart */}
            <div className="bg-card rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp size={20} className="text-accent" />
                  Rating History
                </h2>
                <select className="bg-secondary text-sm px-3 py-1.5 rounded-lg border-none">
                  <option>Last 30 days</option>
                  <option>Last 90 days</option>
                  <option>All time</option>
                </select>
              </div>
              <div className="h-40 flex items-end gap-2">
                {ratingHistory.map((rating, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-primary/30 hover:bg-primary/50 rounded-t transition-colors cursor-pointer"
                    style={{ height: `${((rating - 1150) / 400) * 100}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>Nov 7</span>
                <span>Dec 7</span>
              </div>
            </div>

            {/* Recent Games */}
            <div className="bg-card rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Gamepad2 size={20} className="text-primary" />
                Recent Games
              </h2>
              <div className="space-y-3">
                {recentGames.map((game, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between py-3 border-b border-border last:border-0 cursor-pointer hover:bg-secondary/50 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                        game.result === 'win' ? 'bg-accent/20 text-accent' :
                        game.result === 'loss' ? 'bg-destructive/20 text-destructive' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {game.result === 'win' ? 'W' : game.result === 'loss' ? 'L' : 'D'}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">vs {game.opponent}</div>
                        <div className="text-sm text-muted-foreground">{game.opening}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${
                        game.rating.startsWith('+') ? 'text-accent' : 
                        game.rating.startsWith('-') ? 'text-destructive' : 'text-muted-foreground'
                      }`}>
                        {game.rating}
                      </div>
                      <div className="text-xs text-muted-foreground">{game.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            <div className="bg-card rounded-xl p-6">
              <h2 className="font-semibold mb-4">Statistics</h2>
              <div className="space-y-4">
                {[
                  { icon: Gamepad2, label: 'Games Played', value: '1,247' },
                  { icon: Trophy, label: 'Wins', value: '687 (55%)' },
                  { icon: Target, label: 'Puzzles Solved', value: '2,341' },
                  { icon: Clock, label: 'Time Played', value: '124h' },
                  { icon: Calendar, label: 'Current Streak', value: '7 days 🔥' },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <stat.icon size={18} className="text-muted-foreground" />
                      <span className="text-muted-foreground">{stat.label}</span>
                    </div>
                    <span className="font-medium text-foreground">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-xl p-6">
              <h2 className="font-semibold mb-4">Achievements</h2>
              <div className="grid grid-cols-3 gap-3">
                {['🏆', '⭐', '🎯', '💎', '🔥', '👑'].map((emoji, i) => (
                  <div 
                    key={i}
                    className="aspect-square rounded-lg bg-secondary flex items-center justify-center text-2xl hover:scale-105 transition-transform cursor-pointer"
                  >
                    {emoji}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
