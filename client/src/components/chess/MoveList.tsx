import React from 'react';
import { cn } from '@/lib/utils';

interface Move {
  number: number;
  white: string;
  black?: string;
}

interface MoveListProps {
  moves: Move[];
}

const sampleMoves: Move[] = [
  { number: 1, white: 'e4', black: 'e5' },
  { number: 2, white: 'Nf3', black: 'Nc6' },
  { number: 3, white: 'Bb5', black: 'a6' },
  { number: 4, white: 'Ba4', black: 'Nf6' },
  { number: 5, white: 'O-O', black: 'Be7' },
  { number: 6, white: 'Re1', black: 'b5' },
];

export const MoveList: React.FC<MoveListProps> = ({ moves = sampleMoves }) => {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-[auto_1fr_1fr] gap-x-2 text-sm">
        {moves.map((move, index) => (
          <React.Fragment key={move.number}>
            <span className="text-muted-foreground pr-2">{move.number}.</span>
            <span className={cn(
              "px-2 py-1 rounded cursor-pointer transition-colors hover:bg-secondary",
              index === moves.length - 1 && !move.black && "bg-primary/20"
            )}>
              {move.white}
            </span>
            <span className={cn(
              "px-2 py-1 rounded cursor-pointer transition-colors hover:bg-secondary",
              index === moves.length - 1 && move.black && "bg-primary/20"
            )}>
              {move.black || ''}
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default MoveList;
