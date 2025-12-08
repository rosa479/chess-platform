import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { PlayerInfo } from "@/components/chess/PlayerInfo";
import { GamePanel } from "@/components/chess/GamePanel";

const Index = () => {
  const [theme, setTheme] = useState("cardinal");

  const themes = [
    "alpha",
    "anarcandy",
    "caliente",
    "california",
    "cardinal",
    "cburnett",
    "celtic",
    "chess7",
    "chessnut",
    "companion",
    "cooke",
    "disguised",
    "dubrovny",
    "fantasy",
    "firi",
    "fresca",
    "gioco",
    "governor",
    "horsey",
    "icpieces",
    "kiwen-suwi",
    "kosal",
    "leipzig",
    "letter",
    "maestro",
    "merida",
    "monarchy",
    "mono",
    "mpchess",
    "pirouetti",
    "pixel",
    "reillycraig",
    "rhosgfx",
    "riohacha",
    "shapes",
    "spatial",
    "staunty",
    "tatiana",
    "xkcd",
  ];

  return (
    <MainLayout>
      <div className="flex h-screen">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-[600px] flex flex-col gap-2">

            {/* Theme Selector */}
            <div className="flex justify-center">
              <select
                className="border p-2 rounded bg-background text-foreground"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                {themes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <PlayerInfo username="The duke" rating={420} isTop timeLeft="10:00" isActive={false} />

            <ChessBoard theme={theme} />

            <PlayerInfo username="Noobmaster69" rating={679} isTop={false} timeLeft="10:00" isActive />
          </div>
        </div>

        <div className="w-80 border-l p-4">
          <GamePanel className="h-full" />
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
