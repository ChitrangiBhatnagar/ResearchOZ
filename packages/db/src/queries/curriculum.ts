import { asc, desc, eq, inArray } from 'drizzle-orm';
import { ensureDatabaseReady } from '../client';
import { roadmaps, milestones, topics } from '../schema/roadmap';
import { papers } from '../schema/research';
import { habits, habitLogs } from '../schema/habits';
import { MASTER_ROADMAP_ID } from '../importers/master-tracker-importer';

export type CurriculumTopic = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  status: 'not_started' | 'in_progress' | 'completed' | 'review_needed';
  estimatedMinutes: number;
  actualMinutes: number;
  masteryScore: number;
  notesMarkdown: string | null;
  orderIndex: number;
};

export type CurriculumMilestone = {
  id: string;
  title: string;
  orderIndex: number;
  estimatedHours: number;
  topics: CurriculumTopic[];
  completedTopics: number;
  totalTopics: number;
  progressPercent: number;
};

export type CurriculumRoadmap = {
  id: string;
  title: string;
  description: string | null;
  targetRole: string | null;
  totalEstimatedHours: number;
  sourceFile: string | null;
  milestones: CurriculumMilestone[];
  stats: {
    totalTopics: number;
    completedTopics: number;
    inProgressTopics: number;
    progressPercent: number;
    totalEstimatedMinutes: number;
    actualMinutes: number;
  };
};

export type CurriculumPaper = {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  category: string;
  publishedDate: string;
  status: string;
  arxivId: string | null;
};

export type DashboardPayload = {
  roadmap: CurriculumRoadmap | null;
  nextTopics: CurriculumTopic[];
  papers: {
    total: number;
    processed: number;
    inbox: number;
    recent: CurriculumPaper[];
  };
  habits: Array<{
    id: string;
    name: string;
    habitType: string;
    color: string;
    targetDailyUnits: number;
    unitLabel: string;
    completedToday: boolean;
  }>;
};

function mapTopic(row: typeof topics.$inferSelect): CurriculumTopic {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    difficulty: row.difficulty,
    status: row.status,
    estimatedMinutes: row.estimatedMinutes,
    actualMinutes: row.actualMinutes,
    masteryScore: row.masteryScore,
    notesMarkdown: row.notesMarkdown,
    orderIndex: row.orderIndex,
  };
}

export async function getActiveRoadmapTree(
  roadmapId = MASTER_ROADMAP_ID
): Promise<CurriculumRoadmap | null> {
  const db = await ensureDatabaseReady();

  const [roadmap] = await db.select().from(roadmaps).where(eq(roadmaps.id, roadmapId)).limit(1);
  if (!roadmap) {
    const [fallback] = await db.select().from(roadmaps).where(eq(roadmaps.status, 'active')).limit(1);
    if (!fallback) return null;
    return getActiveRoadmapTree(fallback.id);
  }

  const milestoneRows = await db
    .select()
    .from(milestones)
    .where(eq(milestones.roadmapId, roadmap.id))
    .orderBy(asc(milestones.orderIndex));

  const topicRows =
    milestoneRows.length === 0
      ? []
      : await db
          .select()
          .from(topics)
          .where(
            inArray(
              topics.milestoneId,
              milestoneRows.map((m) => m.id)
            )
          )
          .orderBy(asc(topics.orderIndex));

  const allTopics = topicRows;

  const topicsByMilestone = new Map<string, CurriculumTopic[]>();
  for (const t of allTopics) {
    const list = topicsByMilestone.get(t.milestoneId) || [];
    list.push(mapTopic(t));
    topicsByMilestone.set(t.milestoneId, list);
  }

  const mappedMilestones: CurriculumMilestone[] = milestoneRows.map((m) => {
    const msTopics = topicsByMilestone.get(m.id) || [];
    const completedTopics = msTopics.filter((t) => t.status === 'completed').length;
    const totalTopics = msTopics.length;
    return {
      id: m.id,
      title: m.title,
      orderIndex: m.orderIndex,
      estimatedHours: m.estimatedHours,
      topics: msTopics,
      completedTopics,
      totalTopics,
      progressPercent: totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100),
    };
  });

  const flatTopics = mappedMilestones.flatMap((m) => m.topics);
  const completedTopics = flatTopics.filter((t) => t.status === 'completed').length;
  const inProgressTopics = flatTopics.filter((t) => t.status === 'in_progress').length;
  const totalTopics = flatTopics.length;
  const totalEstimatedMinutes = flatTopics.reduce((s, t) => s + t.estimatedMinutes, 0);
  const actualMinutes = flatTopics.reduce((s, t) => s + t.actualMinutes, 0);

  return {
    id: roadmap.id,
    title: roadmap.title,
    description: roadmap.description,
    targetRole: roadmap.targetRole,
    totalEstimatedHours: roadmap.totalEstimatedHours,
    sourceFile: roadmap.sourceFile,
    milestones: mappedMilestones,
    stats: {
      totalTopics,
      completedTopics,
      inProgressTopics,
      progressPercent: totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100),
      totalEstimatedMinutes,
      actualMinutes,
    },
  };
}

