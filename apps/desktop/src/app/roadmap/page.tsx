'use client';

import * as React from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Sparkles,
  BookOpen,
  Check,
  Filter,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Progress,
} from '@research-os/ui';
import { ExcelImportModal } from '../../components/excel-import-modal';

interface TopicItem {
  id: string;
  title: string;
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
}

const INITIAL_ROADMAP: MilestoneSection[] = [
  {
    id: 'ms-1',
    title: 'Phase 1: Deep Learning & Tensor Foundations',
    orderIndex: 1,
    estimatedHours: 40,
    topics: [
      { id: 't-1', title: 'Automatic Differentiation & Computational Graphs', difficulty: 'intermediate', status: 'completed', estimatedMinutes: 180, actualMinutes: 180 },
      { id: 't-2', title: 'Custom PyTorch Autograd Function Implementation', difficulty: 'intermediate', status: 'completed', estimatedMinutes: 120, actualMinutes: 120 },
      { id: 't-3', title: 'Optimization: AdamW, LAMB, and Learning Rate Schedulers', difficulty: 'advanced', status: 'completed', estimatedMinutes: 150, actualMinutes: 150 },
      { id: 't-4', title: 'Weight Initialization & LayerNorm vs RMSNorm Mechanics', difficulty: 'intermediate', status: 'in_progress', estimatedMinutes: 120, actualMinutes: 60 },
    ],
  },
  {
    id: 'ms-2',
    title: 'Phase 2: Transformer Architectures & Attention Mechanics',
    orderIndex: 2,
    estimatedHours: 60,
    topics: [
      { id: 't-5', title: 'Multi-Head Attention (MHA) vs MQA vs Grouped-Query (GQA)', difficulty: 'advanced', status: 'in_progress', estimatedMinutes: 240, actualMinutes: 120 },
      { id: 't-6', title: 'Rotary Position Embeddings (RoPE) & YaRN Extrapolation', difficulty: 'advanced', status: 'not_started', estimatedMinutes: 180, actualMinutes: 0 },
      { id: 't-7', title: 'FlashAttention-1/2/3: Tiling, SRAM Constraints & Online Softmax', difficulty: 'expert', status: 'not_started', estimatedMinutes: 300, actualMinutes: 0 },
      { id: 't-8', title: 'Mixture of Experts (MoE): Router Top-k, Auxiliary Loss & Expert Parallelism', difficulty: 'expert', status: 'not_started', estimatedMinutes: 240, actualMinutes: 0 },
    ],
  },
  {
    id: 'ms-3',
    title: 'Phase 3: Large-Scale Distributed Training & Parallelism',
    orderIndex: 3,
    estimatedHours: 70,
    topics: [
      { id: 't-9', title: 'Data Parallelism: DDP, ZeRO-1/2/3 & FSDP Sharding', difficulty: 'advanced', status: 'not_started', estimatedMinutes: 300, actualMinutes: 0 },
      { id: 't-10', title: 'Tensor Parallelism (Megatron-LM Column/Row Parallel Linear)', difficulty: 'expert', status: 'not_started', estimatedMinutes: 360, actualMinutes: 0 },
      { id: 't-11', title: 'Pipeline Parallelism (1F1B Schedule & Activation Checkpointing)', difficulty: 'expert', status: 'not_started', estimatedMinutes: 240, actualMinutes: 0 },
      { id: 't-12', title: 'Sequence Parallelism & Context Parallelism for 128k+ Tokens', difficulty: 'expert', status: 'not_started', estimatedMinutes: 300, actualMinutes: 0 },
    ],
  },
  {
    id: 'ms-4',
    title: 'Phase 4: High-Performance GPU Programming & Triton',
    orderIndex: 4,
    estimatedHours: 70,
    topics: [
      { id: 't-13', title: 'NVIDIA GPU Architecture: SMs, Warps, Shared Memory & Tensor Cores', difficulty: 'advanced', status: 'not_started', estimatedMinutes: 240, actualMinutes: 0 },
      { id: 't-14', title: 'Writing Custom CUDA Kernels for Fused GeLU and LayerNorm', difficulty: 'expert', status: 'not_started', estimatedMinutes: 360, actualMinutes: 0 },
      { id: 't-15', title: 'OpenAI Triton: Block Pointers, Coalescing & GEMM Kernel Tuning', difficulty: 'advanced', status: 'not_started', estimatedMinutes: 300, actualMinutes: 0 },
      { id: 't-16', title: 'vLLM & PagedAttention: KV Cache Virtual Memory Management', difficulty: 'expert', status: 'not_started', estimatedMinutes: 240, actualMinutes: 0 },
    ],
  },
];

