'use client';

import * as React from 'react';
import {
  FileSpreadsheet,
  Clock,
  ChevronDown,
  ChevronRight,
  Check,
  RefreshCw,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Progress,
} from '@research-os/ui';
import { useDomainEvents } from '../../components/domain-event-listener';

interface TopicItem {
  id: string;
  title: string;
  description?: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  status: 'not_started' | 'in_progress' | 'completed' | 'review_needed';
  estimatedMinutes: number;
  actualMinutes: number;
}

interface MilestoneSection {
  id: string;
  title: string;
  orderIndex: number;
  estimatedHours: number;
  topics: TopicItem[];
  completedTopics?: number;
  totalTopics?: number;
  progressPercent?: number;
}

interface RoadmapPayload {
  id: string;
  title: string;
  description: string | null;
  targetRole: string | null;
  totalEstimatedHours: number;
  sourceFile: string | null;
  milestones: MilestoneSection[];
  stats: {
    totalTopics: number;
    completedTopics: number;
    inProgressTopics: number;
    progressPercent: number;
  };
}

export default function RoadmapPage() {
  const [roadmap, setRoadmap] = React.useState<RoadmapPayload | null>(null);
  const [milestones, setMilestones] = React.useState<MilestoneSection[]>([]);
  const [collapsedMilestones, setCollapsedMilestones] = React.useState<Record<string, boolean>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [syncing, setSyncing] = React.useState(false);
  const [activeSheet, setActiveSheet] = React.useState<string>('all');

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/curriculum/roadmap');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.detail || 'Failed to load roadmap');
      setRoadmap(json);
      setMilestones(json.milestones || []);
      if ((json.milestones || []).length && activeSheet === 'all') {
        // keep All selected by default
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

  useDomainEvents((event) => {
    if (event.type === 'topic.updated' || event.type === 'research.imported') void load();
  });

  const syncWorkbook = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/curriculum/import', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.detail || json.error || 'Import failed');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
    }
  };

  const toggleMilestone = (id: string) => {
    setCollapsedMilestones((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleTopicStatus = async (milestoneId: string, topicId: string) => {
    const milestone = milestones.find((m) => m.id === milestoneId);
    const topic = milestone?.topics.find((t) => t.id === topicId);
    if (!topic) return;

    const res = await fetch(`/api/curriculum/topics/${topicId}`, { method: 'PATCH' }).catch(() => null);
    if (!res?.ok) {
      setError('Could not update the topic status. Please try again.');
      return;
    }
    setError(null);
    const updated = await res.json();

    setMilestones((prev) =>
      prev.map((m) => {
        if (m.id !== milestoneId) return m;
        return {
          ...m,
          topics: m.topics.map((t) =>
            t.id !== topicId
              ? t
              : {
                  ...t,
                  status: updated.status,
                  actualMinutes: updated.actualMinutes ?? t.actualMinutes,
                }
          ),
        };
      })
    );
  };

  const visibleMilestones =
    activeSheet === 'all' ? milestones : milestones.filter((m) => m.id === activeSheet);

  const totalTopics = roadmap?.stats.totalTopics ?? milestones.reduce((acc, m) => acc + m.topics.length, 0);
  const completedTopics =
    roadmap?.stats.completedTopics ??
    milestones.reduce((acc, m) => acc + m.topics.filter((t) => t.status === 'completed').length, 0);
  const progressPct =
    roadmap?.stats.progressPercent ??
    (totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0);

  if (loading && !roadmap) {
    return (
      <div className="max-w-7xl mx-auto py-20 text-center text-sm text-muted-foreground">
        Loading master curriculum…
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-12 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight truncate">
            {roadmap?.title || 'Curriculum Roadmap Explorer'}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {roadmap?.targetRole || 'AI Engineer Master Plan'} ·{' '}
            {roadmap?.totalEstimatedHours || 0}h estimated · subjects as workbook sheets
          </p>
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void syncWorkbook()}
          className="text-xs flex items-center space-x-1.5 shrink-0 self-start"
          disabled={syncing}
        >
          {syncing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
          ) : (
            <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
          )}
          <span className="whitespace-nowrap">
            {syncing ? 'Syncing workbook…' : 'Re-sync Master Excel'}
          </span>
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold">Overall Curriculum Completion</span>
            <Badge variant="secondary">
              {completedTopics} of {totalTopics} Topics
            </Badge>
          </div>
          <span className="text-xs font-mono font-semibold text-primary">{progressPct}%</span>
        </div>
        <Progress value={progressPct} />
      </Card>

      <div className="sticky top-0 z-20 -mx-1 px-1 py-1 bg-background/90 backdrop-blur-md">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveSheet('all')}
            className={`shrink-0 px-3 py-1.5 rounded-t-lg text-[11px] font-medium border border-b-0 transition-colors ${
              activeSheet === 'all'
                ? 'bg-card text-foreground border-border'
                : 'bg-muted/40 text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            All sheets
            <span className="ml-1.5 font-mono text-[10px] opacity-70">{milestones.length}</span>
          </button>
          {milestones.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setActiveSheet(m.id);
                setCollapsedMilestones((prev) => ({ ...prev, [m.id]: false }));
              }}
              className={`shrink-0 px-3 py-1.5 rounded-t-lg text-[11px] font-medium border border-b-0 max-w-[11rem] truncate transition-colors ${
                activeSheet === m.id
                  ? 'bg-card text-foreground border-border'
                  : 'bg-muted/40 text-muted-foreground border-transparent hover:text-foreground'
              }`}
              title={m.title}
            >
              {m.title}
            </button>
          ))}
        </div>
        <div className="h-px bg-border" />
      </div>

      <div className="space-y-4">
        {visibleMilestones.map((milestone) => {
          const isCollapsed = collapsedMilestones[milestone.id];
          const mCompleted = milestone.topics.filter((t) => t.status === 'completed').length;
          const mTotal = milestone.topics.length;
          const mPct = mTotal > 0 ? Math.round((mCompleted / mTotal) * 100) : 0;

          return (
            <Card key={milestone.id} className="overflow-hidden p-0">
              <div
                onClick={() => toggleMilestone(milestone.id)}
                className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/40 transition-colors border-b border-border/60 select-none min-w-0"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold truncate">{milestone.title}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {milestone.estimatedHours} hours estimated · {mCompleted}/{mTotal} topics
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
                  <span className="text-[11px] font-mono text-muted-foreground">{mPct}%</span>
                  <div className="w-14 sm:w-20">
                    <Progress value={mPct} />
                  </div>
                </div>
              </div>

              {!isCollapsed && (
                <div className="divide-y divide-border/50">
                  {milestone.topics.map((topic) => {
                    const isDone = topic.status === 'completed';
                    const isInProg = topic.status === 'in_progress';

                    return (
                      <div
                        key={topic.id}
                        className="p-3.5 px-3 sm:px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between hover:bg-muted/30 transition-colors gap-2 sm:gap-3 min-w-0"
                      >
                        <div className="flex items-center space-x-3.5 flex-1 min-w-0">
                          <button
                            type="button"
                            title="Cycle status: not started → in progress → completed"
                            aria-label={`Change status of ${topic.title} (currently ${topic.status.replace('_', ' ')})`}
                            onClick={() => void toggleTopicStatus(milestone.id, topic.id)}
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                              isDone
                                ? 'bg-primary text-primary-foreground'
                                : isInProg
                                  ? 'border-2 border-primary/80 bg-primary/10 text-primary'
                                  : 'border border-border bg-muted text-transparent hover:border-primary/50'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <div className="min-w-0">
                            <h4
                              className={`text-xs font-medium truncate ${
                                isDone ? 'text-muted-foreground line-through' : ''
                              }`}
                            >
                              {topic.title}
                            </h4>
                            <div className="flex items-center space-x-2 text-[10px] text-muted-foreground mt-0.5 min-w-0">
                              <span className="flex items-center shrink-0">
                                <Clock className="w-3 h-3 mr-1" />
                                {topic.estimatedMinutes}m est.
                              </span>
                              {topic.description && (
                                <span className="truncate min-w-0">· {topic.description}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0 pl-8 sm:pl-0">
                          <Badge
                            variant={
                              topic.difficulty === 'beginner'
                                ? 'default'
                                : topic.difficulty === 'intermediate'
                                  ? 'secondary'
                                  : topic.difficulty === 'advanced'
                                    ? 'warning'
                                    : 'destructive'
                            }
                          >
                            {topic.difficulty}
                          </Badge>
                          <Badge variant={isDone ? 'success' : isInProg ? 'warning' : 'outline'}>
                            {topic.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
