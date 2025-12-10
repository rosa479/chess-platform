import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { PlayerInfo } from "@/components/chess/PlayerInfo";
import { GamePanel } from "@/components/chess/GamePanel";

const Index = () => {
  const [theme, setTheme] = useState("cardinal");

  const boards = [
    "blue-marble.jpg",
    "blue.png",
    "blue2.jpg",
    "blue3.jpg",
    "brown.png",
    "canvas2.jpg",
    "green-plastic.png",
    "green.png",
    "grey.jpg",
    "horsey.jpg",
    "ic.png",
    "leather.jpg",
    "maple.jpg",
    "maple2.jpg",
    "marble.jpg",
    "metal.jpg",
    "ncf-board.png",
    "olive.jpg",
    "pink-pyramid.png",
    "purple-diag.png",
    "purple.png",
    "wood.jpg",
    "wood2.jpg",
    "wood3.jpg",
    "wood4.jpg",
  ];

  const [board, setBoard] = useState(boards[0]);

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
      <div className="flex flex-col md:flex-row min-h-screen">
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-auto">
          <div className="w-full max-w-[90vw] sm:max-w-[600px] flex flex-col gap-2">

            <div className="flex">
              {/* Theme Selector */}
              <div className="flex justify-center">
                <select
                  className="border p-2 rounded bg-background text-foreground w-full md:w-auto"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                >
                  {themes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Board Selector (dropdown) */}
              <div className="flex justify-center">
                <select
                  className="border p-2 rounded bg-background text-foreground mt-2 w-full md:w-auto"
                  value={board}
                  onChange={(e) => setBoard(e.target.value)}
                >
                  {boards.map((b) => (
                    <option key={b} value={b}>{b.replace(/\.(jpg|png|webp)$/i, "")}</option>
                  ))}
                </select>
              </div>
            </div>

            <PlayerInfo username="The duke" rating={420} isTop timeLeft="10:00" isActive={false} />

            <ChessBoard theme={theme} boardImage={board} />

            <PlayerInfo username="Noobmaster69" rating={679} isTop={false} timeLeft="10:00" isActive />
          </div>
        </div>

        <div className="w-full md:w-80 md:border-l border-t md:border-t-0 p-4">
          <GamePanel className="h-full" />
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
