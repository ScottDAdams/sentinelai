import type { ReactNode } from "react";
import TopBar_toggle from "./TopBar";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <TopBar_toggle />
      {children}
    </div>
  );
}
