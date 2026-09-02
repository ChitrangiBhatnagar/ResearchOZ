import crypto from 'node:crypto';
import { ensureDatabaseReady } from '../client';
import { knowledgeEdges, knowledgeNodes } from '../schema/graph';
import { milestones, topics } from '../schema/roadmap';
import { papers } from '../schema/research';
import { MASTER_ROADMAP_ID } from '../importers/master-tracker-importer';
import { eq } from 'drizzle-orm';
import { createLogger } from '@research-os/shared';

const logger = createLogger('KnowledgeGraph');

type NodeType = typeof knowledgeNodes.$inferInsert.nodeType;
type EdgeType = typeof knowledgeEdges.$inferInsert.edgeType;

function nid(prefix: string, ...parts: string[]): string {
  return `${prefix}-${crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 12)}`;
}

const CANONICAL: Array<{
  label: string;
  type: NodeType;
  description: string;
}> = [
  { label: 'Transformer', type: 'model_architecture', description: 'Sequence model built on self-attention rather than recurrence.' },
  { label: 'Attention', type: 'technique', description: 'Weighted aggregation of values given queries and keys.' },
  { label: 'BERT', type: 'model_architecture', description: 'Bidirectional encoder pretrained with masked language modeling.' },
  { label: 'GPT', type: 'model_architecture', description: 'Autoregressive decoder-only language model family.' },
  { label: 'CUDA', type: 'hardware', description: 'NVIDIA GPU programming model for kernels, memory, and tensor cores.' },
  { label: 'FlashAttention', type: 'algorithm', description: 'IO-aware exact attention via tiling and online softmax.' },
  { label: 'RoPE', type: 'technique', description: 'Rotary position embeddings for relative positional information.' },
  { label: 'MoE', type: 'model_architecture', description: 'Mixture of Experts sparse routing across expert MLPs.' },
  { label: 'FSDP', type: 'technique', description: 'Fully Sharded Data Parallel training for large models.' },
  { label: 'Triton', type: 'framework', description: 'Python DSL for writing efficient GPU kernels.' },
  { label: 'PagedAttention', type: 'algorithm', description: 'Virtual-memory style KV cache management for LLM serving.' },
  { label: 'GQA', type: 'technique', description: 'Grouped-query attention sharing KV heads across query groups.' },
  { label: 'LoRA', type: 'technique', description: 'Low-rank adapters for parameter-efficient fine-tuning.' },
  { label: 'RLHF', type: 'technique', description: 'Reinforcement learning from human feedback for alignment.' },
  { label: 'DPO', type: 'technique', description: 'Direct Preference Optimization without an explicit reward model.' },
  { label: 'KV Cache', type: 'technique', description: 'Cached key/value tensors for autoregressive decoding.' },
  { label: 'Quantization', type: 'technique', description: 'Lower-precision weights/activations (INT8/INT4/FP8) for inference.' },
  { label: 'Speculative Decoding', type: 'algorithm', description: 'Draft-then-verify decoding to accelerate LLM generation.' },
  { label: 'Diffusion', type: 'model_architecture', description: 'Generative models via iterative denoising of noise.' },
  { label: 'RAG', type: 'technique', description: 'Retrieval-augmented generation combining search with LLMs.' },
];

const CANONICAL_EDGES: Array<[string, string, EdgeType]> = [
  ['Transformer', 'Attention', 'uses'],
  ['BERT', 'Transformer', 'uses'],
  ['GPT', 'Transformer', 'uses'],
  ['GQA', 'Attention', 'improves'],
  ['GQA', 'Transformer', 'uses'],
  ['FlashAttention', 'Attention', 'improves'],
  ['FlashAttention', 'CUDA', 'uses'],
  ['Triton', 'CUDA', 'uses'],
  ['PagedAttention', 'Attention', 'improves'],
  ['PagedAttention', 'KV Cache', 'improves'],
  ['RoPE', 'Transformer', 'uses'],
  ['MoE', 'Transformer', 'uses'],
  ['FSDP', 'Transformer', 'uses'],
  ['LoRA', 'GPT', 'improves'],
  ['DPO', 'RLHF', 'replaces'],
  ['Speculative Decoding', 'KV Cache', 'uses'],
  ['Quantization', 'CUDA', 'uses'],
  ['RAG', 'Attention', 'uses'],
  ['BERT', 'GPT', 'replaces'],
];

function topicClusterLabel(title: string): string {
  const colon = title.indexOf(':');
  if (colon > 0 && colon < 48) return title.slice(0, colon).trim();
  return title.length > 42 ? title.slice(0, 42).trim() : title;
}

function matchesConcept(text: string, concept: string): boolean {
  const t = text.toLowerCase();
  const c = concept.toLowerCase();
  if (c === 'gpt') return /\bgpt\b|chatgpt|decoder-only/.test(t);
  if (c === 'bert') return /\bbert\b/.test(t);
  if (c === 'moe') return /mixture of experts|\bmoe\b/.test(t);
  if (c === 'gqa') return /grouped-query|\bgqa\b|multi-query|\bmqa\b/.test(t);
  if (c === 'rope') return /\brope\b|rotary/.test(t);
  if (c === 'fsdp') return /\bfsdp\b|fully sharded|zero-/.test(t);
  if (c === 'cuda') return /\bcuda\b|gpu kernel|tensor core/.test(t);
  if (c === 'attention') return /attention/.test(t);
  if (c === 'transformer') return /transformer/.test(t);
  if (c === 'flashattention') return /flash.?attention/.test(t);
  if (c === 'triton') return /\btriton\b/.test(t);
  if (c === 'pagedattention') return /paged.?attention|vllm/.test(t);
  if (c === 'lora') return /\blora\b|low-rank adapt/.test(t);
  if (c === 'rlhf') return /\brlhf\b|reinforcement learning from human/.test(t);
  if (c === 'dpo') return /\bdpo\b|direct preference/.test(t);
  if (c === 'kv cache') return /kv.?cache|key.?value cache/.test(t);
  if (c === 'quantization') return /quantiz|int4|int8|fp8|gptq|awq/.test(t);
  if (c === 'speculative decoding') return /speculative decoding|draft model/.test(t);
  if (c === 'diffusion') return /diffusion|denoising|ddpm|stable diffusion/.test(t);
  if (c === 'rag') return /\brag\b|retrieval.?augmented/.test(t);
  return t.includes(c);
}

