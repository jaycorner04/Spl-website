import AuthLeftPanel from "./AuthLeftPanel";

export default function AuthPageShell({ children }) {
  return (
    <div className="min-h-screen w-full overflow-hidden bg-slate-100">
      <div className="grid min-h-screen w-full lg:grid-cols-[0.95fr_1.05fr]">
        <AuthLeftPanel />

        <div className="flex min-h-screen items-center justify-center px-4 py-3 sm:px-6 lg:px-8">
          <div className="w-full max-w-2xl">{children}</div>
        </div>
      </div>
    </div>
  );
}