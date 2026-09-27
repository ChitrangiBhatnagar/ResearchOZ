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
import { DomainEventListener } from '../components/domain-event-listener';
import { ResearchCopilotProvider, useResearchCopilot } from '../components/research-copilot';

const notoSans = Noto_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
});

const GO_TO_ROUTES: Record<string, string> = {
  d: '/',
  r: '/roadmap',
  k: '/knowledge-graph',
  h: '/habits',
  p: '/research',
  f: '/flashcards',
  l: '/planner',
  s: '/settings',
};

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { openCopilot } = useResearchCopilot();
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);
  const [excelModalOpen, setExcelModalOpen] = React.useState(false);

  React.useEffect(() => {
    let awaitingGo = false;
    let goTimer: ReturnType<typeof setTimeout> | undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'i' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        setExcelModalOpen(true);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if (awaitingGo) {
        awaitingGo = false;
        clearTimeout(goTimer);
        const route = GO_TO_ROUTES[key];
        if (route) {
          e.preventDefault();
          router.push(route);
        }
        return;
      }
      if (key === 'g') {
        awaitingGo = true;
        goTimer = setTimeout(() => {
          awaitingGo = false;
        }, 1200);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(goTimer);
    };
  }, [router]);

  const actions: CommandPaletteAction[] = React.useMemo(
    () => [
      {
        id: 'action-ask-copilot',
        title: 'Ask Research Copilot…',
        subtitle: 'Query and reason over your papers with cited sources',
        category: 'Research',
        shortcut: 'Ctrl J',
        action: () => openCopilot(),
      },
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
        id: 'nav-graph',
        title: 'Open Knowledge Graph',
        subtitle: 'Explore concepts, papers and how they connect',
        category: 'Navigation',
        shortcut: 'G K',
        action: () => router.push('/knowledge-graph'),
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
        id: 'nav-planner',
        title: 'Open Study Planner',
        subtitle: 'Generate today\u2019s plan from your time and energy',
        category: 'Study',
        shortcut: 'G L',
        action: () => router.push('/planner'),
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
    [router, openCopilot]
  );

  return (
    <>
      <DomainEventListener />
      <div className="flex-1 flex items-stretch min-w-0 min-h-0 p-2 sm:p-3 md:p-5">
        <div className="w-full min-w-0 min-h-0 rounded-2xl md:rounded-3xl border border-border/70 bg-card/40 p-1 shadow-xl dark:shadow-2xl overflow-hidden backdrop-blur-sm">
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

      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} actions={actions} />

      <ExcelImportModal open={excelModalOpen} onOpenChange={setExcelModalOpen} />
    </>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', notoSans.variable)} suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased flex h-dvh max-h-dvh overflow-hidden font-sans">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <ResearchCopilotProvider>
            <AppShell>{children}</AppShell>
          </ResearchCopilotProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
