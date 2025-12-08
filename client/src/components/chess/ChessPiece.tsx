import React from "react";
import Piece from "react-chess-pieces";

export type PieceType =
  | "K"
  | "Q"
  | "R"
  | "B"
  | "N"
  | "P"
  | "k"
  | "q"
  | "r"
  | "b"
  | "n"
  | "p";

interface ChessPieceProps {
  piece: PieceType;
  // size in pixels
  size?: number;
}

export const ChessPiece: React.FC<ChessPieceProps> = ({ piece, size = 56 }) => {
  // react-chess-pieces uses "K,Q,R..." and "k,q,r..." exactly like you already do
  return (
    <span
      className="chess-piece inline-flex items-center justify-center"
      style={{
        width: "80%",
        height: "80%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Piece
        piece={piece}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          display: "block",
          pointerEvents: "none",
          userSelect: "none",
        }}
      />
    </span>
  );
};

export default ChessPiece;
