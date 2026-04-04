export default function ManagementModal({
  title,
  children,
  onClose,
  maxWidthClass = "max-w-3xl",
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-6">
      <div
        className={`w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl`}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="font-heading text-2xl tracking-[0.08em] text-slate-900">
            {title}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
