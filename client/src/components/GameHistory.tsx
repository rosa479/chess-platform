import React from "react";
import { Clock, Zap, Bot, Trophy } from "lucide-react";

type Mode = "bullet" | "blitz" | "rapid" | "bot";

interface PlayerInfo {
  name: string;
  rating: number;
  won?: boolean;
}

interface GameEntry {
  timeControl: string;
  modeIcon: Mode;
  white: PlayerInfo;
  black: PlayerInfo;
  // now "Won" | "Lost"
  result: "Won" | "Lost";
  date: string;
}

const iconForMode = (m: Mode) =>
  m === "bullet" ? <Zap size={18} /> : m === "bot" ? <Bot size={18} /> : <Clock size={18} />;

export const GameHistory: React.FC<{ games: GameEntry[] }> = ({ games }) => {
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
            const whiteWon = g.white.won;
            const blackWon = g.black.won;

            return (
              <div
                key={idx}
                className="grid grid-cols-4 items-center gap-4 p-4 bg-card hover:bg-secondary/50 transition-colors"
              >
                {/* Time Control */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center bg-secondary/50">
                    {iconForMode(g.modeIcon)}
                  </span>
                  <span>{g.timeControl}</span>
                </div>

                {/* Players */}
                <div className="col-span-2">
                  <div className="flex flex-col">
                    
                    {/* White */}
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${whiteWon ? "bg-green-400" : "bg-red-400"}`} />
                      <span className="font-medium text-foreground">{g.white.name}</span>
                      <span className="text-muted-foreground">({g.white.rating})</span>
                    </div>

                    {/* Black */}
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`w-2 h-2 rounded-full ${blackWon ? "bg-green-400" : "bg-red-400"}`} />
                      <span className="font-medium text-foreground">{g.black.name}</span>
                      <span className="text-muted-foreground">({g.black.rating})</span>
                    </div>
                  </div>
                </div>

                {/* Result */}
                <div className="flex flex-col items-end">
                  <span
                    className={`text-sm font-semibold ${
                      g.result === "Won" ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {g.result}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">{g.date}</span>
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