export async function buildKnowledgeGraph(): Promise<{ nodes: number; edges: number }> {
  const db = await ensureDatabaseReady();
  const now = new Date().toISOString();

  await db.delete(knowledgeEdges);
  await db.delete(knowledgeNodes);

  const nodeIds = new Map<string, string>();
  let nodeCount = 0;
  let edgeCount = 0;

  async function addNode(
    label: string,
    nodeType: NodeType,
    extra?: { description?: string | null; sourceTopicId?: string | null; sourcePaperId?: string | null; importance?: number }
  ): Promise<string> {
    const key = label.toLowerCase();
    const existing = nodeIds.get(key);
    if (existing) return existing;
    const id = nid('kn', key);
    nodeIds.set(key, id);
    await db
      .insert(knowledgeNodes)
      .values({
        id,
        label: label.slice(0, 120),
        nodeType,
        description: extra?.description ?? null,
        importance: extra?.importance ?? 0.5,
        sourcePaperId: extra?.sourcePaperId ?? null,
        sourceTopicId: extra?.sourceTopicId ?? null,
        propertiesJson: '{}',
        createdAt: now,
      })
      .onConflictDoNothing();
    nodeCount += 1;
    return id;
  }

  const edgeSet = new Set<string>();
  async function addEdge(sourceId: string, targetId: string, edgeType: EdgeType, description?: string) {
    if (sourceId === targetId) return;
    const key = `${sourceId}|${targetId}|${edgeType}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    await db.insert(knowledgeEdges).values({
      id: nid('ke', sourceId, targetId, edgeType),
      sourceNodeId: sourceId,
      targetNodeId: targetId,
      edgeType,
      weight: 1,
      description: description ?? null,
      createdAt: now,
    });
    edgeCount += 1;
  }

  for (const c of CANONICAL) {
    await addNode(c.label, c.type, { description: c.description, importance: 0.95 });
  }
  for (const [from, to, type] of CANONICAL_EDGES) {
    const a = nodeIds.get(from.toLowerCase());
    const b = nodeIds.get(to.toLowerCase());
    if (a && b) await addEdge(a, b, type);
  }

  const milestoneRows = await db.select().from(milestones).where(eq(milestones.roadmapId, MASTER_ROADMAP_ID));
  const topicRows = await db.select().from(topics);
  const paperRows = await db.select().from(papers);

  const milestoneNode = new Map<string, string>();
  for (const m of milestoneRows) {
    const id = await addNode(m.title, 'concept', {
      description: `Subject sheet from master curriculum (${m.estimatedHours}h).`,
      importance: 0.9,
    });
    milestoneNode.set(m.id, id);
  }

  const clusterToId = new Map<string, string>();
  for (const t of topicRows) {
    const cluster = topicClusterLabel(t.title);
    const key = `${t.milestoneId}|${cluster.toLowerCase()}`;
    let clusterId = clusterToId.get(key);
    if (!clusterId) {
      clusterId = await addNode(cluster, 'technique', {
        description: t.description,
        sourceTopicId: t.id,
        importance: 0.55,
      });
      clusterToId.set(key, clusterId);
      const msId = milestoneNode.get(t.milestoneId);
      if (msId) await addEdge(clusterId, msId, 'uses', 'Taught in this subject');
      for (const c of CANONICAL) {
        if (matchesConcept(`${t.title} ${t.description || ''} ${t.notesMarkdown || ''}`, c.label)) {
          const cid = nodeIds.get(c.label.toLowerCase());
          if (cid) await addEdge(clusterId, cid, 'implements');
        }
      }
    }
  }

  for (const p of paperRows) {
    const pid = await addNode(p.title, 'paper', {
      description: p.abstract,
      sourcePaperId: p.id,
      importance: p.status === 'processed' ? 0.8 : p.status === 'reading' ? 0.65 : 0.45,
    });
    const hay = `${p.title} ${p.abstract} ${p.summaryMarkdown || ''} ${p.primaryCategory || ''}`;
    for (const c of CANONICAL) {
      if (matchesConcept(hay, c.label)) {
        const cid = nodeIds.get(c.label.toLowerCase());
        if (cid) await addEdge(pid, cid, 'cites', `Keyword link: paper mentions ${c.label}`);
      }
    }
    for (const m of milestoneRows) {
      const subjectKey = m.title.split(/[&–—-]/)[0]!.trim();
      if (subjectKey.length >= 4 && matchesConcept(hay, subjectKey)) {
        const mid = milestoneNode.get(m.id);
        if (mid) await addEdge(pid, mid, 'cites', `Linked to curriculum subject ${m.title}`);
      }
    }
  }

  logger.info('Knowledge graph rebuilt (second brain)', { nodes: nodeCount, edges: edgeCount });
  return { nodes: nodeCount, edges: edgeCount };
}
