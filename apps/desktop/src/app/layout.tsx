'use client';

import * as React from 'react';
import './globals.css';
import { AppSidebar } from '../components/app-sidebar';
import { Header } from '../components/header';
import { ThemeProvider } from '../components/theme-provider';
import { CommandPalette } from '@research-os/ui';
import { useRouter } from 'next/navigation';
import type { CommandPaletteAction } from '@research-os/types';
import { ExcelImportModal } from '../components/excel-import-modal';
import { Noto_Sans } from 'next/font/google';
import { cn } from '@/lib/utils';

const notoSans = Noto_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
});

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
    <html lang="en" className={cn('font-sans', notoSans.variable)} suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased flex h-dvh max-h-dvh overflow-hidden font-sans">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <div className="flex-1 flex items-stretch min-w-0 min-h-0 p-2 sm:p-3 md:p-5">
            <div className="w-full min-w-0 min-h-0 rounded-2xl md:rounded-3xl border border-border/70 bg-card/40 p-1 shadow-2xl overflow-hidden backdrop-blur-sm">
              <div className="flex h-full min-h-0 min-w-0 rounded-[1.1rem] md:rounded-[1.35rem] overflow-hidden bg-background">
                <AppSidebar />
                <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
                  <Header onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
                  <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4 sm:p-5 md:p-6 scrollbar-none">
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

          <ExcelImportModal open={excelModalOpen} onOpenChange={setExcelModalOpen} />
        </ThemeProvider>
      </body>
    </html>
  );
}
