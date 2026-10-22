import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total?: number;
  totalRecords?: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
  pageSizeOptions?: number[];
  isLoading?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  pageSize,
  total,
  totalRecords,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  isLoading = false
}) => {
  const actualTotal = total ?? totalRecords ?? 0;
  if (actualTotal === 0) return null;

  const startRecord = Math.min((page - 1) * pageSize + 1, actualTotal);
  const endRecord = Math.min(page * pageSize, actualTotal);

  // Generate visible page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      if (start > 2) {
        pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('...');
      }

      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-white border-t border-slate-200 text-sm select-none">
      {/* Records Count & Page Size */}
      <div className="flex items-center gap-3 text-slate-600">
        <span>
          Showing <span className="font-semibold text-slate-800">{startRecord}</span>–
          <span className="font-semibold text-slate-800">{endRecord}</span> of{' '}
          <span className="font-semibold text-slate-800">{total}</span> records
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3">
            <label htmlFor="page-size-select" className="text-xs text-slate-500 whitespace-nowrap">
              Per page:
            </label>
            <select
              id="page-size-select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              disabled={isLoading}
              className="text-xs border border-slate-300 rounded px-2 py-1 bg-white text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-burgundy-600 cursor-pointer disabled:opacity-50"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={page <= 1 || isLoading}
          title="First Page"
          className="p-1.5 rounded border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1 || isLoading}
          title="Previous Page"
          className="p-1.5 rounded border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <span key={`dots-${idx}`} className="px-2 py-1 text-slate-400 text-xs">
                  •••
                </span>
              );
            }
            const isActive = p === page;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                disabled={isLoading}
                className={`min-w-[32px] h-8 px-2 text-xs font-medium rounded transition-colors ${
                  isActive
                    ? 'bg-[#55080E] text-white shadow-sm font-semibold'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages || isLoading}
          title="Next Page"
          className="p-1.5 rounded border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages || isLoading}
          title="Last Page"
          className="p-1.5 rounded border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
