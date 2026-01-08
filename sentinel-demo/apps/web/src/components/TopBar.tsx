import { Link } from "react-router-dom";
import ContentShell from "./ContentShell";

export default function TopBar() {
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
                to="/admin/policies"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Policies
              </Link>
            </nav>
          </div>

          <span className="badge badge-muted">Demo</span>
        </div>
      </ContentShell>
    </div>
  );
}
