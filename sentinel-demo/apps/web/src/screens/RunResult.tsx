import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import type { GetRunResponse } from "@shared/types";
import RunHeader from "../components/RunHeader";
import OutputBlock from "../components/OutputBlock";
import VerdictPill from "../components/VerdictPill";
import WhyToggle from "../components/WhyToggle";
import Layout from "../components/Layout";
import ContentShell from "../components/ContentShell";
import Timeline from "../components/Timeline";
import ExportButtons from "../components/ExportButtons";

export default function RunResult() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<GetRunResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = searchParams.get("admin") === "1";

  useEffect(() => {
    if (!id) return;

    const fetchRun = async () => {
      try {
        const result = await api.getRun(id);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load run");
      } finally {
        setLoading(false);
      }
    };

    fetchRun();
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <ContentShell className="py-10">
          <div className="text-center text-gray-600">Loading...</div>
        </ContentShell>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <ContentShell className="py-10">
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error || "Run not found"}
          </div>
        </ContentShell>
      </Layout>
    );
  }

  const verdict = data.run.verdict;

  const verdictStyles =
    verdict === "BLOCKED"
      ? "bg-red-50 border-red-200"
      : verdict === "REDACTED"
      ? "bg-amber-50 border-amber-200"
      : "bg-emerald-50 border-emerald-200";

  const verdictTitle =
    verdict === "BLOCKED"
      ? "Blocked"
      : verdict === "REDACTED"
      ? "Released with redactions"
      : "Shippable";

  return (
    <Layout>
      <ContentShell className="py-10 space-y-8">
        <RunHeader run={data.run} />

        {isAdmin && (
          <div className="card card-pad border-blue-200 bg-blue-50">
            <Link
              to={`/admin/runs/${id}`}
              className="text-blue-800 hover:text-blue-900 font-medium"
            >
              → View full admin record
            </Link>
          </div>
        )}

        {/* Verdict banner */}
        <div className={`rounded-2xl border p-5 shadow-sm ${verdictStyles}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <VerdictPill verdict={verdict} />
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {verdictTitle}
                </div>
                <div className="text-sm text-gray-700">
                  {data.run.user_message || "Decision recorded."}
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-600">
              Run ID{" "}
              <span className="font-mono">{data.run.id.slice(0, 8)}…</span>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: outputs */}
          <div className="lg:col-span-2 space-y-8">
            <OutputBlock
              title="Governed Output"
              content={data.run.governed_output}
              annotations={data.annotations}
            />

            {/* Baseline only when it matters */}
            {data.run.verdict !== "SHIPPABLE" && (
              <OutputBlock
                title="Baseline Output"
                content={data.run.baseline_output}
                annotations={[]}
              />
            )}

            <WhyToggle annotations={data.annotations} />
          </div>

          {/* Right: evidence / exports */}
          <div className="space-y-6">
            <div className="card card-pad">
              <div className="text-sm font-semibold text-gray-900 mb-2">
                Evidence
              </div>
              <div className="text-sm text-gray-700 space-y-2">
                <div>
                  <span className="text-gray-500">Findings:</span>{" "}
                  <span className="font-medium">{data.annotations.length}</span>
                </div>
                <div>
                  <span className="text-gray-500">Event log:</span>{" "}
                  <span className="font-medium">{data.events.length}</span>
                </div>
                <div>
                  <span className="text-gray-500">Policy pack:</span>{" "}
                  <span className="font-medium">
                    {data.run.policy_pack_version}
                  </span>
                </div>
              </div>
            </div>

            <Timeline events={data.events} />

            {/* Export is extra valuable for the IT/security story */}
            <ExportButtons runId={data.run.id} />
          </div>
        </div>
      </ContentShell>
    </Layout>
  );
}
