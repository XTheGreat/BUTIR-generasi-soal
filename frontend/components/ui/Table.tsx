import React from "react";

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  headerClassName?: string;
  render?: (item: T, index: number) => React.ReactNode;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;
  className?: string;
  emptyMessage?: string;
}

export default function Table<T extends Record<string, any>>({
  columns,
  data,
  keyField = "id",
  className = "",
  emptyMessage = "Tidak ada data.",
}: TableProps<T>) {
  return (
    <div className={`w-full overflow-x-auto border border-[var(--line)] rounded-none bg-[var(--canvas)] ${className}`}>
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="bg-[var(--surface)] border-b border-[var(--line)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] ${
                  col.headerClassName || ""
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-sm text-[var(--ink-muted)] font-normal"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr
                key={item[keyField] ?? index}
                className="hover:bg-[var(--surface)]/70 transition-colors duration-140 ease-out"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3 py-2.5 text-sm text-[var(--ink)] align-middle ${
                      col.className || ""
                    }`}
                  >
                    {col.render ? col.render(item, index) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