export default function RoadmapPage() {
  const [milestones, setMilestones] = React.useState<MilestoneSection[]>(INITIAL_ROADMAP);
  const [collapsedMilestones, setCollapsedMilestones] = React.useState<Record<string, boolean>>({});
  const [excelModalOpen, setExcelModalOpen] = React.useState(false);

  const toggleMilestone = (id: string) => {
    setCollapsedMilestones((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleTopicStatus = (milestoneId: string, topicId: string) => {
    setMilestones((prev) =>
      prev.map((m) => {
        if (m.id !== milestoneId) return m;
        return {
          ...m,
          topics: m.topics.map((t) => {
            if (t.id !== topicId) return t;
            const nextStatus: TopicItem['status'] =
              t.status === 'completed'
                ? 'not_started'
                : t.status === 'in_progress'
                ? 'completed'
                : 'in_progress';
            return {
              ...t,
              status: nextStatus,
              actualMinutes: nextStatus === 'completed' ? t.estimatedMinutes : t.actualMinutes,
            };
          }),
        };
      })
    );
  };

  // Calculate totals
  const totalTopics = milestones.reduce((acc, m) => acc + m.topics.length, 0);
  const completedTopics = milestones.reduce(
    (acc, m) => acc + m.topics.filter((t) => t.status === 'completed').length,
    0
  );
  const progressPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header with Excel Import */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
            Curriculum Roadmap Explorer
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            AI & LLM Systems Research Engineer Master Plan • Excel Source of Truth
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExcelModalOpen(true)}
            className="text-xs flex items-center space-x-1.5 border-zinc-800 text-zinc-200"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import Excel Curriculum</span>
          </Button>
        </div>
      </div>

      {/* Progress Bar Overview */}
      <Card className="p-4 bg-zinc-900/40 border-zinc-800/80">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-zinc-200">Overall Curriculum Completion</span>
            <Badge variant="indigo">{completedTopics} of {totalTopics} Topics Mastered</Badge>
          </div>
          <span className="text-xs font-mono font-semibold text-indigo-400">{progressPct}%</span>
        </div>
        <Progress value={progressPct} />
      </Card>

      {/* Milestones and Topics List */}
      <div className="space-y-4">
        {milestones.map((milestone) => {
          const isCollapsed = collapsedMilestones[milestone.id];
          const mCompleted = milestone.topics.filter((t) => t.status === 'completed').length;
          const mTotal = milestone.topics.length;
          const mPct = mTotal > 0 ? Math.round((mCompleted / mTotal) * 100) : 0;

          return (
            <Card key={milestone.id} className="overflow-hidden border-zinc-800/80 p-0 bg-zinc-900/30">
              {/* Milestone Accordion Header */}
              <div
                onClick={() => toggleMilestone(milestone.id)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-900/60 transition-colors border-b border-zinc-800/40 select-none"
              >
                <div className="flex items-center space-x-3">
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                  )}
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-200">{milestone.title}</h3>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {milestone.estimatedHours} hours estimated • {mCompleted}/{mTotal} topics finished
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-[11px] font-mono text-zinc-400">{mPct}%</span>
                  <div className="w-20">
                    <Progress value={mPct} />
                  </div>
                </div>
              </div>

              {/* Topics Table */}
              {!isCollapsed && (
                <div className="divide-y divide-zinc-800/40">
                  {milestone.topics.map((topic) => {
                    const isDone = topic.status === 'completed';
                    const isInProg = topic.status === 'in_progress';

                    return (
                      <div
                        key={topic.id}
                        className="p-3.5 px-5 flex items-center justify-between hover:bg-zinc-900/40 transition-colors"
                      >
                        <div className="flex items-center space-x-3.5 flex-1 pr-4">
                          <button
                            onClick={() => toggleTopicStatus(milestone.id, topic.id)}
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                              isDone
                                ? 'bg-emerald-600 text-white'
                                : isInProg
                                ? 'border-2 border-amber-500/80 bg-amber-950/30 text-amber-400'
                                : 'border border-zinc-700 bg-zinc-800 text-transparent hover:border-zinc-500'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <div>
                            <h4
                              className={`text-xs font-medium ${
                                isDone ? 'text-zinc-400 line-through' : 'text-zinc-200'
                              }`}
                            >
                              {topic.title}
                            </h4>
                            <div className="flex items-center space-x-2 text-[10px] text-zinc-500 mt-0.5">
                              <span className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {topic.estimatedMinutes}m est.
                              </span>
                              {topic.actualMinutes > 0 && (
                                <span>• {topic.actualMinutes}m logged</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
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
                          <Badge
                            variant={
                              isDone ? 'success' : isInProg ? 'warning' : 'outline'
                            }
                          >
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

      <ExcelImportModal
        open={excelModalOpen}
        onOpenChange={setExcelModalOpen}
        onImportComplete={() => {
          // Trigger refresh logic
        }}
      />
    </div>
  );
}
