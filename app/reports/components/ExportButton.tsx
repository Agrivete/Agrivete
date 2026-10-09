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
    <div className="flex items-center gap-2">
      <Select
        label="Export format"
        value={format}
        onChange={(e) => onFormatChange(e.target.value as 'json' | 'csv' | 'pdf')}
        options={[
          { value: 'json', label: 'JSON (preview)' },
          { value: 'csv', label: 'CSV' },
          { value: 'pdf', label: 'PDF' },
        ]}
        className="w-36"
      />
      <Button
        type="button"
        variant="outline"
        onClick={handleExport}
        loading={exporting}
        disabled={format === 'json' || exporting}
        leftIcon={format === 'pdf' ? <FileText className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
      >
        {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Download'}
      </Button>
    </div>
  );
}