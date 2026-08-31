'use client';

import * as React from 'react';
import {
  Clock,
  Flame,
  BookOpen,
  Layers,
  Sparkles,
  ArrowRight,
  Compass,
  Play,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { Badge, ProgressRing, Heatmap } from '@research-os/ui';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { TopicTile } from '../components/ui/topic';
import { MiniCalendar } from '../components/ui/calendar';
import Link from 'next/link';
import type { HeatmapDay } from '@research-os/types';

type TopicStatus = 'not_started' | 'in_progress' | 'completed' | 'review_needed';
type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

type CurriculumTopic = {
  id: string;
  title: string;
  description: string | null;
  difficulty: Difficulty;
  status: TopicStatus;
  estimatedMinutes: number;
};

type DashboardPayload = {
  roadmap: {
    title: string;
    targetRole: string | null;
    milestones: Array<{
      title: string;
      estimatedHours: number;
      progressPercent: number;
    }>;
    stats: {
      totalTopics: number;
      completedTopics: number;
      inProgressTopics: number;
      progressPercent: number;
      totalEstimatedMinutes: number;
      actualMinutes: number;
    };
  } | null;
  nextTopics: CurriculumTopic[];
  papers: {
    total: number;
    processed: number;
    inbox: number;
    recent: Array<{ id: string; title: string; category: string; status: string }>;
  };
  habits: Array<{
    id: string;
    name: string;
    targetDailyUnits: number;
    unitLabel: string;
    completedToday: boolean;
  }>;
};

function formatHours(minutes: number): string {
  const h = minutes / 60;
  return `${h >= 10 ? h.toFixed(0) : h.toFixed(1)}h`;
}

function difficultyVariant(d: CurriculumTopic['difficulty']) {
  if (d === 'beginner') return 'outline';
  if (d === 'intermediate') return 'secondary';
  if (d === 'advanced') return 'warning';
  return 'destructive';
}

function statusLabel(status: CurriculumTopic['status']) {
  if (status === 'in_progress') return 'In Progress';
  if (status === 'completed') return 'Done';
  if (status === 'review_needed') return 'Review';
  return 'Not Started';
}

export default function DashboardPage() {
  const [data, setData] = React.useState<DashboardPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [habitStatus, setHabitStatus] = React.useState<Record<string, boolean>>({});
  const [importing, setImporting] = React.useState(false);
  const [heatmapData, setHeatmapData] = React.useState<HeatmapDay[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/curriculum/dashboard');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.detail || 'Failed to load curriculum');
      setData(json);
      const nextHabits: Record<string, boolean> = {};
      for (const h of json.habits || []) nextHabits[h.id] = Boolean(h.completedToday);
      setHabitStatus(nextHabits);

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

  const reimport = async () => {
    setImporting(true);
    try {
      const res = await fetch('/api/curriculum/import', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || json.detail || 'Import failed');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  };

  const toggleHabit = async (id: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch('/api/curriculum/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitId: id, date: today }),
    });
    if (!res.ok) return;
    const json = await res.json();
    if (json.toggled) {
      setHabitStatus((prev) => ({ ...prev, [id]: Boolean(json.toggled.completed) }));
    }
    const activityRes = await fetch('/api/curriculum/activity?days=90');
    if (activityRes.ok) {
      const activityJson = await activityRes.json();
      setHeatmapData(activityJson.heatmap || []);
    }
  };

  const stats = data?.roadmap?.stats;
  const milestones = data?.roadmap?.milestones || [];
  const weeklyBars = milestones.slice(0, 7).map((m) => Math.max(8, m.progressPercent || 12));
  const masteryGoals = milestones.slice(0, 2).map((m) => ({
    label: m.title,
    value: `${m.estimatedHours} hrs`,
    pct: m.progressPercent,
  }));

  const nextTopics = data?.nextTopics || [];

  if (loading && !data) {
    return (
      <div className="max-w-7xl mx-auto py-20 text-center text-sm text-muted-foreground">
        Loading curriculum from master workbook…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-xl mx-auto py-16 space-y-4 text-center">
        <h1 className="text-lg font-semibold">Curriculum not loaded</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="primary" onClick={() => void reimport()} disabled={importing}>
          {importing ? 'Importing…' : 'Import Master Workbook'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-10 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-foreground tracking-tight truncate">
            {data?.roadmap?.title || 'Executive Study Dashboard'}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data?.roadmap?.targetRole || 'AI Engineering curriculum'} · Source:{' '}
            <span className="text-foreground/80">Master Phases 1–3 workbook</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="text-xs flex items-center space-x-1.5"
            onClick={() => void reimport()}
            disabled={importing}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${importing ? 'animate-spin' : ''}`} />
            <span>{importing ? 'Syncing…' : 'Re-sync Excel'}</span>
          </Button>
          <Link href="/roadmap">
            <Button variant="outline" size="sm" className="text-xs flex items-center space-x-1.5">
              <Compass className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Curriculum Tree</span>
            </Button>
          </Link>
          <Link href="/flashcards">
            <Button variant="primary" size="sm" className="text-xs flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Review Deck</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3.5 min-w-0">
        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Estimated Hours</span>
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-semibold tracking-tight">
              {formatHours(stats?.totalEstimatedMinutes || 0)}
            </span>
            <span className="text-[11px] text-primary font-medium flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" />{' '}
              {formatHours(stats?.actualMinutes || 0)} logged
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Across {stats?.totalTopics || 0} workbook topics
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">In Progress</span>
            <Flame className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-semibold tracking-tight">
              {stats?.inProgressTopics || 0}
            </span>
            <span className="text-[11px] text-muted-foreground">active topics</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {milestones.length} subject milestones
          </p>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
              Curriculum Progress
            </div>
            <div className="text-xl font-semibold">{stats?.progressPercent || 0}%</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {stats?.completedTopics || 0} of {stats?.totalTopics || 0} topics done
            </p>
          </div>
          <ProgressRing
            value={stats?.progressPercent || 0}
            size={44}
            strokeWidth={4}
            colorClass="text-primary"
          />
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Papers Tracked</span>
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-semibold tracking-tight">{data?.papers.total || 0}</span>
            <Badge variant="success" className="text-[9px] py-0">
              {data?.papers.processed || 0} read
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {data?.papers.inbox || 0} still in inbox
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Next Up</span>
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-semibold tracking-tight">{nextTopics.length}</span>
            <span className="text-[10px] text-primary font-medium">queued</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">From master workbook order</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 min-w-0">
        <div className="xl:col-span-2 space-y-5 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 min-w-0">
            <Card className="p-5 flex flex-col">
              <div className="mb-4">
                <h3 className="text-sm font-semibold">Milestone Progress</h3>
                <p className="text-xs text-muted-foreground">Subjects from the master tracker</p>
              </div>
              <div className="flex items-end gap-2 h-36 mb-4">
                {(weeklyBars.length ? weeklyBars : [20, 35, 45, 30, 55, 40, 60]).map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end h-full">
                    <div className="w-full rounded-t-md bg-primary" style={{ height: `${v}%` }} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/70 mb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Focus now
                  </div>
                  <div className="text-sm font-medium mt-0.5 line-clamp-1">
                    {nextTopics[0]?.title || 'Open roadmap'}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {nextTopics[0] ? `${nextTopics[0].estimatedMinutes} mins` : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Papers
                  </div>
                  <div className="text-sm font-medium mt-0.5">{data?.papers.total || 0} listed</div>
                  <div className="text-[11px] text-muted-foreground">Research Papers sheet</div>
                </div>
              </div>
              <Link href="/roadmap" className="mt-auto">
                <Button variant="primary" className="w-full">
                  View Full Curriculum
                </Button>
              </Link>
            </Card>

            <Card className="p-5 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold">Subject Targets</h3>
                  <p className="text-xs text-muted-foreground">Completion by milestone</p>
                </div>
              </div>
              <div className="space-y-5 flex-1">
                {(masteryGoals.length
                  ? masteryGoals
                  : [
                      { label: 'No milestones yet', value: '0 hrs', pct: 0 },
                    ]
                ).map((goal) => (
                  <div key={goal.label}>
                    <div className="flex items-end justify-between mb-2 gap-2">
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground truncate">{goal.label}</div>
                        <div className="text-2xl font-semibold tracking-tight mt-0.5">
                          {goal.value}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">{goal.pct}% done</div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${goal.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-5 border-primary/20 bg-gradient-to-b from-primary/10 to-card">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-primary/20 text-primary border border-primary/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-semibold">Study Brief from Workbook</h2>
              </div>
              <Badge variant="secondary" className="text-[10px] bg-primary/15 text-primary border-0">
                Live curriculum
              </Badge>
            </div>

            <p className="text-xs text-foreground/85 mt-3 leading-relaxed">
              Your active queue starts with{' '}
              <span className="text-primary font-medium">
                {nextTopics[0]?.title || 'the next not-started topic'}
              </span>
              {nextTopics[0]?.description ? (
                <>
                  . Goal: <span className="text-foreground/90">{nextTopics[0].description}</span>
                </>
              ) : (
                '.'
              )}
            </p>

            <div className="mt-4 pt-3 border-t border-border/70 flex items-center justify-between text-xs gap-3">
              <div className="flex items-center space-x-4 text-muted-foreground">
                <span>
                  Est:{' '}
                  <strong className="text-foreground">
                    {nextTopics[0]?.estimatedMinutes || 0} mins
                  </strong>
                </span>
                <span>
                  Difficulty:{' '}
                  <strong className="text-primary">{nextTopics[0]?.difficulty || '—'}</strong>
                </span>
              </div>
              <Link href="/roadmap">
                <Button size="sm" variant="primary" className="h-8 text-xs flex items-center space-x-1">
                  <Play className="w-3 h-3" />
                  <span>Open Topic</span>
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between pb-3 border-b border-border/70 mb-3">
              <div>
                <h3 className="text-sm font-semibold">Recommended Next Topics</h3>
                <p className="text-xs text-muted-foreground">
                  Pulled from the master Excel topic list
                </p>
              </div>
              <Link
                href="/roadmap"
                className="text-xs text-primary hover:text-primary/80 flex items-center"
              >
                Full Roadmap <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {nextTopics.slice(0, 5).map((topic, idx) => (
                <TopicTile
                  key={topic.id}
                  index={idx + 1}
                  title={topic.title}
                  subtitle={topic.description || undefined}
                  minutes={topic.estimatedMinutes}
                  status={
                    topic.status === 'completed'
                      ? 'done'
                      : topic.status === 'in_progress'
                        ? 'in-progress'
                        : 'not-started'
                  }
                  badges={[
                    {
                      label: statusLabel(topic.status),
                      variant: topic.status === 'in_progress' ? 'warning' : 'outline',
                    },
                    {
                      label: topic.difficulty,
                      variant: difficultyVariant(topic.difficulty),
                    },
                  ]}
                />
              ))}
              {nextTopics.length === 0 && (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  No open topics — mark progress in the Roadmap or re-sync the workbook.
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-5 min-w-0">
          <Card className="p-5 overflow-hidden">
            <MiniCalendar
              inProgress={stats?.inProgressTopics || 0}
              finished={stats?.completedTopics || 0}
              waiting={Math.max(
                0,
                (stats?.totalTopics || 0) -
                  (stats?.completedTopics || 0) -
                  (stats?.inProgressTopics || 0)
              )}
            />
            <div className="mt-4 overflow-x-auto">
              <Heatmap days={heatmapData} />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between pb-3 border-b border-border/70 mb-3">
              <div>
                <h3 className="text-sm font-semibold">Daily Habit Engine</h3>
                <p className="text-xs text-muted-foreground">Defaults seeded with curriculum</p>
              </div>
              <Link href="/habits" className="text-xs text-primary hover:text-primary/80">
                View All
              </Link>
            </div>

            <div className="space-y-2">
              {(data?.habits || []).map((h) => {
                const done = habitStatus[h.id];
                return (
                  <Button
                    key={h.id}
                    variant={done ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => toggleHabit(h.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl"
                  >
                    <span className="text-xs">
                      {h.name}
                      <span className="text-muted-foreground ml-1">
                        ({h.targetDailyUnits}
                        {h.unitLabel})
                      </span>
                    </span>
                    <span className="text-[11px] opacity-80">{done ? 'Done' : ''}</span>
                  </Button>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between pb-3 border-b border-border/70 mb-3">
              <div>
                <h3 className="text-sm font-semibold">Recent Papers</h3>
                <p className="text-xs text-muted-foreground">From Research Papers sheet</p>
              </div>
              <Link href="/research" className="text-xs text-primary hover:text-primary/80">
                All papers
              </Link>
            </div>
            <div className="space-y-3">
              {(data?.papers.recent || []).slice(0, 4).map((p) => (
                <div key={p.id} className="space-y-1">
                  <div className="text-xs font-medium line-clamp-2">{p.title}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                    <Badge variant="secondary" className="text-[9px]">
                      {p.category}
                    </Badge>
                    <span>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
