import React, { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { ChessPiece, PieceType as PieceSymbolType } from "./ChessPiece";
import { cn } from "@/lib/utils";

type PieceType = PieceSymbolType | null;

interface ChessBoardProps {
  flipped?: boolean;
  theme: string;  // ← NEW
}

const initialPosition: PieceType[][] = [
  ["r", "n", "b", "q", "k", "b", "n", "r"],
  ["p", "p", "p", "p", "p", "p", "p", "p"],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ["P", "P", "P", "P", "P", "P", "P", "P"],
  ["R", "N", "B", "Q", "K", "B", "N", "R"],
];

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

export const ChessBoard: React.FC<ChessBoardProps> = ({ flipped = false, theme }) => {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [fen, setFen] = useState<string>("");

  const chessRef = useRef<Chess | null>(null);

  useEffect(() => {
    chessRef.current = new Chess();
    setFen(chessRef.current.fen());
  }, []);

  const getBoardFromChess = (): PieceType[][] => {
    const ch = chessRef.current;
    if (!ch) return initialPosition;

    const raw = ch.board();
    return raw.map((row: any[]) =>
      row.map((cell) => {
        if (!cell) return null;
        const letter = cell.type;
        return cell.color === "w"
          ? (letter.toUpperCase() as PieceSymbolType)
          : (letter.toLowerCase() as PieceSymbolType);
      })
    );
  };

  const board = getBoardFromChess();

  const displayBoard = flipped
    ? [...board].reverse().map((row) => [...row].reverse())
    : board;

  const displayFiles = flipped ? [...files].reverse() : files;
  const displayRanks = flipped ? [...ranks].reverse() : ranks;

  const handleSquareClick = (row: number, col: number) => {
    const squareId = `${displayFiles[col]}${displayRanks[row]}`;

    if (!chessRef.current) return;

    if (selectedSquare && legalMoves.includes(squareId)) {
      const move = { from: selectedSquare, to: squareId } as any;
      const result = chessRef.current.move(move);
      if (result) {
        setFen(chessRef.current.fen());
      }
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    if (selectedSquare === squareId) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    const moves = chessRef.current.moves({ square: squareId as any, verbose: true });
    if (moves.length > 0) {
      setSelectedSquare(squareId);
      setLegalMoves(moves.map((m: any) => m.to));
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  const isLightSquare = (row: number, col: number) => (row + col) % 2 === 0;

  return (
    <div className="relative animate-fade-in">
      <div className="rounded-lg overflow-hidden shadow-lg" style={{ boxShadow: "var(--shadow-lg)" }}>
        <div
          className="grid grid-cols-8 aspect-square"
          style={{ gridTemplateRows: "repeat(8, 1fr)" }}
        >
          {displayBoard.map((row, rowIndex) =>
            row.map((piece, colIndex) => {
              const squareId = `${displayFiles[colIndex]}${displayRanks[rowIndex]}`;
              const isSelected = selectedSquare === squareId;
              const isLight = isLightSquare(rowIndex, colIndex);
              const isLegal = legalMoves.includes(squareId);

              return (
                <div
                  key={squareId}
                  className={cn(
                    "relative flex items-center justify-center cursor-pointer transition-all duration-150 bg-cover bg-center",
                    isLight
                      ? "bg-[url('/texture/light.webp')]"
                      : "bg-[url('/texture/dark.webp')]",
                    isSelected && "ring-2 ring-inset ring-chess-highlight"
                  )}
                  onClick={() => handleSquareClick(rowIndex, colIndex)}
                >
                  {piece && <ChessPiece piece={piece} size={56} theme={theme} />}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ChessBoard;
