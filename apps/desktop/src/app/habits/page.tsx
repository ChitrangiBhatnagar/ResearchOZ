'use client';

import * as React from 'react';
import { Flame, Check, TrendingUp, Sparkles } from 'lucide-react';
import { Card, Badge, Heatmap } from '@research-os/ui';
import type { HeatmapDay } from '@research-os/types';

const DAYS_HEADER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type HabitRow = {
  id: string;
  name: string;
  habitType: string;
  color: string;
  targetDailyUnits: number;
  unitLabel: string;
  streakDays: number;
  weeklyLogs: boolean[];
};

type HabitsPayload = {
  weekStart: string;
  weekLabel: string;
  habits: HabitRow[];
  stats: {
    consistencyPct: number;
    completedThisWeek: number;
    totalThisWeek: number;
    longestStreak: number;
    longestStreakName: string;
  };
};

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function HabitsPage() {
  const [data, setData] = React.useState<HabitsPayload | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [heatmapData, setHeatmapData] = React.useState<HeatmapDay[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/curriculum/habits');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load habits');
      setData(json);
      setError(null);
      const activityRes = await fetch('/api/curriculum/activity?days=90');
      if (activityRes.ok) {
        const activityJson = await activityRes.json();
        setHeatmapData(activityJson.heatmap || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const toggleDay = async (habitId: string, dayIndex: number) => {
    if (!data) return;
    const date = shiftDate(data.weekStart, dayIndex);
    const res = await fetch('/api/curriculum/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitId, date }),
    });
    const json = await res.json();
    if (res.ok) {
      setData(json);
      const activityRes = await fetch('/api/curriculum/activity?days=90');
      if (activityRes.ok) {
        const activityJson = await activityRes.json();
        setHeatmapData(activityJson.heatmap || []);
      }
    }
  };

  if (loading && !data) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Loading habits from database…</div>;
  }

  const habits = data?.habits || [];
  const stats = data?.stats;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Habits & Daily Consistency Matrix</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Logged in SQLite · seeded with the master curriculum · click a cell to check off a day
        </p>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Weekly Consistency</span>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-semibold">{stats?.consistencyPct ?? 0}%</div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {stats?.completedThisWeek ?? 0} of {stats?.totalThisWeek ?? 0} targets this week
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Longest Streak</span>
            <Flame className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-semibold">{stats?.longestStreak ?? 0} Days</div>
          <p className="text-[10px] text-muted-foreground mt-1">{stats?.longestStreakName}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Planner Influence</span>
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-semibold text-primary">
            {(stats?.consistencyPct || 0) >= 70 ? 'High Impact' : 'Build consistency'}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Unmet habits can reshape today&apos;s plan</p>
        </Card>
      </div>

      <Card className="p-5">
        <Heatmap days={heatmapData} />
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="p-4 border-b border-border/70 flex items-center justify-between">
          <h3 className="text-xs font-semibold">Current Week Breakdown</h3>
          <span className="text-[11px] text-muted-foreground font-mono">{data?.weekLabel}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/70 bg-muted/30 text-[11px] text-muted-foreground">
                <th className="py-2.5 px-4 font-medium">Habit</th>
                <th className="py-2.5 px-4 font-medium">Subject / Type</th>
                <th className="py-2.5 px-4 font-medium">Target</th>
                <th className="py-2.5 px-4 font-medium">Streak</th>
                {DAYS_HEADER.map((day) => (
                  <th key={day} className="py-2.5 px-3 font-medium text-center">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-xs">
              {habits.map((h) => (
                <tr key={h.id} className="hover:bg-muted/20">
                  <td className="py-3 px-4 font-medium">
                    <div className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: h.color }} />
                      <span>{h.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary" className="capitalize">
                      {h.habitType}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-[11px]">
                    {h.targetDailyUnits} {h.unitLabel}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[11px] font-mono font-medium text-primary flex items-center">
                      <Flame className="w-3 h-3 mr-1" /> {h.streakDays}d
                    </span>
                  </td>
                  {h.weeklyLogs.map((isDone, dayIdx) => (
                    <td key={dayIdx} className="py-3 px-3 text-center">
                      <button
                        onClick={() => void toggleDay(h.id, dayIdx)}
                        className={`w-6 h-6 mx-auto rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                          isDone
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-border bg-muted/40 text-transparent hover:border-primary/50'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
              {habits.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-muted-foreground">
                    No habits in the database. Re-sync the master workbook to seed defaults.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
