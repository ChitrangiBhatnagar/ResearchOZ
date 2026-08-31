'use client';

import * as React from 'react';

interface MiniCalendarProps {
  inProgress?: number;
  finished?: number;
  waiting?: number;
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export function MiniCalendar({ inProgress = 0, finished = 0, waiting = 0 }: MiniCalendarProps) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  const monthLabel = now.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Sunday-first grid to match common mini-calendars
  const startWeekday = new Date(year, month, 1).getDay();

  const cells: Array<number | null> = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const timeLabel = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="text-xs font-semibold text-foreground">{monthLabel}</div>
        <div className="text-[10px] text-muted-foreground tabular-nums">
          {pad(inProgress)} in progress · {pad(finished)} finished · {pad(waiting)} waiting · {timeLabel}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1 text-[9px] uppercase tracking-wide text-muted-foreground">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="flex items-center justify-center h-4">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-[11px] text-muted-foreground">
        {cells.map((d, i) => {
          if (d === null) {
            return <div key={`empty-${i}`} className="h-6" />;
          }
          const isToday = d === today;
          return (
            <div
              key={d}
              className={`flex items-center justify-center h-6 rounded-md ${
                isToday
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'bg-muted/50 text-foreground/80'
              }`}
            >
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MiniCalendar;
