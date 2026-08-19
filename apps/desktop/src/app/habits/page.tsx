'use client';

import * as React from 'react';
import {
  Activity,
  Flame,
  CheckCircle2,
  Calendar,
  Check,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Heatmap,
} from '@research-os/ui';
import { generatePastNDaysHeatmap } from '@research-os/shared';

interface HabitItem {
  id: string;
  name: string;
  category: string;
  targetDaily: string;
  streakDays: number;
  weeklyLogs: boolean[]; // Mon - Sun
}

const HABITS_DATA: HabitItem[] = [
  { id: 'h-1', name: 'Deep Work (AI Curriculum)', category: 'Study', targetDaily: '120 mins', streakDays: 14, weeklyLogs: [true, true, true, true, true, true, true] },
  { id: 'h-2', name: 'Research Paper Reading', category: 'Research', targetDaily: '1 paper', streakDays: 8, weeklyLogs: [true, true, true, false, true, true, true] },
  { id: 'h-3', name: 'CUDA / PyTorch Kernel Code', category: 'Coding', targetDaily: '60 mins', streakDays: 5, weeklyLogs: [false, true, true, true, true, true, false] },
  { id: 'h-4', name: 'Spaced Flashcards Review', category: 'Revision', targetDaily: '15 cards', streakDays: 19, weeklyLogs: [true, true, true, true, true, true, true] },
  { id: 'h-5', name: 'Exercise / Resistance Training', category: 'Health', targetDaily: '45 mins', streakDays: 6, weeklyLogs: [true, true, false, true, true, true, true] },
  { id: 'h-6', name: 'Meditation / Focus Session', category: 'Mindfulness', targetDaily: '10 mins', streakDays: 12, weeklyLogs: [true, true, true, true, true, true, true] },
];

const DAYS_HEADER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function HabitsPage() {
  const [habits, setHabits] = React.useState<HabitItem[]>(HABITS_DATA);

  const toggleDayLog = (habitId: string, dayIndex: number) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const newLogs = [...h.weeklyLogs];
        newLogs[dayIndex] = !newLogs[dayIndex];
        return { ...h, weeklyLogs: newLogs };
      })
    );
  };

  const heatmapData = React.useMemo(() => {
    const activityMap = new Map<string, { studyMinutes: number; habitsCompleted: number }>();
    const today = new Date();
    for (let i = 0; i < 90; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0]!;
      activityMap.set(dateStr, {
        studyMinutes: i % 2 === 0 ? 120 : 60,
        habitsCompleted: i % 3 === 0 ? 6 : 4,
      });
    }
    return generatePastNDaysHeatmap(90, activityMap);
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
            Habits & Daily Consistency Matrix
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Consistency is the primary predictor of engineering mastery • Feeds the AI Study Planner
          </p>
        </div>
      </div>

      {/* Overview Metric Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-zinc-900/40 border-zinc-800/80">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Weekly Consistency</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100">92.8%</div>
          <p className="text-[10px] text-zinc-500 mt-1">39 of 42 habit targets met this week</p>
        </Card>

        <Card className="p-4 bg-zinc-900/40 border-zinc-800/80">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Longest Streak</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-100">19 Days</div>
          <p className="text-[10px] text-zinc-500 mt-1">Spaced Flashcards Review</p>
        </Card>

        <Card className="p-4 bg-zinc-900/40 border-zinc-800/80">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Planner Influence</span>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-400">High Impact</div>
          <p className="text-[10px] text-zinc-500 mt-1">Unmet habits adjust today&apos;s study schedule</p>
        </Card>
      </div>

      {/* Heatmap Card */}
      <Card className="p-5">
        <Heatmap days={heatmapData} />
      </Card>

      {/* Weekly Matrix Table */}
      <Card className="overflow-hidden border-zinc-800/80 p-0 bg-zinc-900/30">
        <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-200">Current Week Breakdown</h3>
          <span className="text-[11px] text-zinc-400 font-mono">Week 34, 2026</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/60 bg-zinc-900/40 text-[11px] text-zinc-400">
                <th className="py-2.5 px-4 font-medium">Habit</th>
                <th className="py-2.5 px-4 font-medium">Target</th>
                <th className="py-2.5 px-4 font-medium">Streak</th>
                {DAYS_HEADER.map((day) => (
                  <th key={day} className="py-2.5 px-3 font-medium text-center">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40 text-xs">
              {habits.map((h) => (
                <tr key={h.id} className="hover:bg-zinc-900/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-zinc-200">
                    <div className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      <span>{h.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-zinc-400 text-[11px]">{h.targetDaily}</td>
                  <td className="py-3 px-4">
                    <span className="text-[11px] font-mono font-medium text-amber-400 flex items-center">
                      <Flame className="w-3 h-3 mr-1" /> {h.streakDays}d
                    </span>
                  </td>
                  {h.weeklyLogs.map((isDone, dayIdx) => (
                    <td key={dayIdx} className="py-3 px-3 text-center">
                      <button
                        onClick={() => toggleDayLog(h.id, dayIdx)}
                        className={`w-6 h-6 mx-auto rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                          isDone
                            ? 'bg-emerald-600/90 text-white'
                            : 'border border-zinc-800 bg-zinc-900/60 text-transparent hover:border-zinc-600'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
