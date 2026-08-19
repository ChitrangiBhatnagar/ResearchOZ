'use client';

import * as React from 'react';
import {
  Clock,
  Flame,
  BookOpen,
  Layers,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Check,
  Compass,
  Play,
  TrendingUp,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  ProgressRing,
  Heatmap,
} from '@research-os/ui';
import { generatePastNDaysHeatmap } from '@research-os/shared';
import Link from 'next/link';

export default function DashboardPage() {
  // Generate sample 90-day activity map
  const heatmapData = React.useMemo(() => {
    const activityMap = new Map<string, { studyMinutes: number; habitsCompleted: number }>();
    const today = new Date();
    for (let i = 0; i < 90; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0]!;
      // Simulate realistic activity pattern
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const studyMinutes = isWeekend ? (i % 3 === 0 ? 180 : 60) : (i % 2 === 0 ? 120 : 75);
      const habitsCompleted = isWeekend ? 3 : 5;
      activityMap.set(dateStr, { studyMinutes, habitsCompleted });
    }
    return generatePastNDaysHeatmap(90, activityMap);
  }, []);

  // Habit quick-check state
  const [habitStatus, setHabitStatus] = React.useState<Record<string, boolean>>({
    'habit-deep-work': true,
    'habit-paper': true,
    'habit-cuda': false,
    'habit-flashcards': false,
    'habit-exercise': true,
  });

  const toggleHabit = (id: string) => {
    setHabitStatus((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Welcome & Context */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
            Executive Study Dashboard
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            AI & LLM Systems Research Curriculum • Day 42 of 180
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/roadmap">
            <Button variant="outline" size="sm" className="text-xs flex items-center space-x-1.5 border-zinc-800">
              <Compass className="w-3.5 h-3.5 text-zinc-400" />
              <span>Curriculum Tree</span>
            </Button>
          </Link>
          <Link href="/flashcards">
            <Button variant="primary" size="sm" className="text-xs flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Review Deck (12 Due)</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Metric 1: Study Hours */}
        <Card className="bg-zinc-900/40 border-zinc-800/80 p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Study Hours</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-zinc-100 tracking-tight">84.5h</span>
            <span className="text-[11px] text-emerald-400 font-medium flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> +14.2h this wk
            </span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">Goal: 15h / week (94% achieved)</p>
        </Card>

        {/* Metric 2: Streak */}
        <Card className="bg-zinc-900/40 border-zinc-800/80 p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Current Streak</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-zinc-100 tracking-tight">14 Days</span>
            <span className="text-[11px] text-zinc-500">Best: 28</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">Consistency score: 92%</p>
        </Card>

        {/* Metric 3: Roadmap Progress */}
        <Card className="bg-zinc-900/40 border-zinc-800/80 p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-1">
              Curriculum Progress
            </div>
            <div className="text-xl font-bold text-zinc-100">38%</div>
            <p className="text-[10px] text-zinc-400 mt-0.5">6 of 16 topics done</p>
          </div>
          <ProgressRing value={38} size={44} strokeWidth={4} colorClass="text-indigo-500" />
        </Card>

        {/* Metric 4: Papers Read */}
        <Card className="bg-zinc-900/40 border-zinc-800/80 p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Papers Deep-Read</span>
            <BookOpen className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-zinc-100 tracking-tight">19</span>
            <Badge variant="success" className="text-[9px] py-0">cs.CL & cs.AI</Badge>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">3 papers pending synthesis</p>
        </Card>

        {/* Metric 5: Spaced Repetition Queue */}
        <Card className="bg-zinc-900/40 border-zinc-800/80 p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Revision Queue</span>
            <Layers className="w-4 h-4 text-violet-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-zinc-100 tracking-tight">12 Cards</span>
            <span className="text-[10px] text-amber-400 font-medium">Due Today</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">SM-2 Spaced Algorithm</p>
        </Card>
      </div>

      {/* Main Grid: AI Brief & Today's Plan on left, Activity & Habits on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column (2 Cols wide): AI Daily Brief & Focus Items */}
        <div className="lg:col-span-2 space-y-5">
          {/* AI Orchestrator Brief Card */}
          <Card className="border-indigo-900/40 bg-gradient-to-b from-indigo-950/20 to-zinc-900/40 p-5 relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-md bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-semibold text-zinc-100">AI Daily Study Brief</h2>
              </div>
              <Badge variant="indigo" className="text-[10px]">
                Autonomous Plan
              </Badge>
            </div>

            <p className="text-xs text-zinc-300 mt-3 leading-relaxed">
              Based on your previous mastery scores in <span className="text-indigo-300 font-medium">Automatic Differentiation</span> and high evening energy levels, your highest ROI today is completing the mathematical derivation of <span className="text-indigo-300 font-medium">Grouped-Query Attention (GQA)</span>, followed by the FlashAttention-2 paper review.
            </p>

            <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-4 text-zinc-400">
                <span>Estimated Target: <strong className="text-zinc-200">120 mins</strong></span>
                <span>Energy Match: <strong className="text-emerald-400">Peak</strong></span>
              </div>
              <Button size="sm" variant="primary" className="h-7 text-xs flex items-center space-x-1">
                <Play className="w-3 h-3" />
                <span>Execute Daily Plan</span>
              </Button>
            </div>
          </Card>

          {/* Today's Focus Action Topics */}
          <Card className="p-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60 mb-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Recommended Next Topics</h3>
                <p className="text-xs text-zinc-400">Ordered by prerequisite graph and priority</p>
              </div>
              <Link href="/roadmap" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center">
                Full Roadmap <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {/* Topic 1 */}
              <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-amber-950/60 border border-amber-800/60 text-amber-300 flex items-center justify-center text-[10px] font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">
                      Multi-Head Attention vs MQA vs Grouped-Query Attention (GQA)
                    </h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Phase 2: Transformer Architectures • 240 mins total (120 mins left)
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="warning">In Progress</Badge>
                  <Badge variant="secondary">Advanced</Badge>
                </div>
              </div>

              {/* Topic 2 */}
              <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-[10px] font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">
                      Rotary Position Embeddings (RoPE) & YaRN Extrapolation
                    </h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Phase 2: Transformer Architectures • 180 mins estimated
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">Not Started</Badge>
                  <Badge variant="secondary">Advanced</Badge>
                </div>
              </div>

              {/* Topic 3 */}
              <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-[10px] font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">
                      FlashAttention-1/2/3: Tiling, SRAM Constraints & Online Softmax
                    </h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Phase 2: Transformer Architectures • 300 mins estimated
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">Not Started</Badge>
                  <Badge variant="destructive">Expert</Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Heatmap & Habits Quick Tracker */}
        <div className="space-y-5">
          {/* Heatmap Card */}
          <Card className="p-5">
            <Heatmap days={heatmapData} />
          </Card>

          {/* Habit Routine Matrix */}
          <Card className="p-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60 mb-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Daily Habit Engine</h3>
                <p className="text-xs text-zinc-400">Impacts AI study planner heuristics</p>
              </div>
              <Link href="/habits" className="text-xs text-indigo-400 hover:text-indigo-300">
                View All
              </Link>
            </div>

            <div className="space-y-2">
              {[
                { id: 'habit-deep-work', name: 'Deep Study (120m)', color: 'text-emerald-400' },
                { id: 'habit-paper', name: 'Research Paper Deep Read', color: 'text-indigo-400' },
                { id: 'habit-cuda', name: 'CUDA / PyTorch Kernel Code', color: 'text-amber-400' },
                { id: 'habit-flashcards', name: 'Spaced Flashcard Review', color: 'text-pink-400' },
                { id: 'habit-exercise', name: 'Cardio / Weight Training', color: 'text-cyan-400' },
              ].map((h) => {
                const done = habitStatus[h.id];
                return (
                  <div
                    key={h.id}
                    onClick={() => toggleHabit(h.id)}
                    className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800/50 cursor-pointer transition-colors"
                  >
                    <span className="text-xs text-zinc-300">{h.name}</span>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                        done
                          ? 'bg-emerald-600 text-white'
                          : 'border border-zinc-700 bg-zinc-800 text-transparent hover:border-zinc-500'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
