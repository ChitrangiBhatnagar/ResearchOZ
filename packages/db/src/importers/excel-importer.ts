import * as XLSX from 'xlsx';
import { getDatabase } from '../client';
import { roadmaps, milestones, topics } from '../schema/roadmap';
import { createLogger } from '@research-os/shared';
import crypto from 'node:crypto';

const logger = createLogger('ExcelImporter');

export interface ExcelImportResult {
  roadmapId: string;
  roadmapTitle: string;
  milestonesCreated: number;
  topicsCreated: number;
  totalEstimatedHours: number;
}

interface RawExcelRow {
  Milestone?: string;
  Module?: string;
  Phase?: string;
  Topic?: string;
  Title?: string;
  Concept?: string;
  Description?: string;
  Notes?: string;
  'Estimated Hours'?: number | string;
  Hours?: number | string;
  Duration?: number | string;
  Difficulty?: string;
  Level?: string;
  Status?: string;
}

export async function importRoadmapFromExcel(
  filePath: string,
  roadmapTitleOverride?: string,
  targetRole?: string
): Promise<ExcelImportResult> {
  logger.info('Reading Excel workbook for roadmap ingestion', { filePath });

  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;

  if (sheetNames.length === 0) {
    throw new Error(`Excel file contains no readable sheets: ${filePath}`);
  }

  const db = getDatabase();
  const now = new Date().toISOString();

  // Extract roadmap title
  const fileName = filePath.split(/[/\\]/).pop() || 'Imported Roadmap';
  const inferredTitle =
    roadmapTitleOverride ||
    fileName.replace(/\.(xlsx|xls|csv)$/i, '').replace(/[-_]/g, ' ');

  const roadmapId = crypto.randomUUID();
  const slug = inferredTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `roadmap-${Date.now()}`;

  // Parse sheets into hierarchical milestones & topics
  const milestoneMap = new Map<
    string,
    {
      id: string;
      title: string;
      orderIndex: number;
      estimatedHours: number;
      topics: Array<{
        id: string;
        title: string;
        description: string | null;
        difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
        status: 'not_started' | 'in_progress' | 'completed' | 'review_needed';
        estimatedMinutes: number;
        orderIndex: number;
        notes: string | null;
      }>;
    }
  >();

  let milestoneOrder = 0;
  let totalHours = 0;

  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const rows: RawExcelRow[] = XLSX.utils.sheet_to_json(worksheet);
    if (!rows || rows.length === 0) continue;

    for (const row of rows) {
      const milestoneName = (row.Milestone || row.Module || row.Phase || sheetName).trim();
      const topicName = (row.Topic || row.Title || row.Concept || '').trim();

      if (!topicName) continue; // Skip empty topic rows

      if (!milestoneMap.has(milestoneName)) {
        milestoneOrder += 1;
        milestoneMap.set(milestoneName, {
          id: crypto.randomUUID(),
          title: milestoneName,
          orderIndex: milestoneOrder,
          estimatedHours: 0,
          topics: [],
        });
      }

      const m = milestoneMap.get(milestoneName)!;

      // Parse hours
      const rawHours = row['Estimated Hours'] || row.Hours || row.Duration || 1;
      const hoursNum = Math.max(0.5, Number(rawHours) || 1);
      const estimatedMinutes = Math.round(hoursNum * 60);

      // Parse difficulty
      const rawDiff = (row.Difficulty || row.Level || 'intermediate').toLowerCase();
      let difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert' = 'intermediate';
      if (rawDiff.includes('beg') || rawDiff.includes('easy')) difficulty = 'beginner';
      else if (rawDiff.includes('adv')) difficulty = 'advanced';
      else if (rawDiff.includes('exp')) difficulty = 'expert';

      // Parse status
      const rawStatus = (row.Status || 'not_started').toLowerCase().replace(/\s+/g, '_');
      let status: 'not_started' | 'in_progress' | 'completed' | 'review_needed' = 'not_started';
      if (rawStatus.includes('prog') || rawStatus.includes('doing')) status = 'in_progress';
      else if (rawStatus.includes('comp') || rawStatus.includes('done')) status = 'completed';
      else if (rawStatus.includes('rev')) status = 'review_needed';

      const topicId = crypto.randomUUID();
      const notes = (row.Notes || row.Description || null)?.toString() || null;

      m.topics.push({
        id: topicId,
        title: topicName,
        description: notes,
        difficulty,
        status,
        estimatedMinutes,
        orderIndex: m.topics.length + 1,
        notes,
      });

      m.estimatedHours += hoursNum;
      totalHours += hoursNum;
    }
  }

  let totalTopics = 0;
  let totalMilestones = 0;

  // Insert roadmap
  await db.insert(roadmaps)
    .values({
      id: roadmapId,
      title: inferredTitle,
      slug,
      description: `Imported curriculum from ${fileName}`,
      targetRole: targetRole || 'AI / Research Engineer',
      totalEstimatedHours: Math.round(totalHours),
      status: 'active',
      sourceType: 'excel_import',
      sourceFile: filePath,
      createdAt: now,
      updatedAt: now,
    });

  for (const [, milestoneData] of milestoneMap) {
    totalMilestones += 1;
    await db.insert(milestones)
      .values({
        id: milestoneData.id,
        roadmapId,
        title: milestoneData.title,
        orderIndex: milestoneData.orderIndex,
        estimatedHours: Math.round(milestoneData.estimatedHours),
        createdAt: now,
        updatedAt: now,
      });

    for (const t of milestoneData.topics) {
      totalTopics += 1;
      const topicSlug = t.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `topic-${t.orderIndex}`;

      await db.insert(topics)
        .values({
          id: t.id,
          milestoneId: milestoneData.id,
          title: t.title,
          slug: topicSlug,
          description: t.description,
          difficulty: t.difficulty,
          status: t.status,
          orderIndex: t.orderIndex,
          estimatedMinutes: t.estimatedMinutes,
          actualMinutes: 0,
          masteryScore: t.status === 'completed' ? 100 : 0,
          notesMarkdown: t.notes,
          createdAt: now,
          updatedAt: now,
        });
    }
  }

  logger.info('Successfully imported Excel roadmap', {
    roadmapId,
    milestones: totalMilestones,
    topics: totalTopics,
    totalHours: Math.round(totalHours),
  });

  return {
    roadmapId,
    roadmapTitle: inferredTitle,
    milestonesCreated: totalMilestones,
    topicsCreated: totalTopics,
    totalEstimatedHours: Math.round(totalHours),
  };
}
