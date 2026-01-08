import { useState } from "react";
import { api } from "../lib/api";
import type { ExportResponse } from "@shared/types";

type Props = { runId: string };

export default function ExportButtons({ runId }: Props) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<"copy" | "download" | null>(null);
  const [cache, setCache] = useState<ExportResponse | null>(null);

  const getExport = async () => {
    if (cache) return cache;
    const data = await api.exportRun(runId);
    setCache(data);
    return data;
  };

  const copyJson = async () => {
    try {
      setBusy("copy");
      const exportData = await getExport();
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } finally {
      setBusy(null);
    }
  };

  const downloadJson = async () => {
    try {
      setBusy("download");
      const exportData = await getExport();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sentinel-run-${exportData.run.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(null);
    }
  };

  const downloadDisabled = busy === "download";
  const copyDisabled = busy === "copy";

  return (
    <div className="flex items-center justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={downloadJson}
        disabled={downloadDisabled}
        className="
inline-flex items-center justify-center
rounded-lg
border border-gray-700
bg-black
px-4 py-2
text-sm font-medium text-white
shadow-sm
transition-all duration-150
hover:-translate-y-[1px]
hover:shadow-md
hover:border-gray-500
active:translate-y-0
active:shadow-sm
focus:outline-none
focus:ring-2 focus:ring-accent/30
disabled:opacity-50 disabled:cursor-not-allowed
"

      >
        {downloadDisabled ? "Downloading…" : "Download JSON"}
      </button>

      <button
        type="button"
        onClick={copyJson}
        disabled={copyDisabled}
        className="
inline-flex items-center justify-center
rounded-lg
border border-gray-700
bg-black
px-4 py-2
text-sm font-medium text-white
shadow-sm
transition-all duration-150
hover:-translate-y-[1px]
hover:shadow-md
hover:border-gray-500
active:translate-y-0
active:shadow-sm
focus:outline-none
focus:ring-2 focus:ring-accent/30
disabled:opacity-50 disabled:cursor-not-allowed
"


      >
        {copyDisabled ? "Copying…" : copied ? "Copied" : "Copy JSON"}
      </button>
    </div>
  );
}
