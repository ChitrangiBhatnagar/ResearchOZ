import { cn } from '../lib/utils';
import type { HeatmapDay } from '@research-os/types';

export interface HeatmapProps {
  days: HeatmapDay[];
  className?: string;
  onSelectDay?: (day: HeatmapDay) => void;
}

export function Heatmap({ days, className, onSelectDay }: HeatmapProps) {
  // Color levels matching emerald dark palette
  const levelColors: Record<0 | 1 | 2 | 3 | 4, string> = {
    0: 'bg-zinc-800/40 hover:bg-zinc-700/60',
    1: 'bg-emerald-950/80 border border-emerald-800/40 hover:bg-emerald-900',
    2: 'bg-emerald-800 hover:bg-emerald-700',
    3: 'bg-emerald-600 hover:bg-emerald-500',
    4: 'bg-emerald-400 hover:bg-emerald-300 text-black',
  };

  // Split into weeks (chunks of 7 days)
  const weeks: HeatmapDay[][] = [];
  let currentWeek: HeatmapDay[] = [];

  for (let i = 0; i < days.length; i++) {
    const day = days[i]!;
    currentWeek.push(day);
    if (currentWeek.length === 7 || i === days.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  return (
    <div className={cn('flex flex-col space-y-2 select-none', className)}>
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span className="font-medium text-zinc-300">Activity Heatmap (Past 90 Days)</span>
        <div className="flex items-center space-x-1 text-[10px] text-zinc-500">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded-xs bg-zinc-800/60" />
          <div className="w-2.5 h-2.5 rounded-xs bg-emerald-950/80 border border-emerald-800/40" />
          <div className="w-2.5 h-2.5 rounded-xs bg-emerald-800" />
          <div className="w-2.5 h-2.5 rounded-xs bg-emerald-600" />
          <div className="w-2.5 h-2.5 rounded-xs bg-emerald-400" />
          <span>More</span>
        </div>
      </div>

      <div className="flex space-x-1 overflow-x-auto pb-1 scrollbar-none">
        {weeks.map((week, wIdx) => (
          <div key={wIdx} className="flex flex-col space-y-1">
            {week.map((day) => (
              <button
                key={day.date}
                title={`${day.date}: ${day.studyMinutes}m study, ${day.habitsCompleted} habits`}
                onClick={() => onSelectDay?.(day)}
                className={cn(
                  'w-3 h-3 rounded-xs transition-colors duration-100 cursor-pointer',
                  levelColors[day.level]
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
