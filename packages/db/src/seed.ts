import { getDatabase, closeDatabase, getRawClient } from './client.js';
import { roadmaps, milestones, topics } from './schema/roadmap.js';
import { habits, habitLogs } from './schema/habits.js';
import { studySessions } from './schema/sessions.js';
import { flashcards } from './schema/flashcards.js';
import { knowledgeNodes, knowledgeEdges } from './schema/graph.js';
import { DEFAULT_HABITS, createLogger, formatDateToYYYYMMDD } from '@research-os/shared';
import crypto from 'node:crypto';

const logger = createLogger('DatabaseSeeder');

export async function seedDatabase(): Promise<void> {
  const db = getDatabase();
  const rawClient = getRawClient();
  const now = new Date().toISOString();
  logger.info('Starting database seeding with AI Engineer Master Curriculum');

  // Allow table creation queries to settle
  await new Promise((resolve) => setTimeout(resolve, 150));

  // 1. Seed Habits
  for (let i = 0; i < DEFAULT_HABITS.length; i++) {
    const h = DEFAULT_HABITS[i]!;
    const habitId = `habit-${h.habitType}`;
    try {
      await db.insert(habits)
        .values({
          id: habitId,
          name: h.name,
          habitType: h.habitType,
          description: `Daily habit for ${h.name.toLowerCase()}`,
          targetDailyUnits: h.targetDailyUnits,
          unitLabel: h.unitLabel,
          color: h.color,
          isActive: true,
          orderIndex: i,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();

      // Seed past 14 days of habit logs with realistic consistency
      const today = new Date();
      for (let dayOffset = 14; dayOffset >= 0; dayOffset--) {
        const logD = new Date(today);
        logD.setDate(logD.getDate() - dayOffset);
        const dateStr = formatDateToYYYYMMDD(logD);

        const isCompleted = Math.random() > 0.25;
        await db.insert(habitLogs)
          .values({
            id: `log-${habitId}-${dateStr}`,
            habitId,
            logDate: dateStr,
            completed: isCompleted,
            value: isCompleted ? h.targetDailyUnits : Math.round(h.targetDailyUnits * 0.4),
            notes: isCompleted ? 'Target achieved' : 'Partial session',
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing();
      }
    } catch {
      // Ignore if exists
    }
  }

  // 2. Seed Master AI Engineer Curriculum
  const roadmapId = 'roadmap-ai-engineer-core';
  const roadmapTitle = 'AI & LLM Systems Research Engineer Master Roadmap';

  try {
    await db.insert(roadmaps)
      .values({
        id: roadmapId,
        title: roadmapTitle,
        slug: 'ai-llm-systems-research-engineer',
        description: 'Comprehensive roadmap covering Deep Learning, Transformer Architectures, Distributed Training, and CUDA Kernel Optimization.',
        targetRole: 'AI Research Engineer',
        totalEstimatedHours: 240,
        status: 'active',
        sourceType: 'manual',
        sourceFile: 'curriculum/ai_engineer_2026.xlsx',
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    const curriculumMilestones = [
      {
        id: 'ms-foundations',
        title: 'Phase 1: Deep Learning & Tensor Foundations',
        orderIndex: 1,
        estimatedHours: 40,
        topics: [
          { title: 'Automatic Differentiation & Computational Graphs', minutes: 180, diff: 'intermediate' as const, status: 'completed' as const },
          { title: 'Custom PyTorch Autograd Function Implementation', minutes: 120, diff: 'intermediate' as const, status: 'completed' as const },
          { title: 'Optimization: AdamW, LAMB, and Learning Rate Schedulers', minutes: 150, diff: 'advanced' as const, status: 'completed' as const },
          { title: 'Weight Initialization & LayerNorm vs RMSNorm Mechanics', minutes: 120, diff: 'intermediate' as const, status: 'in_progress' as const },
        ],
      },
      {
        id: 'ms-transformers',
        title: 'Phase 2: Transformer Architectures & Attention Mechanics',
        orderIndex: 2,
        estimatedHours: 60,
        topics: [
          { title: 'Multi-Head Attention (MHA) vs Multi-Query (MQA) vs Grouped-Query (GQA)', minutes: 240, diff: 'advanced' as const, status: 'in_progress' as const },
          { title: 'Rotary Position Embeddings (RoPE) & YaRN Extrapolation', minutes: 180, diff: 'advanced' as const, status: 'not_started' as const },
          { title: 'FlashAttention-1/2/3: Tiling, SRAM Constraints & Online Softmax', minutes: 300, diff: 'expert' as const, status: 'not_started' as const },
          { title: 'Mixture of Experts (MoE): Router Top-k, Auxiliary Loss & Expert Parallelism', minutes: 240, diff: 'expert' as const, status: 'not_started' as const },
        ],
      },
      {
        id: 'ms-distributed',
        title: 'Phase 3: Large-Scale Distributed Training & Parallelism',
        orderIndex: 3,
        estimatedHours: 70,
        topics: [
          { title: 'Data Parallelism: DDP, ZeRO-1/2/3 & FSDP Sharding', minutes: 300, diff: 'advanced' as const, status: 'not_started' as const },
          { title: 'Tensor Parallelism (Megatron-LM Column/Row Parallel Linear)', minutes: 360, diff: 'expert' as const, status: 'not_started' as const },
          { title: 'Pipeline Parallelism (1F1B Schedule & Activation Checkpointing)', minutes: 240, diff: 'expert' as const, status: 'not_started' as const },
          { title: 'Sequence Parallelism & Context Parallelism for 128k+ Tokens', minutes: 300, diff: 'expert' as const, status: 'not_started' as const },
        ],
      },
      {
        id: 'ms-cuda',
        title: 'Phase 4: High-Performance GPU Programming & Triton',
        orderIndex: 4,
        estimatedHours: 70,
        topics: [
          { title: 'NVIDIA GPU Architecture: SMs, Warps, Shared Memory & Tensor Cores', minutes: 240, diff: 'advanced' as const, status: 'not_started' as const },
          { title: 'Writing Custom CUDA Kernels for Fused GeLU and LayerNorm', minutes: 360, diff: 'expert' as const, status: 'not_started' as const },
          { title: 'OpenAI Triton: Block Pointers, Coalescing & GEMM Kernel Tuning', minutes: 300, diff: 'advanced' as const, status: 'not_started' as const },
          { title: 'vLLM & PagedAttention: KV Cache Virtual Memory Management', minutes: 240, diff: 'expert' as const, status: 'not_started' as const },
        ],
      },
    ];

    for (const m of curriculumMilestones) {
      await db.insert(milestones)
        .values({
          id: m.id,
          roadmapId,
          title: m.title,
          orderIndex: m.orderIndex,
          estimatedHours: m.estimatedHours,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();

      for (let j = 0; j < m.topics.length; j++) {
        const t = m.topics[j]!;
        const topicId = `topic-${m.id}-${j + 1}`;
        const topicSlug = t.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        await db.insert(topics)
          .values({
            id: topicId,
            milestoneId: m.id,
            title: t.title,
            slug: topicSlug,
            description: `Core deep study module for ${t.title}`,
            difficulty: t.diff,
            status: t.status,
            orderIndex: j + 1,
            estimatedMinutes: t.minutes,
            actualMinutes: t.status === 'completed' ? t.minutes : t.status === 'in_progress' ? Math.round(t.minutes * 0.5) : 0,
            masteryScore: t.status === 'completed' ? 95 : t.status === 'in_progress' ? 45 : 0,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing();
      }
    }

    // 3. Seed Study Sessions
    await db.insert(studySessions)
      .values({
        id: crypto.randomUUID(),
        topicId: 'topic-ms-foundations-1',
        sessionType: 'deep_work',
        durationMinutes: 90,
        energyLevel: 'peak',
        focusScore: 9,
        notes: 'Implemented autograd engine from scratch in pure C++/Python.',
        startedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        endedAt: new Date(Date.now() - 86400000 * 2 + 5400000).toISOString(),
        createdAt: now,
      })
      .onConflictDoNothing();

    // 4. Seed Spaced Flashcards
    await db.insert(flashcards)
      .values({
        id: crypto.randomUUID(),
        topicId: 'topic-ms-transformers-1',
        paperId: null,
        question: 'What is the primary memory bandwidth advantage of Grouped-Query Attention (GQA) over Multi-Head Attention (MHA) during autoregressive decoding?',
        answer: 'GQA groups multiple query heads to share a single Key and Value head. This reduces the KV cache memory footprint and memory bandwidth transfer from HBM to SRAM by a factor of (H_q / H_kv) with negligible quality loss.',
        codeSnippet: '# GQA Projection\nq = self.q_proj(x) # (B, S, num_heads * head_dim)\nk = self.k_proj(x) # (B, S, num_kv_heads * head_dim)\nv = self.v_proj(x) # (B, S, num_kv_heads * head_dim)',
        state: 'review',
        easeFactor: 2.6,
        intervalDays: 3,
        repetitionNumber: 2,
        dueAt: new Date().toISOString(),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // 5. Seed Knowledge Graph
    const node1Id = 'node-transformer';
    const node2Id = 'node-flashattention';
    const node3Id = 'node-gqa';

    await db.insert(knowledgeNodes)
      .values([
        {
          id: node1Id,
          label: 'Transformer Architecture',
          nodeType: 'model_architecture',
          description: 'Foundational sequence transduction model based entirely on self-attention mechanisms.',
          importance: 0.95,
          createdAt: now,
        },
        {
          id: node2Id,
          label: 'FlashAttention',
          nodeType: 'algorithm',
          description: 'IO-aware exact attention algorithm leveraging GPU SRAM tiling and online softmax.',
          importance: 0.92,
          createdAt: now,
        },
        {
          id: node3Id,
          label: 'Grouped-Query Attention (GQA)',
          nodeType: 'technique',
          description: 'Interpolation between MHA and MQA for efficient KV-cache memory bandwidth scaling.',
          importance: 0.88,
          createdAt: now,
        },
      ])
      .onConflictDoNothing();

    await db.insert(knowledgeEdges)
      .values([
        {
          id: 'edge-1',
          sourceNodeId: node2Id,
          targetNodeId: node1Id,
          edgeType: 'improves',
          weight: 1.0,
          description: 'Replaces standard O(N^2) HBM memory traffic with SRAM-tiled kernel execution.',
          createdAt: now,
        },
        {
          id: 'edge-2',
          sourceNodeId: node3Id,
          targetNodeId: node1Id,
          edgeType: 'improves',
          weight: 0.9,
          description: 'Optimizes KV cache memory throughput during long-context generation.',
          createdAt: now,
        },
      ])
      .onConflictDoNothing();

    logger.info('Database successfully seeded with AI Engineer Master Curriculum');
  } catch (err) {
    logger.error('Error during database seed', err);
  }
}

// Auto-run if executed directly via CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(() => {
      closeDatabase();
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Seed execution failed', err);
      process.exit(1);
    });
}
