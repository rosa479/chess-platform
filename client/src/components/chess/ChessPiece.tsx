import React from "react";
import { cn } from "@/lib/utils";

export type PieceType =
  | "K" | "Q" | "R" | "B" | "N" | "P"
  | "k" | "q" | "r" | "b" | "n" | "p";

interface ChessPieceProps {
  piece: PieceType;
  size?: number;
  className?: string;
  theme: string; // NEW
}

export const ChessPiece: React.FC<ChessPieceProps> = ({
  piece,
  size = 56,
  className,
  theme,
}) => {
  // Build file path dynamically
  const colorPrefix = piece === piece.toUpperCase() ? "w" : "b";
  const src = `/piece/${theme}/${colorPrefix}${piece.toUpperCase()}.svg`;

  return (
    <span
      className={cn("inline-flex items-center justify-center", className)}
      style={{
        width: "80%",
        height: "80%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src={src}
        alt={piece}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          objectFit: "contain",
          pointerEvents: "none",
          userSelect: "none",
        }}
      />
    </span>
  );
};

export default ChessPiece;
