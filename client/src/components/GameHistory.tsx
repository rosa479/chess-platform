import React from "react";
import { Clock, Zap, Bot, Trophy } from "lucide-react";

import * as api from '@/lib/api';

type Mode = "bullet" | "blitz" | "rapid" | "bot";

const iconForMode = (timeControl: string) => {
  if (timeControl.includes("bullet")) return <Zap size={18} />;
  if (timeControl.includes("blitz")) return <Clock size={18} />;
  if (timeControl.includes("rapid")) return <Clock size={18} />;
  // Assuming "bot" might be part of the timeControl string or a specific timeControl value
  if (timeControl.includes("bot")) return <Bot size={18} />;
  return <Clock size={18} />; // Default icon
};

export const GameHistory: React.FC<{ games: api.GameHistoryEntry[] }> = ({ games }) => {
  return (
    <div className="relative rounded-2xl p-6 mb-6 overflow-hidden bg-gradient-to-br from-primary/6 via-primary/3 to-background border border-border shadow-xl">
      
      {/* subtle glow */}
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_60%)]"></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-semibold text-foreground">
            Game History <span className="text-muted-foreground text-sm">({games.length})</span>
          </h2>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Trophy size={18} />
            <span>Recent</span>
          </div>
        </div>

        <div className="divide-y divide-border rounded-lg overflow-hidden">
          {games.map((g, idx) => {
            const isWon = g.result === "won";
            const isLost = g.result === "lost";
            const isDraw = g.result === "draw";

            return (
              <div
                key={idx}
                className="grid grid-cols-4 items-center gap-4 p-4 bg-card hover:bg-secondary/50 transition-colors"
              >
                {/* Time Control */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center bg-secondary/50">
                    {iconForMode(g.timeControl)}
                  </span>
                  <span>{g.timeControl}</span>
                </div>

                {/* Players */}
                <div className="col-span-2">
                  <div className="flex flex-col">
                    
                    {/* Current User */}
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${isWon ? "bg-green-400" : isDraw ? "bg-yellow-400" : "bg-red-400"}`} />
                      <span className="font-medium text-foreground">You</span>
                      <span className="text-muted-foreground">({g.ratingBefore} &rarr; {g.ratingAfter})</span>
                    </div>

                    {/* Opponent */}
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`w-2 h-2 rounded-full ${isLost ? "bg-green-400" : isDraw ? "bg-yellow-400" : "bg-red-400"}`} />
                      <span className="font-medium text-foreground">{g.opponentUsername || "Unknown"}</span>
                      <span className="text-muted-foreground"></span>
                    </div>
                  </div>
                </div>

                {/* Result */}
                <div className="flex flex-col items-end">
                  <span
                    className={`text-sm font-semibold ${
                      isWon ? "text-green-400" : isDraw ? "text-yellow-400" : "text-red-400"
                    }`}
                  >
                    {g.result.charAt(0).toUpperCase() + g.result.slice(1)}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">{new Date(g.playedAt).toLocaleDateString()}</span>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GameHistory;
