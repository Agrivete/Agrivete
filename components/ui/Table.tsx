import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  accessor?: (row: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No records found',
  onRowClick,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 first:sticky first:left-0 first:z-20 first:bg-slate-50 dark:first:bg-slate-900 ${col.className || ''} ${col.hideOnMobile ? 'hidden sm:table-cell' : ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
              >
                <span className="flex flex-col items-center gap-3">
                  <Inbox className="h-12 w-12 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                  <span>{emptyMessage}</span>
                </span>
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`h-11 border-b border-slate-200 dark:border-slate-800 transition-colors even:bg-slate-50/40 dark:even:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/60 last:border-0 ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-slate-700 dark:text-slate-200 first:sticky first:left-0 first:z-10 first:bg-inherit ${col.className || ''} ${col.hideOnMobile ? 'hidden sm:table-cell' : ''}`}
                  >
                    {col.accessor ? col.accessor(row) : (row as unknown as Record<string, ReactNode>)[col.key]}
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

export function Pagination({
  page,
  pages,
  total,
  onPageChange,
}: {
  page: number;
  pages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (pages <= 1) return null;

  const numbers = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === pages || Math.abs(n - page) <= 1
  );

  return (
    <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-3 border-t border-slate-200 dark:border-slate-800 px-4 py-3">
      <p className="text-xs text-slate-500 dark:text-slate-400 w-full sm:w-auto text-center sm:text-left">
        {total} record{total === 1 ? '' : 's'} · page {page} of {pages}
      </p>
      <div className="flex items-center gap-1 w-full justify-center sm:justify-end">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
        >
          Prev
        </button>
        {numbers.map((n, i) => (
          <span key={n} className="flex items-center gap-1">
            {i > 0 && numbers[i - 1] !== n - 1 && (
              <span className="px-1 text-slate-400">…</span>
            )}
            <button
              onClick={() => onPageChange(n)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                n === page
                  ? 'bg-brand-700 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {n}
            </button>
          </span>
        ))}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
