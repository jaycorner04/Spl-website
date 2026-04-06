import { Fragment } from "react";

export default function DataTable({
  columns,
  data,
  rowKey,
  emptyMessage = "No records found.",
  className = "",
  scrollClassName = "",
  stickyHeader = false,
  expandedRowIds = [],
  expandedRowRender,
  headerClassName = "",
  headerCellClassName = "",
}) {
  const expandedKeys = new Set(expandedRowIds.map((value) => String(value)));

  return (
    <div className={`overflow-hidden rounded-2xl ${className}`.trim()}>
      <div className={`overflow-x-auto ${scrollClassName}`.trim()}>
        <table className="min-w-full text-left">
          <thead>
            <tr
              className={`border-b border-slate-200 ${
                stickyHeader ? "bg-white" : ""
              } ${headerClassName}`.trim()}
            >
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`whitespace-nowrap px-4 py-3 font-condensed text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 ${
                    stickyHeader ? "sticky top-0 z-10 bg-white" : ""
                  } ${headerCellClassName} ${column.headerCellClassName || ""}`.trim()}
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
                <Fragment key={row[rowKey] ?? index}>
                  <tr
                    className="border-b border-slate-100 text-sm text-slate-800 transition hover:bg-slate-50"
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`whitespace-nowrap px-4 py-3 ${
                          column.cellClassName || ""
                        }`.trim()}
                      >
                        {column.render ? column.render(row, index) : row[column.key]}
                      </td>
                    ))}
                  </tr>

                  {expandedRowRender &&
                  expandedKeys.has(String(row[rowKey] ?? index)) ? (
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <td colSpan={columns.length} className="px-4 py-4">
                        {expandedRowRender(row, index)}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 
