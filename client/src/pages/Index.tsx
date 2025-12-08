import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { PlayerInfo } from '@/components/chess/PlayerInfo';
import { GamePanel } from '@/components/chess/GamePanel';

const Index = () => {
  return (
    <MainLayout>
      <div className="flex h-screen">
        {/* Game Area */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-[600px] flex flex-col gap-2">
            {/* Opponent Info */}
            <PlayerInfo
              username="The duke"
              rating={420}
              isTop={true}
              timeLeft="10:00"
              isActive={false}
            />

            {/* Chess Board */}
            <ChessBoard />

            {/* Player Info */}
            <PlayerInfo
              username="Noobmaster69"
              rating={679}
              isTop={false}
              timeLeft="10:00"
              isActive={true}
            />
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-80 border-l border-border p-4">
          <GamePanel className="h-full" />
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
