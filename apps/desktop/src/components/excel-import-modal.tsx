'use client';

import * as React from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Button } from '@research-os/ui';

interface ExcelImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

export function ExcelImportModal({
  open,
  onOpenChange,
  onImportComplete,
}: ExcelImportModalProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [isElectron, setIsElectron] = React.useState(false);

  React.useEffect(() => {
    setIsElectron(Boolean((window as any).electronAPI));
  }, []);

  React.useEffect(() => {
    if (open) {
      setStatusMessage(null);
      setIsSuccess(false);
    }
  }, [open]);

  const handleSelectAndImport = async () => {
    setIsProcessing(true);
    setStatusMessage(null);

    try {
      // Check if running within Electron
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const filePath = await (window as any).electronAPI.selectExcelFile();
        if (!filePath) {
          setIsProcessing(false);
          return;
        }

        setStatusMessage(`Ingesting curriculum: ${filePath.split(/[/\\]/).pop()}...`);
        const res = await (window as any).electronAPI.importRoadmap(filePath);

        if (res && res.success) {
          setIsSuccess(true);
          setStatusMessage(
            `Imported ${res.data.topicsCreated} topics across ${res.data.milestonesCreated} milestones!`
          );
          setTimeout(() => {
            onOpenChange(false);
            onImportComplete?.();
          }, 1400);
        } else {
          setIsSuccess(false);
          setStatusMessage(res?.error || 'Failed to import curriculum spreadsheet.');
        }
      } else {
        // Web / Next.js: import the master workbook from storage/
        setStatusMessage('Importing master workbook from storage/…');
        const res = await fetch('/api/curriculum/import', { method: 'POST' });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.detail || json.error || 'Master workbook import failed');
        }
        setIsSuccess(true);
        setStatusMessage(
          `Imported ${json.topicsCount} topics across ${json.milestonesCount} milestones and ${json.papersCount} papers.`
        );
        setTimeout(() => {
          onOpenChange(false);
          onImportComplete?.();
        }, 1400);
      }
    } catch (err) {
      setIsSuccess(false);
      setStatusMessage((err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-xl">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/25">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold">Import Study Roadmap</DialogTitle>
              <DialogDescription className="text-xs">
                {isElectron
                  ? 'Upload your XLSX / CSV curriculum as the system source of truth.'
                  : 'Re-import the master workbook stored in storage/ as the system source of truth.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <button
            type="button"
            onClick={handleSelectAndImport}
            disabled={isProcessing}
            className="w-full border-2 border-dashed border-border hover:border-primary/40 rounded-xl p-6 text-center cursor-pointer transition-colors bg-muted/30 hover:bg-muted/60 flex flex-col items-center justify-center space-y-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload className="w-6 h-6 text-muted-foreground" />
            <p className="text-xs font-medium text-foreground">
              {isElectron ? 'Click to select Excel (.xlsx, .xls, .csv)' : 'Click to import the master workbook'}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Auto-parses Milestones, Topics, Estimated Hours, Difficulty & Status
            </p>
          </button>

          {statusMessage && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center space-x-2 border ${
                isSuccess
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : isProcessing
                    ? 'bg-muted/60 border-border text-foreground/80'
                    : 'bg-destructive/10 border-destructive/30 text-destructive'
              }`}
            >
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
              {isSuccess && <CheckCircle2 className="w-4 h-4" />}
              {!isProcessing && !isSuccess && <AlertCircle className="w-4 h-4" />}
              <span className="flex-1">{statusMessage}</span>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSelectAndImport}
              disabled={isProcessing}
            >
              {isProcessing ? 'Importing...' : isElectron ? 'Select File' : 'Import Workbook'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
