export default function DataTable({
  columns,
  data,
  rowKey,
  emptyMessage = "No records found.",
}) {
  return (
    <div className="overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-slate-200">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="whitespace-nowrap px-4 py-3 font-condensed text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={row[rowKey] ?? index}
                  className="border-b border-slate-100 text-sm text-slate-800 transition hover:bg-slate-50"
                >
                  {columns.map((column) => (
                    <td key={column.key} className="whitespace-nowrap px-4 py-3">
                      {column.render ? column.render(row, index) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 
