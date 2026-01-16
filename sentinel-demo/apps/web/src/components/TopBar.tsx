import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ContentShell from "./ContentShell";
import { api } from "../lib/api";

export default function TopBar() {
  const [exceptionsCount, setExceptionsCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const result = await api.getExceptionsCount();
        setExceptionsCount(result.count);
      } catch (err) {
        // Silently fail - exceptions count is optional
        console.warn("Failed to fetch exceptions count:", err);
      }
    };
    fetchCount();
  }, []);

  return (
    <div className="bg-white border-b border-gray-200">
      <ContentShell className="py-0">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Sentinel Logo" width={20} height={20} />
              <span className="text-lg font-semibold tracking-tight text-gray-900">
                Sentinel
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-4">
              <Link
                to="/"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Run
              </Link>
              <Link
                to="/policies"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Policies
              </Link>
              <Link
                to="/insights"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Insights
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-6 w-px bg-gray-300" />
            <Link
              to="/investigate"
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <span>Exceptions</span>
              {exceptionsCount !== null && exceptionsCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                  {exceptionsCount}
                </span>
              )}
            </Link>
            <span className="badge badge-muted">Demo</span>
          </div>
        </div>
      </ContentShell>
    </div>
  );
}
