'use client';

import * as React from 'react';
import { Search, Play } from 'lucide-react';
import { Button } from '@research-os/ui';

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
    <header className="h-12 border-b border-border/80 bg-background/70 px-6 flex items-center justify-between select-none backdrop-blur-md sticky top-0 z-40">
      <button
        onClick={onOpenCommandPalette}
        className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-muted/50 border border-border/80 text-muted-foreground hover:text-foreground hover:border-border transition-colors w-72 cursor-pointer text-left"
      >
        <Search className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs flex-1">Search topics, papers, notes...</span>
        <kbd className="pointer-events-none inline-flex h-4 select-none items-center rounded-md bg-muted px-1.5 font-mono text-[9px] font-medium text-muted-foreground">
          Ctrl K
        </kbd>
      </button>

      <div className="flex items-center space-x-3">
        {isStudying ? (
          <div className="flex items-center space-x-2 bg-primary/10 border border-primary/30 rounded-xl px-2.5 py-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="font-mono text-xs font-medium text-primary">{formatTimer(seconds)}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-5 px-1.5 text-[10px] text-primary hover:bg-primary/15"
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
            className="h-8 text-xs flex items-center space-x-1.5 rounded-xl"
            onClick={() => setIsStudying(true)}
          >
            <Play className="w-3 h-3 text-primary" />
            <span>Start Deep Work</span>
          </Button>
        )}

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center space-x-1.5 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-medium text-foreground/80">Local Engine Ready</span>
        </div>
      </div>
    </header>
  );
}
