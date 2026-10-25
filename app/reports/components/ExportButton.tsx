'use client';

import { useState } from 'react';
import { FileSpreadsheet, FileText, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui';
import { toast } from 'sonner';

interface ExportButtonProps {
  type: string;
  startDate?: string;
  endDate?: string;
  disabled?: boolean;
  className?: string;
}

export function ExportButton({ type, startDate, endDate, disabled = false, className = '' }: ExportButtonProps) {
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'pdf' | null>(null);

  const handleDownload = async (format: 'csv' | 'pdf') => {
    setExportingFormat(format);
    try {
      const params = new URLSearchParams({ type, format });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/reports?${params}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `Export failed (${res.status})` }));
        throw new Error(errorData.error || `Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      const dateSlug = new Date().toISOString().slice(0, 10);
      a.download = `agrivet_${type}_report_${dateSlug}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} ${format.toUpperCase()} downloaded successfully`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to export report');
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div className={`flex flex-col xs:flex-row items-stretch sm:items-center gap-2 ${className}`}>
      {/* Export to CSV (Primary spreadsheet export) */}
      <Button
        type="button"
        variant="outline"
        onClick={() => handleDownload('csv')}
        disabled={disabled || exportingFormat !== null}
        className="h-11 min-h-[44px] flex-1 sm:flex-initial items-center justify-center gap-2 border-emerald-300 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70 px-4 text-xs font-semibold shadow-xs"
        title="Export to CSV (Excel & Google Sheets compatible with UTF-8 BOM)"
        aria-label="Export report to CSV"
      >
        {exportingFormat === 'csv' ? (
          <Loader2 className="h-4 w-4 animate-spin text-emerald-700 dark:text-emerald-300" />
        ) : (
          <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        )}
        <span>Export CSV</span>
      </Button>

      {/* Export to PDF */}
      <Button
        type="button"
        variant="outline"
        onClick={() => handleDownload('pdf')}
        disabled={disabled || exportingFormat !== null}
        className="h-11 min-h-[44px] flex-1 sm:flex-initial items-center justify-center gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 px-4 text-xs font-semibold shadow-xs"
        title="Export to printable landscape PDF"
        aria-label="Export report to PDF"
      >
        {exportingFormat === 'pdf' ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
        ) : (
          <FileText className="h-4 w-4 text-red-500 dark:text-red-400 shrink-0" />
        )}
        <span>Export PDF</span>
      </Button>
    </div>
  );
}
