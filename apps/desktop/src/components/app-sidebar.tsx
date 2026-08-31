'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Compass,
  Activity,
  BookOpen,
  Layers,
  Sparkles,
  Database,
  Cpu,
  Network,
  Settings,
} from 'lucide-react';
import { Badge } from '@research-os/ui';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/roadmap', label: 'Roadmap', icon: Compass },
  { href: '/knowledge-graph', label: 'Knowledge Graph', icon: Network },
  { href: '/habits', label: 'Habits & Routine', icon: Activity },
  { href: '/research', label: 'Research Hub', icon: BookOpen },
  { href: '/flashcards', label: 'Flashcards', icon: Layers },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-44 sm:w-52 lg:w-56 shrink-0 h-full min-h-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex-col justify-between select-none overflow-hidden">
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-xs tracking-tight block">ResearchOS</span>
              <span className="text-[10px] text-muted-foreground block">AI Engineering OS</span>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="text-[9px] px-1.5 py-0 bg-muted text-muted-foreground border-0"
          >
            v0.1
          </Badge>
        </div>

        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground'
                )}
              >
                <Icon
                  className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-muted-foreground')}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="bg-muted/40 rounded-xl p-2.5 space-y-1.5 border border-border/60">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center space-x-1.5">
              <Database className="w-3 h-3 text-primary" />
              <span>Storage</span>
            </span>
            <span className="text-foreground/80 font-mono">SQLite (WAL)</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center space-x-1.5">
              <Cpu className="w-3 h-3 text-primary" />
              <span>Orchestrator</span>
            </span>
            <span className="text-foreground/80 font-mono">LangGraph</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
