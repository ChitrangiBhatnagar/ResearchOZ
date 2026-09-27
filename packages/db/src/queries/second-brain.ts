import crypto from 'node:crypto';
import { and, desc, eq, inArray, like, or, sql } from 'drizzle-orm';
import { ensureDatabaseReady } from '../client';
import { knowledgeEdges, knowledgeNodes } from '../schema/graph';
import { paperSections, papers } from '../schema/research';
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
        .flatMap((e): PaperDetail['concepts'] => {
          const oid = e.sourceNodeId === paperNode.id ? e.targetNodeId : e.sourceNodeId;
          const n = byId.get(oid);
          if (!n || n.nodeType === 'paper') return [];
          return [{ id: n.id, label: n.label, nodeType: n.nodeType, edgeType: e.edgeType }];
        });
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

export type ResearchSource = {
  id: string;
  kind: 'paper' | 'concept' | 'topic';
  title: string;
  /** Text handed to the LLM and shown as the retrieved excerpt. */
  excerpt: string;
  score: number;
  matchedTerms: string[];
  /** Why this source was included: explicitly selected by the user or found by search. */
  origin: 'selected' | 'search';
  paper?: {
    arxivId: string | null;
    authors: string[];
    year: string | null;
    status: string;
    category: string;
    pdfUrl: string | null;
    sectionTitles: string[];
  };
};

const STOPWORDS = new Set(
  'a an and are as at be been but by can could did do does for from had has have how i if in into is it its me my of on or our over should so such than that the their them then there these they this those to up was we were what when where which while who why will with would you your about across between compare explain find give list mention mentioned papers paper research show simpler terms tell used using commonly approaches repeatedly relevant most question questions any all also more other some very'.split(
    ' '
  )
);

