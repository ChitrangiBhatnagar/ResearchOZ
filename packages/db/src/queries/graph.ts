import { eq, inArray, or } from 'drizzle-orm';
import { ensureDatabaseReady } from '../client';
import { knowledgeEdges, knowledgeNodes } from '../schema/graph';
import { papers } from '../schema/research';
import { topics } from '../schema/roadmap';

export type GraphVizNode = {
  id: string;
  label: string;
  nodeType: string;
  importance: number;
  sourcePaperId: string | null;
  sourceTopicId: string | null;
};

export type GraphVizEdge = {
  id: string;
  source: string;
  target: string;
  edgeType: string;
};

export async function getGraphPayload(): Promise<{
  nodes: GraphVizNode[];
  edges: GraphVizEdge[];
}> {
  const db = await ensureDatabaseReady();
  const [nodeRows, edgeRows] = await Promise.all([
    db.select().from(knowledgeNodes),
    db.select().from(knowledgeEdges),
  ]);

  const ranked = [...nodeRows].sort((a, b) => b.importance - a.importance);
  const keep = new Set(
    ranked
      .filter((n) => n.importance >= 0.7 || n.nodeType === 'paper' || n.nodeType === 'model_architecture' || n.nodeType === 'hardware')
      .slice(0, 180)
      .map((n) => n.id)
  );
  if (keep.size < 80) {
    for (const n of ranked.slice(0, 120)) keep.add(n.id);
  }

  const visNodes = nodeRows.filter((n) => keep.has(n.id));
  const visEdges = edgeRows.filter((e) => keep.has(e.sourceNodeId) && keep.has(e.targetNodeId));

  return {
    nodes: visNodes.map((n) => ({
      id: n.id,
      label: n.label,
      nodeType: n.nodeType,
      importance: n.importance,
      sourcePaperId: n.sourcePaperId,
      sourceTopicId: n.sourceTopicId,
    })),
    edges: visEdges.map((e) => ({
      id: e.id,
      source: e.sourceNodeId,
      target: e.targetNodeId,
      edgeType: e.edgeType,
    })),
  };
}

export async function getGraphNodeDetail(id: string) {
  const db = await ensureDatabaseReady();
  const [node] = await db.select().from(knowledgeNodes).where(eq(knowledgeNodes.id, id)).limit(1);
  if (!node) return null;

  const relatedEdges = await db
    .select()
    .from(knowledgeEdges)
    .where(or(eq(knowledgeEdges.sourceNodeId, id), eq(knowledgeEdges.targetNodeId, id)));

  const otherIds = [
    ...new Set(relatedEdges.map((e) => (e.sourceNodeId === id ? e.targetNodeId : e.sourceNodeId))),
  ];
  const others =
    otherIds.length === 0
      ? []
      : await db.select().from(knowledgeNodes).where(inArray(knowledgeNodes.id, otherIds));

  const otherById = new Map(others.map((n) => [n.id, n]));

  let topic = null;
  if (node.sourceTopicId) {
    const [t] = await db.select().from(topics).where(eq(topics.id, node.sourceTopicId)).limit(1);
    topic = t ?? null;
  }

  let paper = null;
  if (node.sourcePaperId) {
    const [p] = await db.select().from(papers).where(eq(papers.id, node.sourcePaperId)).limit(1);
    paper = p
      ? {
          id: p.id,
          title: p.title,
          abstract: p.abstract,
          status: p.status,
          category: p.primaryCategory,
          pdfUrl: p.pdfUrl,
        }
      : null;
  }

  const linkedPaperIds = [
    ...new Set(others.filter((n) => n.sourcePaperId).map((n) => n.sourcePaperId!)),
  ];
  const linkedPapers =
    linkedPaperIds.length === 0
      ? []
      : await db.select().from(papers).where(inArray(papers.id, linkedPaperIds));

  const implementations = others
    .filter(
      (n) => n.nodeType === 'technique' || n.nodeType === 'algorithm' || Boolean(n.sourceTopicId)
    )
    .slice(0, 12);

  const projects: string[] = [];
  const notes = topic?.notesMarkdown || node.description || '';
  const projMatch = notes.match(/\*\*Mini Project\*\*: ([^\n]+)/);
  if (projMatch?.[1]) projects.push(projMatch[1]);
  const codeMatch = notes.match(/\*\*Coding Exercise\*\*: ([^\n]+)/);
  if (codeMatch?.[1]) projects.push(codeMatch[1]);

  return {
    node: {
      id: node.id,
      label: node.label,
      nodeType: node.nodeType,
      description: node.description,
      importance: node.importance,
    },
    notes: topic?.notesMarkdown || node.description || 'No notes attached yet.',
    topic: topic
      ? { id: topic.id, title: topic.title, status: topic.status, difficulty: topic.difficulty }
      : null,
    paper,
    papers: linkedPapers.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      category: p.primaryCategory,
    })),
    implementations: implementations.map((n) => ({
      id: n.id,
      label: n.label,
      nodeType: n.nodeType,
    })),
    projects,
    edges: relatedEdges.map((e) => {
      const otherId = e.sourceNodeId === id ? e.targetNodeId : e.sourceNodeId;
      const other = otherById.get(otherId);
      return {
        id: e.id,
        edgeType: e.edgeType,
        direction: e.sourceNodeId === id ? 'out' : 'in',
        other: other ? { id: other.id, label: other.label, nodeType: other.nodeType } : { id: otherId, label: otherId, nodeType: 'concept' },
      };
    }),
  };
}
