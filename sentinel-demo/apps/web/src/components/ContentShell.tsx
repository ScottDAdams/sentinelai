import type { ReactNode } from "react";

export default function ContentShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`max-w-5xl mx-auto px-8 ${className}`}>
      {children}
    </div>
  );
}
