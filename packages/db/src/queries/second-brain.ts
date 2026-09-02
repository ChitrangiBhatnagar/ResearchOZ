import crypto from 'node:crypto';
import { and, desc, eq, inArray, like, or, sql } from 'drizzle-orm';
import { ensureDatabaseReady } from '../client';
import { knowledgeEdges, knowledgeNodes } from '../schema/graph';
import { papers } from '../schema/research';
import { topics } from '../schema/roadmap';
import { getGraphNodeDetail } from './graph';

export type PaperStatus = 'inbox' | 'reading' | 'processed' | 'archived';

export type PaperDetail = {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  category: string;
  publishedDate: string;
  status: PaperStatus;
  arxivId: string | null;
  pdfUrl: string | null;
  summaryMarkdown: string | null;
  keyContributions: string[];
  source: string;
  concepts: Array<{ id: string; label: string; nodeType: string; edgeType: string }>;
};

function parseAuthors(raw: string | null | undefined): string[] {
  try {
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}

function parseContributions(raw: string | null | undefined): string[] {
  try {
    const v = JSON.parse(raw || '[]');
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function nid(...parts: string[]): string {
  return `ke-${crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 12)}`;
}

/** Full paper record + linked second-brain concepts from the knowledge graph. */
export async function getPaperDetail(id: string): Promise<PaperDetail | null> {
  const db = await ensureDatabaseReady();
  const [p] = await db.select().from(papers).where(eq(papers.id, id)).limit(1);
  if (!p) return null;

  const [paperNode] = await db
    .select()
    .from(knowledgeNodes)
    .where(eq(knowledgeNodes.sourcePaperId, id))
    .limit(1);

  let concepts: PaperDetail['concepts'] = [];
  if (paperNode) {
    const edges = await db
      .select()
      .from(knowledgeEdges)
      .where(
        or(eq(knowledgeEdges.sourceNodeId, paperNode.id), eq(knowledgeEdges.targetNodeId, paperNode.id))
      );
    const otherIds = edges.map((e) =>
      e.sourceNodeId === paperNode.id ? e.targetNodeId : e.sourceNodeId
    );
    if (otherIds.length > 0) {
      const nodes = await db.select().from(knowledgeNodes).where(inArray(knowledgeNodes.id, otherIds));
      const byId = new Map(nodes.map((n) => [n.id, n]));
      concepts = edges
        .map((e) => {
          const oid = e.sourceNodeId === paperNode.id ? e.targetNodeId : e.sourceNodeId;
          const n = byId.get(oid);
          if (!n || n.nodeType === 'paper') return null;
          return { id: n.id, label: n.label, nodeType: n.nodeType, edgeType: e.edgeType };
        })
        .filter((c): c is PaperDetail['concepts'][number] => Boolean(c));
    }
  }

  return {
    id: p.id,
    title: p.title,
    authors: parseAuthors(p.authorsJson),
    abstract: p.abstract,
    category: p.primaryCategory || 'General',
    publishedDate: p.publishedAt || '',
    status: p.status as PaperStatus,
    arxivId: p.arxivId,
    pdfUrl: p.pdfUrl,
    summaryMarkdown: p.summaryMarkdown,
    keyContributions: parseContributions(p.keyContributionsJson),
    source: p.source,
    concepts,
  };
}

export async function updatePaperStatus(
  paperId: string,
  status: PaperStatus
): Promise<{ id: string; status: PaperStatus } | null> {
  const db = await ensureDatabaseReady();
  const [row] = await db.select({ id: papers.id }).from(papers).where(eq(papers.id, paperId)).limit(1);
  if (!row) return null;
  const now = new Date().toISOString();
  await db.update(papers).set({ status, updatedAt: now }).where(eq(papers.id, paperId));

  // Bump graph node importance when marked processed
  const [node] = await db
    .select()
    .from(knowledgeNodes)
    .where(eq(knowledgeNodes.sourcePaperId, paperId))
    .limit(1);
  if (node) {
    await db
      .update(knowledgeNodes)
      .set({ importance: status === 'processed' ? 0.85 : status === 'reading' ? 0.65 : 0.45 })
      .where(eq(knowledgeNodes.id, node.id));
  }

  return { id: paperId, status };
}

export async function updatePaperNotes(
  paperId: string,
  notes: string
): Promise<{ id: string; summaryMarkdown: string } | null> {
  const db = await ensureDatabaseReady();
  const [row] = await db.select({ id: papers.id }).from(papers).where(eq(papers.id, paperId)).limit(1);
  if (!row) return null;
  const now = new Date().toISOString();
  await db
    .update(papers)
    .set({ summaryMarkdown: notes, updatedAt: now })
    .where(eq(papers.id, paperId));
  return { id: paperId, summaryMarkdown: notes };
}

/** Manually link a paper to a concept/node in the second-brain graph. */
export async function linkPaperToConcept(options: {
  paperId: string;
  conceptId?: string;
  conceptLabel?: string;
  edgeType?: typeof knowledgeEdges.$inferInsert.edgeType;
}): Promise<{ ok: boolean; edgeId?: string; message: string }> {
  const db = await ensureDatabaseReady();
  const [paper] = await db.select().from(papers).where(eq(papers.id, options.paperId)).limit(1);
  if (!paper) return { ok: false, message: `Paper not found: ${options.paperId}` };

  let [paperNode] = await db
    .select()
    .from(knowledgeNodes)
    .where(eq(knowledgeNodes.sourcePaperId, options.paperId))
    .limit(1);

  const now = new Date().toISOString();
  if (!paperNode) {
    const id = `kn-${crypto.createHash('sha1').update(`paper|${paper.id}`).digest('hex').slice(0, 12)}`;
    await db.insert(knowledgeNodes).values({
      id,
      label: paper.title.slice(0, 120),
      nodeType: 'paper',
      description: paper.abstract,
      importance: 0.5,
      sourcePaperId: paper.id,
      propertiesJson: '{}',
      createdAt: now,
    });
    [paperNode] = await db.select().from(knowledgeNodes).where(eq(knowledgeNodes.id, id)).limit(1);
  }
  if (!paperNode) return { ok: false, message: 'Could not create paper graph node' };

  let concept =
    options.conceptId != null
      ? (
          await db
            .select()
            .from(knowledgeNodes)
            .where(eq(knowledgeNodes.id, options.conceptId))
            .limit(1)
        )[0]
      : undefined;

  if (!concept && options.conceptLabel) {
    const label = options.conceptLabel.trim();
    const [byLabel] = await db
      .select()
      .from(knowledgeNodes)
      .where(eq(knowledgeNodes.label, label))
      .limit(1);
    concept = byLabel;
    if (!concept) {
      const id = `kn-${crypto.createHash('sha1').update(label.toLowerCase()).digest('hex').slice(0, 12)}`;
      await db.insert(knowledgeNodes).values({
        id,
        label: label.slice(0, 120),
        nodeType: 'concept',
        description: `User-linked concept from paper “${paper.title}”`,
        importance: 0.7,
        propertiesJson: JSON.stringify({ manual: true }),
        createdAt: now,
      });
      concept = (await db.select().from(knowledgeNodes).where(eq(knowledgeNodes.id, id)).limit(1))[0];
    }
  }

  if (!concept) return { ok: false, message: 'Provide conceptId or conceptLabel' };

  const edgeType = options.edgeType ?? 'cites';
  const edgeId = nid(paperNode.id, concept.id, edgeType);
  const existing = await db
    .select({ id: knowledgeEdges.id })
    .from(knowledgeEdges)
    .where(
      and(
        eq(knowledgeEdges.sourceNodeId, paperNode.id),
        eq(knowledgeEdges.targetNodeId, concept.id),
        eq(knowledgeEdges.edgeType, edgeType)
      )
    )
    .limit(1);
  if (existing[0]) {
    return { ok: true, edgeId: existing[0].id, message: 'Link already exists' };
  }

  await db.insert(knowledgeEdges).values({
    id: edgeId,
    sourceNodeId: paperNode.id,
    targetNodeId: concept.id,
    edgeType,
    weight: 1.5,
    description: 'Manual second-brain link',
    createdAt: now,
  });

  return { ok: true, edgeId, message: `Linked paper → ${concept.label}` };
}

export type SecondBrainHit =
  | {
      kind: 'paper';
      id: string;
      title: string;
      status: string;
      category: string;
      snippet: string;
      score: number;
    }
  | {
      kind: 'concept';
      id: string;
      label: string;
      nodeType: string;
      snippet: string;
      score: number;
    }
  | {
      kind: 'topic';
      id: string;
      title: string;
      status: string;
      snippet: string;
      score: number;
    };

/** Unified keyword search across papers, graph concepts, and curriculum topics. */
export async function searchSecondBrain(
  query: string,
  limit = 20
): Promise<{ query: string; hits: SecondBrainHit[]; total: number }> {
  const db = await ensureDatabaseReady();
  const q = query.trim().toLowerCase();
  if (!q) return { query, hits: [], total: 0 };

  const [paperRows, nodeRows, topicRows] = await Promise.all([
    db.select().from(papers).orderBy(desc(papers.updatedAt)).limit(400),
    db.select().from(knowledgeNodes).limit(500),
    db.select().from(topics).limit(500),
  ]);

  const hits: SecondBrainHit[] = [];

  for (const p of paperRows) {
    const hay = `${p.title} ${p.abstract} ${p.summaryMarkdown || ''} ${p.primaryCategory || ''}`.toLowerCase();
    if (!hay.includes(q)) continue;
    const score =
      (p.title.toLowerCase().includes(q) ? 3 : 0) +
      (p.abstract.toLowerCase().includes(q) ? 1 : 0) +
      (p.status === 'processed' ? 0.5 : 0);
    hits.push({
      kind: 'paper',
      id: p.id,
      title: p.title,
      status: p.status,
      category: p.primaryCategory || 'General',
      snippet: (p.summaryMarkdown || p.abstract).slice(0, 220),
      score,
    });
  }

  for (const n of nodeRows) {
    if (n.nodeType === 'paper') continue;
    const hay = `${n.label} ${n.description || ''}`.toLowerCase();
    if (!hay.includes(q)) continue;
    hits.push({
      kind: 'concept',
      id: n.id,
      label: n.label,
      nodeType: n.nodeType,
      snippet: (n.description || '').slice(0, 220),
      score: (n.label.toLowerCase().includes(q) ? 3 : 1) + n.importance,
    });
  }

  for (const t of topicRows) {
    const hay = `${t.title} ${t.description || ''} ${t.notesMarkdown || ''}`.toLowerCase();
    if (!hay.includes(q)) continue;
    hits.push({
      kind: 'topic',
      id: t.id,
      title: t.title,
      status: t.status,
      snippet: (t.description || t.notesMarkdown || '').slice(0, 220),
      score: t.title.toLowerCase().includes(q) ? 2.5 : 1,
    });
  }

  hits.sort((a, b) => b.score - a.score);
  const sliced = hits.slice(0, Math.min(Math.max(limit, 1), 50));
  return { query, hits: sliced, total: hits.length };
}

/** Resolve a concept by id or label and return graph detail. */
export async function resolveConcept(idOrLabel: string) {
  const db = await ensureDatabaseReady();
  const [byId] = await db
    .select()
    .from(knowledgeNodes)
    .where(eq(knowledgeNodes.id, idOrLabel))
    .limit(1);
  if (byId) return getGraphNodeDetail(byId.id);

  const [byLabel] = await db
    .select()
    .from(knowledgeNodes)
    .where(eq(knowledgeNodes.label, idOrLabel))
    .limit(1);
  if (byLabel) return getGraphNodeDetail(byLabel.id);

  const likePattern = `%${idOrLabel}%`;
  const fuzzy = await db
    .select()
    .from(knowledgeNodes)
    .where(like(knowledgeNodes.label, likePattern))
    .limit(5);
  if (fuzzy.length === 1) return getGraphNodeDetail(fuzzy[0]!.id);
  if (fuzzy.length > 1) {
    return {
      matches: fuzzy.map((n) => ({ id: n.id, label: n.label, nodeType: n.nodeType })),
      message: 'Multiple concepts matched; pass an exact id',
    };
  }
  return null;
}

export async function getSecondBrainStats() {
  const db = await ensureDatabaseReady();
  const [paperCount] = await db.select({ c: sql<number>`count(*)` }).from(papers);
  const [nodeCount] = await db.select({ c: sql<number>`count(*)` }).from(knowledgeNodes);
  const [edgeCount] = await db.select({ c: sql<number>`count(*)` }).from(knowledgeEdges);
  const byStatus = await db
    .select({ status: papers.status, c: sql<number>`count(*)` })
    .from(papers)
    .groupBy(papers.status);

  return {
    papers: Number(paperCount?.c ?? 0),
    nodes: Number(nodeCount?.c ?? 0),
    edges: Number(edgeCount?.c ?? 0),
    papersByStatus: Object.fromEntries(byStatus.map((r) => [r.status, Number(r.c)])),
  };
}
