export default function VenueCard({
  groundName,
  location,
  city,
  capacity,
  contactPerson,
  contactPhone,
}) {
  return (
    <div className="flex h-full flex-col rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-yellow-300/60 hover:shadow-[0_14px_36px_rgba(15,23,42,0.10)] sm:p-6">
      <div className="flex min-h-[96px] items-start justify-between gap-4">
        <div className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-center text-sm font-bold uppercase tracking-[0.12em] text-blue-600">
          VEN
        </div>

        <div className="shrink-0 rounded-full border border-yellow-300/40 bg-yellow-50 px-3 py-2 text-center sm:px-4">
          <div className="font-heading text-xl leading-none text-yellow-500 sm:text-2xl">
            {capacity}
          </div>
          <div className="mt-1 font-condensed text-[10px] uppercase tracking-[0.18em] text-yellow-700">
            Capacity
          </div>
        </div>
      </div>

      <div className="mt-5 min-h-[96px]">
        <h3 className="line-clamp-2 font-condensed text-[1.7rem] uppercase leading-tight tracking-[0.1em] text-slate-900">
          {groundName}
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          {location}, {city}
        </p>
      </div>

      <div className="mt-5 flex flex-1 flex-col space-y-3">
        <div className="flex min-h-[56px] items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
          <span className="text-sm text-slate-600">Contact Person</span>
          <span className="max-w-[58%] truncate text-right font-medium text-slate-900">
            {contactPerson}
          </span>
        </div>

        <div className="flex min-h-[56px] items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
          <span className="text-sm text-slate-600">Phone</span>
          <span className="max-w-[58%] truncate text-right font-medium text-slate-900">
            {contactPhone}
          </span>
        </div>
      </div>
    </div>
  );
}