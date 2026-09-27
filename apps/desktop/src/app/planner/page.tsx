'use client';

import * as React from 'react';
import Link from 'next/link';
import { Sparkles, Clock, Zap, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, Button, Badge } from '@research-os/ui';
import { cn } from '@/lib/utils';

type EnergyLevel = 'low' | 'medium' | 'high' | 'peak';

interface PlanItem {
  topic_id: string;
  topic_title: string;
  milestone_title: string;
  recommended_order: number;
  estimated_minutes: number;
  priority: 'must_do' | 'should_do' | 'optional';
  reasoning: string;
}

interface DailyPlan {
  plan_date: string;
  available_minutes: number;
  target_energy_level: EnergyLevel;
  focus_suggestion: string;
  items: PlanItem[];
}

const ENERGY_OPTIONS: { value: EnergyLevel; label: string; description: string }[] = [
  { value: 'low', label: 'Low', description: 'Light review, reading, flashcards' },
  { value: 'medium', label: 'Medium', description: 'Conceptual study, note synthesis' },
  { value: 'high', label: 'High', description: 'Deep derivations, paper analysis' },
  { value: 'peak', label: 'Peak', description: 'Kernel coding, hardest topics first' },
];

const PRIORITY_STYLES: Record<PlanItem['priority'], string> = {
  must_do: 'border-primary/35 bg-primary/5',
  should_do: 'border-border bg-card',
  optional: 'border-border/60 bg-muted/30',
};

export default function PlannerPage() {
  const [availableMinutes, setAvailableMinutes] = React.useState(120);
  const [energyLevel, setEnergyLevel] = React.useState<EnergyLevel>('high');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [plan, setPlan] = React.useState<DailyPlan | null>(null);
  const [completedItems, setCompletedItems] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);

  const generatePlan = async () => {
    setIsGenerating(true);
    setError(null);
    setPlan(null);
    setCompletedItems(new Set());

    try {
      const res = await fetch('/api/planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          available_minutes: availableMinutes,
          energy_level: energyLevel,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error?.message || `Planner error (${res.status})`);
      setPlan(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate plan');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleComplete = (id: string) => {
    setCompletedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const completedCount = completedItems.size;
  const totalItems = plan?.items.length ?? 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">AI Study Planner</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Acts as your engineering manager — inputs your energy and time budget, outputs today&apos;s optimal study plan.
        </p>
      </div>

      <Card className="p-5">
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="planner-minutes" className="text-xs font-semibold flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Available Study Time</span>
              </label>
              <span className="text-xs font-mono font-semibold text-primary">
                {availableMinutes >= 60
                  ? `${Math.floor(availableMinutes / 60)}h ${availableMinutes % 60 > 0 ? `${availableMinutes % 60}m` : ''}`
                  : `${availableMinutes}m`}
              </span>
            </div>
            <input
              id="planner-minutes"
              type="range"
              min={15}
              max={480}
              step={15}
              value={availableMinutes}
              onChange={(e) => setAvailableMinutes(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none bg-muted accent-[var(--primary)] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>15 min</span>
              <span>1h</span>
              <span>2h</span>
              <span>4h</span>
              <span>8h</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span>Current Energy Level</span>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {ENERGY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEnergyLevel(opt.value)}
                  aria-pressed={energyLevel === opt.value}
                  className={cn(
                    'p-2.5 rounded-lg border text-left transition-colors cursor-pointer',
                    energyLevel === opt.value
                      ? 'border-primary/50 bg-primary/10'
                      : 'border-border bg-card hover:bg-muted/50'
                  )}
                >
                  <div className={cn('text-xs font-semibold', energyLevel === opt.value && 'text-primary')}>{opt.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full font-semibold gap-2"
            onClick={() => void generatePlan()}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Plan...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Today&apos;s Study Plan</span>
              </>
            )}
          </Button>
        </div>
      </Card>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive text-center">
          {error}
        </div>
      )}

      {plan && (
        <div className="space-y-4">
          <Card className="p-4 border-primary/25 bg-gradient-to-b from-primary/10 to-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Today&apos;s Optimized Plan</h3>
                  <Badge variant="indigo" className="text-[10px]">
                    {plan.plan_date}
                  </Badge>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed max-w-2xl">{plan.focus_suggestion}</p>
              </div>
              {totalItems > 0 && (
                <div className="shrink-0 text-right">
                  <span className="text-lg font-semibold">
                    {completedCount}/{totalItems}
                  </span>
                  <p className="text-[10px] text-muted-foreground">completed</p>
                </div>
              )}
            </div>
          </Card>

          {plan.items.length === 0 && (
            <Card className="p-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">No open topics fit this time budget.</p>
              <Link href="/roadmap" className="text-xs text-primary hover:text-primary/80">
                Open the roadmap to add or reopen topics
              </Link>
            </Card>
          )}

          <div className="space-y-3">
            {plan.items.map((item) => {
              const isDone = completedItems.has(item.topic_id);
              return (
                <div
                  key={item.topic_id}
                  className={cn(
                    'p-4 rounded-xl border transition-colors',
                    isDone ? 'border-emerald-500/30 bg-emerald-500/5' : PRIORITY_STYLES[item.priority]
                  )}
                >
                  <div className="flex items-start justify-between space-x-4">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <div
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 mt-0.5',
                          isDone ? 'bg-emerald-600 text-white' : 'bg-secondary text-secondary-foreground'
                        )}
                      >
                        {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : item.recommended_order}
                      </div>
                      <div className="min-w-0">
                        <h4 className={cn('text-xs font-semibold', isDone && 'line-through text-muted-foreground')}>
                          {item.topic_title}
                        </h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {item.milestone_title} • {item.estimated_minutes} mins
                        </p>
                        <p className="text-[10px] text-foreground/70 mt-1.5 leading-relaxed">{item.reasoning}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <Badge
                        variant={
                          item.priority === 'must_do' ? 'indigo' : item.priority === 'should_do' ? 'secondary' : 'outline'
                        }
                        className="text-[9px] capitalize"
                      >
                        {item.priority.replace('_', ' ')}
                      </Badge>
                      <Button
                        size="sm"
                        variant={isDone ? 'secondary' : 'outline'}
                        className="h-7 text-[10px]"
                        onClick={() => toggleComplete(item.topic_id)}
                      >
                        {isDone ? 'Undo' : 'Done'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {completedCount === totalItems && totalItems > 0 && (
            <Card className="p-5 text-center border-emerald-500/30 bg-emerald-500/5">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold">Session Complete!</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Excellent work.{' '}
                <Link href="/habits" className="text-primary hover:text-primary/80">
                  Log this session in your habit tracker.
                </Link>
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
