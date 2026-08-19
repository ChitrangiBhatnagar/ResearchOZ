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
  Network,
  Sparkles,
  Database,
  Cpu,
} from 'lucide-react';
import { Badge } from '@research-os/ui';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/roadmap', label: 'Roadmap', icon: Compass },
  { href: '/habits', label: 'Habits & Routine', icon: Activity },
  { href: '/research', label: 'Research Papers', icon: BookOpen },
  { href: '/flashcards', label: 'Flashcards', icon: Layers },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 h-screen bg-zinc-950 border-r border-zinc-900 flex flex-col justify-between select-none">
      {/* Top Header */}
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-950">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-semibold text-xs text-zinc-100 tracking-tight block">
                ResearchOS
              </span>
              <span className="text-[10px] text-zinc-500 block">AI Engineering OS</span>
            </div>
          </div>
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-zinc-900 text-zinc-400">
            v0.1
          </Badge>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-zinc-800/80 text-zinc-100 shadow-xs'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-zinc-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Status & Performance Indicators */}
      <div className="p-3 border-t border-zinc-900/80 space-y-2">
        <div className="bg-zinc-900/50 rounded-lg p-2.5 space-y-1.5 border border-zinc-800/40">
          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span className="flex items-center space-x-1.5">
              <Database className="w-3 h-3 text-emerald-400" />
              <span>Storage</span>
            </span>
            <span className="text-zinc-300 font-mono">SQLite (WAL)</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span className="flex items-center space-x-1.5">
              <Cpu className="w-3 h-3 text-indigo-400" />
              <span>Orchestrator</span>
            </span>
            <span className="text-zinc-300 font-mono">LangGraph</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
