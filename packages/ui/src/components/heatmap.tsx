import { cn } from '../lib/utils';
import type { HeatmapDay } from '@research-os/types';

export interface HeatmapProps {
  days: HeatmapDay[];
  className?: string;
  onSelectDay?: (day: HeatmapDay) => void;
}

const LEVEL_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-muted hover:bg-muted-foreground/20',
  1: 'bg-primary/20 hover:bg-primary/30',
  2: 'bg-primary/40 hover:bg-primary/50',
  3: 'bg-primary/70 hover:bg-primary/80',
  4: 'bg-primary hover:bg-primary/90',
};

export function Heatmap({ days, className, onSelectDay }: HeatmapProps) {
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
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">Activity Heatmap (Past 90 Days)</span>
        <div className="flex items-center space-x-1 text-[10px] text-muted-foreground">
          <span>Less</span>
          {([0, 1, 2, 3, 4] as const).map((level) => (
            <div key={level} className={cn('w-2.5 h-2.5 rounded-sm', LEVEL_COLORS[level])} />
          ))}
          <span>More</span>
        </div>
      </div>

      {days.length === 0 ? (
        <p className="py-3 text-[11px] text-muted-foreground">No activity logged yet.</p>
      ) : (
        <div className="flex space-x-1 overflow-x-auto pb-1 scrollbar-none">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col space-y-1">
              {week.map((day) => (
                <button
                  key={day.date}
                  type="button"
                  title={`${day.date}: ${day.studyMinutes}m study, ${day.habitsCompleted} habits`}
                  onClick={() => onSelectDay?.(day)}
                  className={cn(
                    'w-3 h-3 rounded-sm transition-colors duration-100',
                    onSelectDay ? 'cursor-pointer' : 'cursor-default',
                    LEVEL_COLORS[day.level]
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
