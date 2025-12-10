import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { GameHistory } from '@/components/GameHistory';
import { Trophy, Target, Gamepad2, School, Calendar, Settings } from 'lucide-react';

const Profile = () => {
  return (
    <MainLayout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="relative rounded-2xl p-6 mb-8 overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-border shadow-xl">
          
          {/* subtle glow background */}
          <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.25),transparent_70%)]"></div>

          <div className="relative flex items-start justify-between">
            
            {/* Left Section */}
            <div className="flex items-center gap-6">

              {/* Avatar with glowing animated ring */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/60 to-accent/60 blur-md animate-pulse"></div>
                <div className="w-24 h-24 relative rounded-full bg-secondary flex items-center justify-center text-4xl border-2 border-primary/40 shadow-lg backdrop-blur-sm">
                  ♟️
                </div>
              </div>

              {/* User Info */}
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                  Noobmaster69
                </h1>

                <p className="text-muted-foreground mt-1">Member since December 2024</p>

                {/* small stats row */}
                <div className="flex items-center gap-4 mt-4">

                  {/* Rating bubble */}
                  <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium shadow-sm">
                    Rating: 1523
                  </span>
                  <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium shadow-sm">
                    LBS Hall of Residence
                  </span>
                  <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium shadow-sm">
                    #69 in IIT KGP
                  </span>
                </div>
              </div>
            </div>

            {/* Settings Button */}
            <button className="px-4 py-2 rounded-lg bg-secondary hover:bg-muted transition-colors flex items-center gap-2 shadow-sm">
              <Settings size={18} />
              <span className="text-sm">Settings</span>
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
          <div className="space-y-6">
            <div className="bg-card rounded-xl p-6">
              <h2 className="font-semibold mb-4">Statistics</h2>
              <div className="space-y-4">
                {[
                  { icon: Gamepad2, label: 'Games Played', value: '1,247' },
                  { icon: Trophy, label: 'Wins', value: '687 (55%)' },
                  { icon: Target, label: 'Puzzles Solved', value: '2,341' },
                  { icon: Calendar, label: 'Current Streak', value: '7 days 🔥' },
                  { icon: School, label: 'Campus Rank', value: '#69' },
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
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
