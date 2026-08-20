'use client';

import * as React from 'react';
import './globals.css';
import { AppSidebar } from '../components/app-sidebar';
import { Header } from '../components/header';
import { CommandPalette } from '@research-os/ui';
import { useRouter } from 'next/navigation';
import type { CommandPaletteAction } from '@research-os/types';
import { ExcelImportModal } from '../components/excel-import-modal';
import { Instrument_Sans, Montserrat } from "next/font/google";
import { cn } from "@/lib/utils";

const montserratHeading = Montserrat({subsets:['latin'],variable:'--font-heading'});

const instrumentSans = Instrument_Sans({subsets:['latin'],variable:'--font-sans'});


export default function RootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);
  const [excelModalOpen, setExcelModalOpen] = React.useState(false);

  const actions: CommandPaletteAction[] = React.useMemo(
    () => [
      {
        id: 'nav-dashboard',
        title: 'Open Dashboard',
        subtitle: 'View study metrics, heatmap and daily brief',
        category: 'Navigation',
        shortcut: 'G D',
        action: () => router.push('/'),
      },
      {
        id: 'nav-roadmap',
        title: 'Open Roadmap Explorer',
        subtitle: 'Navigate AI Engineering milestones and topics',
        category: 'Navigation',
        shortcut: 'G R',
        action: () => router.push('/roadmap'),
      },
      {
        id: 'nav-habits',
        title: 'Open Habits & Routine Matrix',
        subtitle: 'Track daily consistency, coding and study streaks',
        category: 'Navigation',
        shortcut: 'G H',
        action: () => router.push('/habits'),
      },
      {
        id: 'nav-research',
        title: 'Open Research Papers',
        subtitle: 'Explore arXiv literature and reading queue',
        category: 'Navigation',
        shortcut: 'G P',
        action: () => router.push('/research'),
      },
      {
        id: 'nav-flashcards',
        title: 'Start Spaced Flashcards Review',
        subtitle: 'SM-2 active recall on transformer & CUDA concepts',
        category: 'Study',
        shortcut: 'G F',
        action: () => router.push('/flashcards'),
      },
      {
        id: 'action-import-excel',
        title: 'Import Roadmap from Excel...',
        subtitle: 'Ingest XLSX or CSV curriculum as source of truth',
        category: 'Roadmap',
        shortcut: 'Ctrl I',
        action: () => setExcelModalOpen(true),
      },
    ],
    [router]
  );

  return (
    <html lang="en" className={cn("dark", "font-sans", instrumentSans.variable, montserratHeading.variable)}>
      <body className="bg-zinc-950 text-zinc-100 antialiased flex h-screen overflow-hidden font-sans">
        <div className="flex-1 flex items-stretch p-6">
          <div className="w-full rounded-3xl border border-zinc-800/60 bg-zinc-900/30 p-1 shadow-2xl overflow-hidden">
            <div className="flex h-full min-h-0">
              <AppSidebar />
              <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden rounded-2xl bg-zinc-950/50">
                <Header onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
                <main className="flex-1 overflow-y-auto p-6 scrollbar-none">
                  {children}
                </main>
              </div>
            </div>
          </div>
        </div>

        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          actions={actions}
        />

        <ExcelImportModal
          open={excelModalOpen}
          onOpenChange={setExcelModalOpen}
        />
      </body>
    </html>
  );
}
