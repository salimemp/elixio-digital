import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded border bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
