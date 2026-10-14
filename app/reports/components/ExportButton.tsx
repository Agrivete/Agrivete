'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button, Select, Input } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';

interface ExportButtonProps {
  type: string;
  format: 'json' | 'csv' | 'pdf';
  startDate: string;
  endDate: string;
  onFormatChange: (format: 'json' | 'csv' | 'pdf') => void;
}

export function ExportButton({ type, format, startDate, endDate, onFormatChange }: ExportButtonProps) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (format === 'json') return;
    setExporting(true);
    try {
      const params = new URLSearchParams({ type, format });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      window.open(`/api/reports?${params}`, '_blank');
    } catch {
      toast('Failed to export report', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
      <div className="w-full space-y-1.5 sm:w-48">
        <label htmlFor="export-format" className="block text-sm font-medium text-neutral-700">
          Export format
        </label>
        <Select
          id="export-format"
          value={format}
          onChange={(e) => onFormatChange(e.target.value as 'json' | 'csv' | 'pdf')}
          options={[
            { value: 'json', label: 'JSON (preview)' },
            { value: 'csv', label: 'CSV' },
            { value: 'pdf', label: 'PDF' },
          ]}
          className="!h-10 !w-full !rounded-lg !border-neutral-200 focus:!border-[#4d8c2f] focus:!outline-[#4d8c2f]"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={handleExport}
        loading={exporting}
        disabled={format === 'json' || exporting}
        leftIcon={format === 'pdf' ? <FileText className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
        className="h-10 w-full whitespace-nowrap px-4 text-sm font-medium disabled:!border-neutral-300 disabled:!text-neutral-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Download'}
      </Button>
    </div>
  );
}