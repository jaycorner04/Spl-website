import useBackendStatus from "../../hooks/useBackendStatus";

export default function BackendReconnectBanner() {
  const { isBackendReachable, isChecking, retry } = useBackendStatus();

  if (isBackendReachable) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[120] sm:left-auto sm:max-w-md">
      <div className="rounded-2xl border border-red-200 bg-white/95 p-4 shadow-[0_18px_46px_rgba(15,23,42,0.18)] backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-600">
            API
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">
              Backend connection lost
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Start the app with <span className="font-mono text-[13px]">npm run dev</span> from the
              project root, or run the same command inside the
              <span className="font-mono text-[13px]"> spl-frontend</span> folder.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              The app will keep retrying automatically every 15 seconds.
            </p>

            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={retry}
                disabled={isChecking}
                className="rounded-xl bg-[#853953] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6f2d45] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isChecking ? "Checking..." : "Retry Connection"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
