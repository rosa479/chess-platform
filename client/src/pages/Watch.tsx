import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { Eye, Users, Trophy, Clock } from 'lucide-react';

const liveGames = [
  { white: 'Magnus', black: 'Hikaru', viewers: 1234, rating: 2850 },
  { white: 'Firouzja', black: 'Gukesh', viewers: 856, rating: 2780 },
  { white: 'Caruana', black: 'Ding', viewers: 654, rating: 2790 },
  { white: 'Nepo', black: 'Aronian', viewers: 432, rating: 2760 },
];

const Watch = () => {
  return (
    <MainLayout>
      <div className="flex h-screen">
        {/* Main Board */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-[500px]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-foreground">Featured Game</h1>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Eye size={14} /> 1,234 watching
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock size={14} />
                <span>5+0 Blitz</span>
              </div>
            </div>
            <ChessBoard />
          </div>
        </div>

        {/* Live Games List */}
        <div className="w-80 border-l border-border p-4 overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <h2 className="font-semibold">Live Games</h2>
          </div>

          <div className="space-y-3">
            {liveGames.map((game, index) => (
              <div
                key={index}
                className="bg-card rounded-lg p-4 cursor-pointer hover:bg-secondary transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Trophy size={14} className="text-primary" />
                    <span className="text-sm text-muted-foreground">{game.rating}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye size={12} />
                    {game.viewers}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-foreground" />
                    <span className="text-sm font-medium">{game.white}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-muted border border-muted-foreground" />
                    <span className="text-sm font-medium">{game.black}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Users size={16} />
              Top Players Online
            </h3>
            <div className="space-y-2">
              {['Magnus Carlsen', 'Hikaru Nakamura', 'Fabiano Caruana'].map((player) => (
                <div key={player} className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    👤
                  </div>
                  <span className="text-sm">{player}</span>
                  <div className="ml-auto w-2 h-2 rounded-full bg-accent" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Watch;