export async function getPaperById(id: string): Promise<CurriculumPaper | null> {
  const db = await ensureDatabaseReady();
  const [p] = await db.select().from(papers).where(eq(papers.id, id)).limit(1);
  if (!p) return null;
  let authors: string[] = [];
  try {
    authors = JSON.parse(p.authorsJson || '[]');
  } catch {
    authors = [];
  }
  return {
    id: p.id,
    title: p.title,
    authors,
    abstract: p.abstract,
    category: p.primaryCategory || 'General',
    publishedDate: p.publishedAt || '',
    status: p.status,
    arxivId: p.arxivId,
  };
}

export async function getPapers(limit = 100): Promise<CurriculumPaper[]> {
  const db = await ensureDatabaseReady();
  const rows = await db.select().from(papers).orderBy(desc(papers.updatedAt)).limit(limit);

  return rows.map((p) => {
    let authors: string[] = [];
    try {
      authors = JSON.parse(p.authorsJson || '[]');
    } catch {
      authors = [];
    }
    return {
      id: p.id,
      title: p.title,
      authors,
      abstract: p.abstract,
      category: p.primaryCategory || 'General',
      publishedDate: p.publishedAt || '',
      status: p.status,
      arxivId: p.arxivId,
    };
  });
}

export async function getPaperStats(): Promise<{ total: number; processed: number; inbox: number }> {
  const db = await ensureDatabaseReady();
  const rows = await db.select({ status: papers.status }).from(papers);
  return {
    total: rows.length,
    processed: rows.filter((p) => p.status === 'processed').length,
    inbox: rows.filter((p) => p.status === 'inbox').length,
  };
}

export async function getDashboardData(): Promise<DashboardPayload> {
  const db = await ensureDatabaseReady();
  const roadmap = await getActiveRoadmapTree();
  const paperStats = await getPaperStats();
  const paperRows = await getPapers(8);

  const nextTopics =
    roadmap?.milestones
      .flatMap((m) =>
        m.topics.map((t) => ({
          ...t,
          // keep milestone title in description if empty for UI subtitle
          description: t.description || m.title,
        }))
      )
      .filter((t) => t.status === 'in_progress' || t.status === 'not_started')
      .sort((a, b) => {
        if (a.status === b.status) return a.orderIndex - b.orderIndex;
        return a.status === 'in_progress' ? -1 : 1;
      })
      .slice(0, 8) || [];

  const today = new Date().toISOString().slice(0, 10);
  const habitRows = await db.select().from(habits).where(eq(habits.isActive, true)).orderBy(asc(habits.orderIndex));
  const todayLogs = await db.select().from(habitLogs).where(eq(habitLogs.logDate, today));
  const logByHabit = new Map(todayLogs.map((l) => [l.habitId, l]));

  return {
    roadmap,
    nextTopics,
    papers: {
      total: paperStats.total,
      processed: paperStats.processed,
      inbox: paperStats.inbox,
      recent: paperRows.slice(0, 5),
    },
    habits: habitRows.map((h) => ({
      id: h.id,
      name: h.name,
      habitType: h.habitType,
      color: h.color,
      targetDailyUnits: h.targetDailyUnits,
      unitLabel: h.unitLabel,
      completedToday: Boolean(logByHabit.get(h.id)?.completed),
    })),
  };
}