export function extractQueryTerms(question: string): string[] {
  const tokens = question
    .toLowerCase()
    .replace(/[^a-z0-9+#.\- ]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^[.\-]+|[.\-]+$/g, ''))
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
  return Array.from(new Set(tokens)).slice(0, 16);
}

function termScore(hay: string, terms: string[]): { score: number; matched: string[] } {
  const matched: string[] = [];
  let score = 0;
  for (const term of terms) {
    if (!hay.includes(term)) continue;
    matched.push(term);
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
    score += Math.min(hay.match(re)?.length ?? 1, 5);
  }
  return { score, matched };
}

/**
 * Retrieve grounding material for a research question: explicitly selected papers first, then papers,
 * concepts, and curriculum topics ranked by term overlap. Extracted PDF sections are used when present.
 */
export async function retrieveResearchSources(options: {
  question: string;
  paperIds?: string[];
  limit?: number;
  /** Similarity scores (0–1) from the sidecar's embedding search, merged into the ranking. */
  semanticScores?: Record<string, number>;
}): Promise<{ terms: string[]; sources: ResearchSource[] }> {
  const db = await ensureDatabaseReady();
  const terms = extractQueryTerms(options.question);
  const limit = Math.min(Math.max(options.limit ?? 8, 1), 16);
  const selectedIds = Array.from(new Set(options.paperIds ?? [])).slice(0, 12);

  const [paperRows, nodeRows, topicRows] = await Promise.all([
    db.select().from(papers).orderBy(desc(papers.updatedAt)).limit(500),
    db.select().from(knowledgeNodes).limit(500),
    db.select().from(topics).limit(500),
  ]);

  const sectionRows = await getRawSections(paperRows.map((p) => p.id));

  const toPaperSource = (
    p: (typeof paperRows)[number],
    origin: ResearchSource['origin'],
    score: number,
    matched: string[]
  ): ResearchSource => {
    const sections = sectionRows.get(p.id) ?? [];
    const contributions = parseContributions(p.keyContributionsJson);
    const relevantSections = sections
      .map((s) => ({ s, ...termScore(`${s.title} ${s.content}`.toLowerCase(), terms) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .filter((x) => x.score > 0 || origin === 'selected');
    const parts = [
      p.abstract,
      p.summaryMarkdown ? `Notes: ${p.summaryMarkdown}` : '',
      contributions.length ? `Key contributions: ${contributions.join('; ')}` : '',
      ...relevantSections.map((x) => `Section "${x.s.title}": ${x.s.content.slice(0, 700)}`),
    ].filter(Boolean);
    return {
      id: p.id,
      kind: 'paper',
      title: p.title,
      excerpt: parts.join('\n').slice(0, 1800),
      score,
      matchedTerms: matched,
      origin,
      paper: {
        arxivId: p.arxivId,
        authors: parseAuthors(p.authorsJson),
        year: p.publishedAt ? p.publishedAt.slice(0, 4) : null,
        status: p.status,
        category: p.primaryCategory || 'General',
        pdfUrl: p.pdfUrl ?? (p.arxivId ? `https://arxiv.org/pdf/${p.arxivId}.pdf` : null),
        sectionTitles: sections.slice(0, 8).map((s) => s.title),
      },
    };
  };

  const selected: ResearchSource[] = [];
  for (const id of selectedIds) {
    const p = paperRows.find((row) => row.id === id);
    if (!p) continue;
    const { score, matched } = termScore(`${p.title} ${p.abstract}`.toLowerCase(), terms);
    selected.push(toPaperSource(p, 'selected', 100 + score, matched));
  }

  const found: ResearchSource[] = [];
  const semantic = options.semanticScores ?? {};
  if (terms.length > 0 || Object.keys(semantic).length > 0) {
    const selectedSet = new Set(selectedIds);
    for (const p of paperRows) {
      if (selectedSet.has(p.id)) continue;
      const title = p.title.toLowerCase();
      const body = `${p.abstract} ${p.summaryMarkdown || ''} ${p.keyContributionsJson} ${p.primaryCategory || ''}`.toLowerCase();
      const sectionText = (sectionRows.get(p.id) ?? []).map((s) => `${s.title} ${s.content}`).join(' ').toLowerCase();
      const t = termScore(title, terms);
      const b = termScore(body, terms);
      const s = termScore(sectionText, terms);
      const matched = Array.from(new Set([...t.matched, ...b.matched, ...s.matched]));
      const similarity = semantic[p.id] ?? 0;
      if (matched.length === 0 && similarity < 0.5) continue;
      const coverage = terms.length ? matched.length / terms.length : 0;
      const score = t.score * 3 + b.score + s.score * 0.5 + coverage * 4 + similarity * 8;
      found.push(toPaperSource(p, 'search', Math.round(score * 100) / 100, matched));
    }

    for (const n of nodeRows) {
      if (n.nodeType === 'paper') continue;
      const { score, matched } = termScore(`${n.label} ${n.description || ''}`.toLowerCase(), terms);
      if (matched.length === 0) continue;
      found.push({
        id: n.id,
        kind: 'concept',
        title: n.label,
        excerpt: n.description || '',
        score: Math.round((score + n.importance) * 50) / 100,
        matchedTerms: matched,
        origin: 'search',
      });
    }

    for (const t of topicRows) {
      const { score, matched } = termScore(
        `${t.title} ${t.description || ''} ${t.notesMarkdown || ''}`.toLowerCase(),
        terms
      );
      if (matched.length === 0) continue;
      found.push({
        id: t.id,
        kind: 'topic',
        title: t.title,
        excerpt: [t.description, t.notesMarkdown].filter(Boolean).join('\n').slice(0, 900),
        score: Math.round(score * 40) / 100,
        matchedTerms: matched,
        origin: 'search',
      });
    }
  }

  found.sort((a, b) => b.score - a.score);
  const papersFound = found.filter((s) => s.kind === 'paper');
  const others = found.filter((s) => s.kind !== 'paper').slice(0, 3);
  const remaining = Math.max(limit - selected.length, 0);
  const reservedForOthers = Math.min(others.length, 2, remaining);
  const paperPick = papersFound.slice(0, remaining - reservedForOthers);
  const otherPick = others.slice(0, remaining - paperPick.length);
  const sources = [...selected, ...paperPick, ...otherPick];

  return { terms, sources };
}

async function getRawSections(
  paperIds: string[]
): Promise<Map<string, Array<{ title: string; content: string }>>> {
  const out = new Map<string, Array<{ title: string; content: string }>>();
  if (paperIds.length === 0) return out;
  const db = await ensureDatabaseReady();
  const rows = await db
    .select({
      paperId: paperSections.paperId,
      title: paperSections.title,
      content: paperSections.content,
      orderIndex: paperSections.orderIndex,
    })
    .from(paperSections)
    .where(inArray(paperSections.paperId, paperIds))
    .orderBy(paperSections.paperId, paperSections.orderIndex);
  for (const r of rows) {
    const list = out.get(r.paperId) ?? [];
    list.push({ title: r.title, content: r.content });
    out.set(r.paperId, list);
  }
  return out;
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
