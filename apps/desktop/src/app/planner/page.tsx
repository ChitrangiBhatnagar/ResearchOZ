'use client';

import * as React from 'react';
import {
  Sparkles,
  Clock,
  Zap,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
} from '@research-os/ui';

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

const ENERGY_OPTIONS: { value: EnergyLevel; label: string; color: string; description: string }[] = [
  { value: 'low', label: 'Low', color: 'text-zinc-400', description: 'Light review, reading, flashcards' },
  { value: 'medium', label: 'Medium', color: 'text-blue-400', description: 'Conceptual study, note synthesis' },
  { value: 'high', label: 'High', color: 'text-emerald-400', description: 'Deep derivations, paper analysis' },
  { value: 'peak', label: 'Peak', color: 'text-amber-400', description: 'Kernel coding, hardest topics first' },
];

const PRIORITY_STYLES: Record<string, string> = {
  must_do: 'bg-indigo-950/40 border-indigo-700/50 text-indigo-300',
  should_do: 'bg-zinc-800/60 border-zinc-700/50 text-zinc-300',
  optional: 'bg-zinc-900/40 border-zinc-800/40 text-zinc-400',
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

    try {
      const res = await fetch('/api/planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          available_minutes: availableMinutes,
          energy_level: energyLevel,
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (data.success) setPlan(data.data);
      else throw new Error(data.error?.message || 'Planner returned no plan');
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
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
          AI Study Planner
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Acts as your engineering manager — inputs your energy and time budget, outputs today&apos;s optimal study plan.
        </p>
      </div>

      {/* Configuration Card */}
      <Card className="p-5 bg-zinc-900/40 border-zinc-800/80">
        <div className="space-y-5">
          {/* Available Time Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-200 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Available Study Time</span>
              </label>
              <span className="text-xs font-mono font-bold text-indigo-300">
                {availableMinutes >= 60
                  ? `${Math.floor(availableMinutes / 60)}h ${availableMinutes % 60 > 0 ? `${availableMinutes % 60}m` : ''}`
                  : `${availableMinutes}m`}
              </span>
            </div>
            <input
              type="range"
              min={15}
              max={480}
              step={15}
              value={availableMinutes}
              onChange={(e) => setAvailableMinutes(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none bg-zinc-800 accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>15 min</span>
              <span>1h</span>
              <span>2h</span>
              <span>4h</span>
              <span>8h</span>
            </div>
          </div>

          {/* Energy Level Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-200 flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Current Energy Level</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {ENERGY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setEnergyLevel(opt.value)}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    energyLevel === opt.value
                      ? 'border-indigo-600/70 bg-indigo-950/40'
                      : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                  }`}
                >
                  <div className={`text-xs font-semibold ${opt.color}`}>{opt.label}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="primary"
            className="w-full h-9 text-sm font-semibold flex items-center justify-center space-x-2"
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
        <p className="text-xs text-destructive text-center">{error}</p>
      )}

      {/* Generated Plan */}
      {plan && (
        <div className="space-y-4">
          {/* Plan Header */}
          <Card className="p-4 border-indigo-900/40 bg-gradient-to-b from-indigo-950/20 to-zinc-900/40">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-zinc-100">Today&apos;s Optimized Plan</h3>
                  <Badge variant="indigo" className="text-[10px]">
                    {plan.plan_date}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed max-w-2xl">
                  {plan.focus_suggestion}
                </p>
              </div>
              {totalItems > 0 && (
                <div className="shrink-0 text-right">
                  <span className="text-lg font-bold text-zinc-100">{completedCount}/{totalItems}</span>
                  <p className="text-[10px] text-zinc-400">completed</p>
                </div>
              )}
            </div>
          </Card>

          {/* Plan Items */}
          <div className="space-y-3">
            {plan.items.map((item) => {
              const isDone = completedItems.has(item.topic_id);
              return (
                <div
                  key={item.topic_id}
                  className={`p-4 rounded-xl border transition-all ${
                    isDone
                      ? 'border-emerald-800/40 bg-emerald-950/10'
                      : `${PRIORITY_STYLES[item.priority]} `
                  }`}
                >
                  <div className="flex items-start justify-between space-x-4">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      {/* Order badge */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                        isDone ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : item.recommended_order}
                      </div>
                      <div className="min-w-0">
                        <h4 className={`text-xs font-semibold ${isDone ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
                          {item.topic_title}
                        </h4>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          {item.milestone_title} • {item.estimated_minutes} mins
                        </p>
                        <p className="text-[10px] text-zinc-400 mt-1.5 leading-relaxed">
                          {item.reasoning}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <Badge variant={
                        item.priority === 'must_do' ? 'indigo' :
                        item.priority === 'should_do' ? 'secondary' : 'outline'
                      } className="text-[9px] capitalize">
                        {item.priority.replace('_', ' ')}
                      </Badge>
                      <Button
                        size="sm"
                        variant={isDone ? 'secondary' : 'outline'}
                        className="h-7 text-[10px] border-zinc-700"
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
            <Card className="p-5 text-center border-emerald-800/50 bg-emerald-950/20">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-zinc-100">Session Complete!</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Excellent work. Log this session in your habit tracker.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
