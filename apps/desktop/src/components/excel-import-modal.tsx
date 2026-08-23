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
          throw new Error(json.error || json.detail || 'Master workbook import failed');
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
      <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-zinc-100 p-6 rounded-xl">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold">Import Study Roadmap</DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Upload your XLSX / CSV curriculum as the system source of truth.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div
            onClick={handleSelectAndImport}
            className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl p-6 text-center cursor-pointer transition-colors bg-zinc-900/30 hover:bg-zinc-900/60 flex flex-col items-center justify-center space-y-2"
          >
            <Upload className="w-6 h-6 text-zinc-400" />
            <p className="text-xs font-medium text-zinc-200">
              Click to select Excel (.xlsx, .xls, .csv)
            </p>
            <p className="text-[10px] text-zinc-500">
              Auto-parses Milestones, Topics, Estimated Hours, Difficulty & Status
            </p>
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center space-x-2 border ${
                isSuccess
                  ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-300'
              }`}
            >
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {!isProcessing && !isSuccess && (
                <AlertCircle className="w-4 h-4 text-amber-400" />
              )}
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
              {isProcessing ? 'Importing...' : 'Select File'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
