'use client';

import * as React from 'react';
import { Search, Play, Zap, CheckCircle2 } from 'lucide-react';
import { Button, Badge } from '@research-os/ui';

interface HeaderProps {
  onOpenCommandPalette: () => void;
}

export function Header({ onOpenCommandPalette }: HeaderProps) {
  const [isStudying, setIsStudying] = React.useState(false);
  const [seconds, setSeconds] = React.useState(0);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStudying) {
      interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isStudying]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="h-12 border-b border-zinc-900 bg-zinc-950/60 px-6 flex items-center justify-between select-none backdrop-blur-md sticky top-0 z-40">
      {/* Search trigger */}
      <button
        onClick={onOpenCommandPalette}
        className="flex items-center space-x-2.5 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors w-72 cursor-pointer text-left"
      >
        <Search className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-xs text-zinc-400 flex-1">Search topics, papers, notes...</span>
        <kbd className="pointer-events-none inline-flex h-4 select-none items-center rounded bg-zinc-800 px-1.5 font-mono text-[9px] font-medium text-zinc-400">
          Ctrl K
        </kbd>
      </button>

      {/* Right controls: Study Timer & Status */}
      <div className="flex items-center space-x-3">
        {/* Quick Focus Session Timer */}
        {isStudying ? (
          <div className="flex items-center space-x-2 bg-indigo-950/60 border border-indigo-800/50 rounded-lg px-2.5 py-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
            </span>
            <span className="font-mono text-xs font-medium text-indigo-200">
              {formatTimer(seconds)}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-5 px-1.5 text-[10px] text-indigo-300 hover:bg-indigo-900/50"
              onClick={() => {
                setIsStudying(false);
                setSeconds(0);
              }}
            >
              Complete
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs flex items-center space-x-1.5 border-zinc-800 text-zinc-300 hover:bg-zinc-800/60"
            onClick={() => setIsStudying(true)}
          >
            <Play className="w-3 h-3 text-indigo-400" />
            <span>Start Deep Work</span>
          </Button>
        )}

        <div className="h-4 w-px bg-zinc-800" />

        {/* Local AI Engine Status */}
        <div className="flex items-center space-x-1.5 text-xs text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-medium text-zinc-300">Local Engine Ready</span>
        </div>
      </div>
    </header>
  );
}
