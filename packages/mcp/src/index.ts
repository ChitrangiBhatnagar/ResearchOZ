#!/usr/bin/env node
/**
 * ResearchOS MCP — Cursor-facing "second brain" over local SQLite.
 *
 * Pipeline:
 *   fetch_papers → arXiv ingest → papers table → buildKnowledgeGraph
 *     → knowledge_nodes / knowledge_edges ← curriculum topics
 *   search_second_brain / get_paper_detail / get_concept read that graph.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  getActiveRoadmapTree,
  getPapers,
  getPaperById,
  searchAndIngestPapers,
  getGraphPayload,
  buildKnowledgeGraph,
  getHabitsWeek,
  toggleHabitLog,
  updateTopicStatus,
  generateDailyPlan,
  getActivityHeatmap,
  resolveRepoRoot,
  resolveDatabasePath,
  getPaperDetail,
  updatePaperStatus,
  updatePaperNotes,
  linkPaperToConcept,
  searchSecondBrain,
  resolveConcept,
  getSecondBrainStats,
} from '@research-os/db';

function jsonText(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function text(msg: string) {
  return { content: [{ type: 'text' as const, text: msg }] };
}

async function searchTopics(args: {
  query?: string;
  subject?: string;
  status?: string;
  limit?: number;
}) {
  const roadmap = await getActiveRoadmapTree();
  if (!roadmap) return [];

  const q = args.query?.toLowerCase() ?? '';
  const subject = args.subject?.toLowerCase();
  const status = args.status;
  const limit = args.limit ?? 50;

  const out: Array<{
    id: string;
    title: string;
    subject: string;
    status: string;
    difficulty: string;
  }> = [];

  for (const m of roadmap.milestones) {
    if (subject && !m.title.toLowerCase().includes(subject)) continue;
    for (const t of m.topics) {
      if (status && t.status !== status) continue;
      if (q && !t.title.toLowerCase().includes(q) && !(t.description ?? '').toLowerCase().includes(q)) continue;
      out.push({
        id: t.id,
        title: t.title,
        subject: m.title,
        status: t.status,
        difficulty: t.difficulty,
      });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

const server = new McpServer({
  name: 'researchos',
  version: '0.2.0',
});

// ── Curriculum ──────────────────────────────────────────────────────────────

server.tool('list_subjects', 'List roadmap subject sheets (milestones)', {}, async () => {
  const roadmap = await getActiveRoadmapTree();
  if (!roadmap) return text('No active roadmap found.');
  const subjects = roadmap.milestones.map((m) => ({
    id: m.id,
    title: m.title,
    orderIndex: m.orderIndex,
    totalTopics: m.totalTopics,
    completedTopics: m.completedTopics,
    progressPercent: m.progressPercent,
  }));
  return jsonText({ roadmapId: roadmap.id, roadmapTitle: roadmap.title, subjects });
});

server.tool(
  'get_roadmap',
  'Get full roadmap tree with topics grouped by subject/milestone',
  {
    subject: z.string().optional().describe('Filter to one milestone title (partial match)'),
  },
  async ({ subject }) => {
    const roadmap = await getActiveRoadmapTree();
    if (!roadmap) return text('No active roadmap found.');
    if (!subject) return jsonText(roadmap);
    const filter = subject.toLowerCase();
    return jsonText({
      ...roadmap,
      milestones: roadmap.milestones.filter((m) => m.title.toLowerCase().includes(filter)),
    });
  }
);

server.tool(
  'search_topics',
  'Search curriculum topics by query, subject, or status',
  {
    query: z.string().optional(),
    subject: z.string().optional(),
    status: z.enum(['not_started', 'in_progress', 'completed', 'review_needed']).optional(),
    limit: z.number().int().min(1).max(200).optional(),
  },
  async (args) => jsonText(await searchTopics(args))
);

server.tool(
  'update_topic_status',
  'Cycle or set a curriculum topic status (not_started → in_progress → completed)',
  {
    topicId: z.string(),
    status: z.enum(['not_started', 'in_progress', 'completed', 'review_needed']).optional(),
  },
  async ({ topicId, status }) => {
    const result = await updateTopicStatus(topicId, status);
    if (!result) return text(`Topic not found: ${topicId}`);
    return jsonText(result);
  }
);

// ── Papers → second brain ───────────────────────────────────────────────────

server.tool(
  'list_papers',
  'List papers in the research library (second-brain corpus)',
  {
    limit: z.number().int().min(1).max(500).optional(),
  },
  async ({ limit }) => jsonText(await getPapers(limit ?? 100))
);

server.tool(
  'get_paper',
  'Get a paper by id (basic fields)',
  {
    id: z.string().describe('Paper id'),
  },
  async ({ id }) => {
    const paper = await getPaperById(id);
    if (!paper) return text(`Paper not found: ${id}`);
    return jsonText(paper);
  }
);

server.tool(
  'get_paper_detail',
  'Full paper detail including summary, contributions, and linked second-brain concepts',
  {
    id: z.string().describe('Paper id'),
  },
  async ({ id }) => {
    const detail = await getPaperDetail(id);
    if (!detail) return text(`Paper not found: ${id}`);
    return jsonText(detail);
  }
);

server.tool(
  'fetch_papers',
  'Search arXiv (NVIDIA/HF filters via query) and ingest into SQLite; auto-rebuilds knowledge graph',
  {
    query: z.string().describe('Search query, e.g. "NVIDIA transformer"'),
    source: z
      .enum(['arxiv', 'nvidia', 'huggingface', 'openreview', 'paperswithcode'])
      .optional()
      .describe('Paper source filter (default arxiv)'),
    maxResults: z.number().int().min(1).max(15).optional(),
  },
  async ({ query, source, maxResults }) =>
    jsonText(await searchAndIngestPapers({ query, source, maxResults }))
);

server.tool(
  'update_paper_status',
  'Mark a paper inbox → reading → processed → archived (bumps graph importance)',
  {
    paperId: z.string(),
    status: z.enum(['inbox', 'reading', 'processed', 'archived']),
  },
  async ({ paperId, status }) => {
    const result = await updatePaperStatus(paperId, status);
    if (!result) return text(`Paper not found: ${paperId}`);
    return jsonText(result);
  }
);

server.tool(
  'update_paper_notes',
  'Write or replace second-brain notes / summary markdown for a paper',
  {
    paperId: z.string(),
    notes: z.string().describe('Markdown notes or summary'),
  },
  async ({ paperId, notes }) => {
    const result = await updatePaperNotes(paperId, notes);
    if (!result) return text(`Paper not found: ${paperId}`);
    return jsonText(result);
  }
);

server.tool(
  'link_paper_concept',
  'Manually link a paper to a concept in the knowledge graph (creates concept if label is new)',
  {
    paperId: z.string(),
    conceptId: z.string().optional().describe('Existing knowledge node id'),
    conceptLabel: z.string().optional().describe('Concept label (created if missing)'),
    edgeType: z
      .enum(['cites', 'uses', 'implements', 'improves', 'evaluated_on'])
      .optional()
      .describe('Edge type (default cites)'),
  },
  async ({ paperId, conceptId, conceptLabel, edgeType }) => {
    if (!conceptId && !conceptLabel) return text('Provide conceptId or conceptLabel');
    return jsonText(await linkPaperToConcept({ paperId, conceptId, conceptLabel, edgeType }));
  }
);

// ── Knowledge graph / second brain ──────────────────────────────────────────

server.tool(
  'search_second_brain',
  'Unified keyword search across papers, knowledge-graph concepts, and curriculum topics',
  {
    query: z.string().describe('Search query'),
    limit: z.number().int().min(1).max(50).optional(),
  },
  async ({ query, limit }) => jsonText(await searchSecondBrain(query, limit ?? 20))
);

server.tool('second_brain_stats', 'Counts of papers, graph nodes, edges, papers by status', {}, async () =>
  jsonText(await getSecondBrainStats())
);

server.tool('get_knowledge_graph', 'Get knowledge graph nodes and edges summary (viz subset)', {}, async () =>
  jsonText(await getGraphPayload())
);

server.tool(
  'get_concept',
  'Get concept/node detail: notes, papers, edges, implementations (id or label)',
  {
    id: z.string().describe('Knowledge graph node id or concept label'),
  },
  async ({ id }) => {
    const detail = await resolveConcept(id);
    if (!detail) return text(`Concept not found: ${id}`);
    return jsonText(detail);
  }
);

server.tool('rebuild_graph', 'Rebuild knowledge graph links from curriculum and papers', {}, async () => {
  const result = await buildKnowledgeGraph();
  return jsonText(result);
});

// ── Habits / planner / activity ─────────────────────────────────────────────

server.tool('get_habits', 'Get habits consistency matrix for the current week', {}, async () =>
  jsonText(await getHabitsWeek())
);

server.tool(
  'toggle_habit',
  'Toggle a habit log for a given date (defaults to today)',
  {
    habitId: z.string(),
    date: z.string().optional().describe('ISO date YYYY-MM-DD; defaults to today'),
  },
  async ({ habitId, date }) => {
    const logDate = date ?? new Date().toISOString().slice(0, 10);
    const result = await toggleHabitLog(habitId, logDate);
    return jsonText({ habitId, date: logDate, ...result });
  }
);

server.tool(
  'generate_study_plan',
  'Generate a daily study plan from curriculum based on time budget and energy',
  {
    available_minutes: z.number().int().min(15).max(480).optional(),
    energy_level: z.enum(['low', 'medium', 'high', 'peak']).optional(),
  },
  async ({ available_minutes, energy_level }) =>
    jsonText(
      await generateDailyPlan({
        availableMinutes: available_minutes ?? 120,
        energyLevel: energy_level ?? 'medium',
      })
    )
);

server.tool(
  'get_activity_heatmap',
  'Get 90-day study activity heatmap from sessions and habit logs',
  {
    days: z.number().int().min(7).max(365).optional(),
  },
  async ({ days }) => jsonText(await getActivityHeatmap(days ?? 90))
);

// ── Resources ───────────────────────────────────────────────────────────────

server.resource('roadmap', 'researchos://roadmap', { mimeType: 'application/json' }, async () => {
  const roadmap = await getActiveRoadmapTree();
  return {
    contents: [{ uri: 'researchos://roadmap', mimeType: 'application/json', text: JSON.stringify(roadmap, null, 2) }],
  };
});

server.resource('papers', 'researchos://papers', { mimeType: 'application/json' }, async () => {
  const papers = await getPapers(200);
  return {
    contents: [{ uri: 'researchos://papers', mimeType: 'application/json', text: JSON.stringify(papers, null, 2) }],
  };
});

server.resource('graph', 'researchos://graph', { mimeType: 'application/json' }, async () => {
  const graph = await getGraphPayload();
  return {
    contents: [{ uri: 'researchos://graph', mimeType: 'application/json', text: JSON.stringify(graph, null, 2) }],
  };
});

server.resource('second-brain', 'researchos://second-brain', { mimeType: 'application/json' }, async () => {
  const [stats, graph] = await Promise.all([getSecondBrainStats(), getGraphPayload()]);
  return {
    contents: [
      {
        uri: 'researchos://second-brain',
        mimeType: 'application/json',
        text: JSON.stringify({ stats, graphSummary: { nodes: graph.nodes.length, edges: graph.edges.length } }, null, 2),
      },
    ],
  };
});

async function main() {
  const root = resolveRepoRoot();
  const dbPath = resolveDatabasePath();
  console.error(`ResearchOS MCP v0.2 (second brain) starting (repo: ${root}, db: ${dbPath})`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('ResearchOS MCP fatal error:', err);
  process.exit(1);
});
