import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { ensureDatabaseReady } from '../client';
import { papers } from '../schema/research';
import { flashcards } from '../schema/flashcards';
import { createLogger } from '@research-os/shared';
import { buildKnowledgeGraph } from '../graph/build-knowledge-graph';

const logger = createLogger('ArxivIngest');

export type PaperSource = 'arxiv' | 'nvidia' | 'huggingface' | 'openreview' | 'paperswithcode';

const SOURCE_QUERY: Record<PaperSource, (q: string) => string> = {
  arxiv: (q) => `all:${q.trim() || 'transformer'}`,
  nvidia: (q) => `all:${q.trim() || 'transformer'} AND all:NVIDIA`,
  huggingface: (q) => `all:${q.trim() || 'transformer'} AND all:HuggingFace`,
  openreview: (q) => `all:${q.trim() || 'transformer'} AND all:ICLR`,
  paperswithcode: (q) => `all:${q.trim() || 'transformer'} AND all:benchmark`,
};

export type FetchStep = { name: string; status: 'pending' | 'running' | 'done' | 'error'; detail?: string };

function xmlTag(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim() || '';
}

function parseAtom(xml: string): Array<{
  arxivId: string;
  title: string;
  summary: string;
  authors: string[];
  published: string;
  pdfUrl: string | null;
  category: string;
}> {
  const entries = xml.split('<entry>').slice(1);
  return entries.map((raw) => {
    const block = raw.split('</entry>')[0] || '';
    const idUrl = xmlTag(block, 'id');
    const arxivId = idUrl.replace(/^https?:\/\/arxiv.org\/abs\//, '').replace(/v\d+$/, '');
    const authors = [...block.matchAll(/<name>([^<]+)<\/name>/g)].map((m) => m[1]!.trim());
    const pdf =
      block.match(/href="([^"]+)"[^>]*type="application\/pdf"/)?.[1] ||
      (arxivId ? `https://arxiv.org/pdf/${arxivId}.pdf` : null);
    const category =
      block.match(/<category[^>]*term="([^"]+)"/)?.[1] || 'cs.LG';
    return {
      arxivId,
      title: xmlTag(block, 'title').replace(/\s+/g, ' '),
      summary: xmlTag(block, 'summary').replace(/\s+/g, ' '),
      authors,
      published: xmlTag(block, 'published').slice(0, 10),
      pdfUrl: pdf,
      category,
    };
  }).filter((e) => e.title && e.arxivId);
}

export async function searchAndIngestPapers(options: {
  query: string;
  source?: PaperSource;
  maxResults?: number;
}): Promise<{
  imported: number;
  skipped: number;
  flashcards: number;
  graph: { nodes: number; edges: number };
  papers: Array<{ id: string; title: string; arxivId: string }>;
  steps: FetchStep[];
}> {
  const source: PaperSource = options.source || 'arxiv';
  const search = SOURCE_QUERY[source](options.query);
  const maxResults = Math.min(options.maxResults || 8, 15);
  const steps: FetchStep[] = [
    { name: `Search ${source}`, status: 'running' },
    { name: 'Download metadata / PDF links', status: 'pending' },
    { name: 'Store locally in SQLite', status: 'pending' },
    { name: 'Generate summaries & flashcards', status: 'pending' },
    { name: 'Link concepts in knowledge graph', status: 'pending' },
  ];

  const url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(search)}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;
  const res = await fetch(url, { headers: { 'User-Agent': 'ResearchOS/0.1 (local study OS)' } });
  if (!res.ok) {
    steps[0] = { name: steps[0]!.name, status: 'error', detail: `arXiv HTTP ${res.status}` };
    throw new Error(`arXiv search failed (${res.status})`);
  }
  const xml = await res.text();
  const found = parseAtom(xml);
  steps[0] = { name: steps[0]!.name, status: 'done', detail: `${found.length} results` };
  steps[1] = { name: steps[1]!.name, status: 'done', detail: 'PDF URLs attached (local download optional)' };

  const db = await ensureDatabaseReady();
  const now = new Date().toISOString();
  let imported = 0;
  let skipped = 0;
  let cardCount = 0;
  const stored: Array<{ id: string; title: string; arxivId: string }> = [];

  steps[2] = { ...steps[2]!, status: 'running' };
  const sourceEnum = source === 'nvidia' ? 'nvidia' : source === 'paperswithcode' ? 'paperswithcode' : 'arxiv';

  for (const item of found) {
    const [existing] = await db.select({ id: papers.id }).from(papers).where(eq(papers.arxivId, item.arxivId)).limit(1);
    if (existing) {
      skipped += 1;
      continue;
    }
    const id = `paper-${crypto.createHash('sha1').update(item.arxivId).digest('hex').slice(0, 12)}`;
    await db.insert(papers).values({
      id,
      arxivId: item.arxivId,
      title: item.title,
      authorsJson: JSON.stringify(item.authors),
      abstract: item.summary || 'No abstract.',
      source: sourceEnum,
      pdfUrl: item.pdfUrl,
      status: 'inbox',
      primaryCategory: item.category,
      categoriesJson: JSON.stringify([item.category, source]),
      summaryMarkdown: item.summary,
      keyContributionsJson: JSON.stringify([item.summary.slice(0, 280)]),
      publishedAt: item.published || now.slice(0, 10),
      createdAt: now,
      updatedAt: now,
    });
    imported += 1;
    stored.push({ id, title: item.title, arxivId: item.arxivId });

    const due = new Date();
    due.setDate(due.getDate() + 1);
    await db.insert(flashcards).values({
      id: `fc-${crypto.randomUUID()}`,
      paperId: id,
      question: `What problem does “${item.title}” address?`,
      answer: item.summary.slice(0, 600) || 'See abstract.',
      state: 'new',
      easeFactor: 2.5,
      intervalDays: 0,
      repetitionNumber: 0,
      dueAt: due.toISOString(),
      createdAt: now,
      updatedAt: now,
    });
    cardCount += 1;
  }
  steps[2] = { name: steps[2]!.name, status: 'done', detail: `${imported} new, ${skipped} already stored` };
  steps[3] = { name: steps[3]!.name, status: 'done', detail: `${cardCount} flashcards` };

  steps[4] = { ...steps[4]!, status: 'running' };
  const graph = await buildKnowledgeGraph();
  steps[4] = { name: steps[4]!.name, status: 'done', detail: `${graph.nodes} nodes / ${graph.edges} edges` };

  logger.info('Paper ingest complete', { imported, skipped, source, search });
  return { imported, skipped, flashcards: cardCount, graph, papers: stored, steps };
}
