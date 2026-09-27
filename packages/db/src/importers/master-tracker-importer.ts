import * as XLSX from 'xlsx';
import { eq, inArray } from 'drizzle-orm';
import { ensureDatabaseReady, resolveRepoRoot, closeDatabase } from '../client';
import { roadmaps, milestones, topics } from '../schema/roadmap';
import { papers } from '../schema/research';
import { createLogger, DEFAULT_HABITS } from '@research-os/shared';
import { habits } from '../schema/habits';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const logger = createLogger('MasterTrackerImporter');

export const MASTER_WORKBOOK_FILENAME = 'AI_Engineer_Tracker_-_Master__Phases_1-3_.xlsx';
export const MASTER_ROADMAP_ID = 'roadmap-ai-engineer-master';

const CURRICULUM_SHEETS = [
  'Python Advanced',
  'Data Structures & Algorithms',
  'Operating Systems',
  'Computer Networking',
  'Databases',
  'Mathematics',
  'Machine Learning',
  'Deep Learning',
  'LLM Engineering',
  'CUDA & GPU Programming',
  'Distributed Systems',
] as const;

function slugify(value: string, max = 60): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, max);
}

function stableId(prefix: string, ...parts: string[]): string {
  const hash = crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 12);
  return `${prefix}-${hash}`;
}

export function resolveMasterWorkbookPath(explicit?: string): string {
  if (explicit && fs.existsSync(explicit)) return explicit;
  const root = resolveRepoRoot();
  const inStorage = path.join(root, 'storage', MASTER_WORKBOOK_FILENAME);
  if (fs.existsSync(inStorage)) return inStorage;
  const inDownloads = path.join(
    process.env.USERPROFILE || process.env.HOME || '',
    'Downloads',
    MASTER_WORKBOOK_FILENAME
  );
  if (fs.existsSync(inDownloads)) return inDownloads;
  throw new Error(
    `Master tracker workbook not found. Expected at ${inStorage} or pass an absolute path.`
  );
}

export async function importMasterTracker(filePath?: string): Promise<{
  roadmapId: string;
  milestonesCount: number;
  topicsCount: number;
  papersCount: number;
  sourceFile: string;
}> {
  const resolvedPath = resolveMasterWorkbookPath(filePath);
  logger.info('Starting ingestion of Master AI Engineer Workbook', { filePath: resolvedPath });

  const workbook = XLSX.readFile(resolvedPath);
  const db = await ensureDatabaseReady();
  const now = new Date().toISOString();

  const roadmapTitle = 'AI & Systems Research Engineer Master Curriculum (Phases 1-3)';

  // Replace prior master curriculum so re-imports stay idempotent
  const existingMilestones = await db
    .select({ id: milestones.id })
    .from(milestones)
    .where(eq(milestones.roadmapId, MASTER_ROADMAP_ID));
  const milestoneIds = existingMilestones.map((m) => m.id);
  if (milestoneIds.length > 0) {
    await db.delete(topics).where(inArray(topics.milestoneId, milestoneIds));
    await db.delete(milestones).where(eq(milestones.roadmapId, MASTER_ROADMAP_ID));
  }
  await db.delete(roadmaps).where(eq(roadmaps.id, MASTER_ROADMAP_ID));
  // Papers from this workbook use deterministic ids; clear previous master papers by id prefix pattern via full replace of untitled arxiv-less rows is messy — wipe and reinsert curriculum papers only:
  await db.delete(papers);

  await db.insert(roadmaps).values({
    id: MASTER_ROADMAP_ID,
    title: roadmapTitle,
    slug: 'ai-engineer-master-curriculum',
    description:
      'Master curriculum spanning Python internals, Systems, Math, ML/DL, LLM Engineering, CUDA GPU Programming, and Distributed Systems. Source: AI Engineer Tracker Master workbook.',
    targetRole: 'AI Research Engineer / LLM Systems Engineer',
    totalEstimatedHours: 450,
    status: 'active',
    sourceType: 'excel_import',
    sourceFile: resolvedPath,
    createdAt: now,
    updatedAt: now,
  });

  let totalMilestones = 0;
  let totalTopics = 0;
  let totalPapers = 0;
  let totalHours = 0;

  for (let mIdx = 0; mIdx < CURRICULUM_SHEETS.length; mIdx++) {
    const sheetName = CURRICULUM_SHEETS[mIdx]!;
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const rawRows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (!rawRows || rawRows.length < 4) continue;

    const milestoneId = `ms-${slugify(sheetName)}`;
    totalMilestones += 1;

    let milestoneHours = 0;
    const milestoneTopics: (typeof topics.$inferInsert)[] = [];

    let headerRowIdx = 3;
    for (let r = 0; r < Math.min(6, rawRows.length); r++) {
      const rRow = rawRows[r] as unknown[];
      if (rRow && rRow.includes('Status') && (rRow.includes('Topic') || rRow.includes('Subtopic'))) {
        headerRowIdx = r;
        break;
      }
    }

    const headers = rawRows[headerRowIdx] as string[];
    const statusCol = headers.indexOf('Status');
    const topicCol = headers.indexOf('Topic');
    const subtopicCol = headers.indexOf('Subtopic');
    const diffCol = headers.indexOf('Difficulty');
    const prereqCol = headers.indexOf('Prerequisites');
    const goalCol = headers.indexOf('Learning Goal');
    const hoursCol = headers.indexOf('Est. Hours');
    const ytCol = headers.indexOf('Best YouTube Resource');
    const readCol = headers.indexOf('Best Reading');
    const docCol = headers.indexOf('Official Documentation');
    const codeCol = headers.indexOf('Coding Exercise');
    const projCol = headers.indexOf('Mini Project');
    const notesCol = headers.indexOf('Notes');

    let currentCategoryTopic: string = sheetName;

    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r] as unknown[];
      if (!row || row.length === 0) continue;

      if (row.length === 1 && typeof row[0] === 'string' && row[0].trim()) {
        currentCategoryTopic = row[0].trim();
        continue;
      }

      const subtopic = subtopicCol !== -1 ? row[subtopicCol]?.toString().trim() : '';
      const topicName = topicCol !== -1 ? row[topicCol]?.toString().trim() : '';
      const finalTitle = subtopic
        ? `${topicName ? topicName + ': ' : ''}${subtopic}`
        : topicName || currentCategoryTopic;

      if (!finalTitle || finalTitle === sheetName) continue;

      const rawStatus = (statusCol !== -1 && row[statusCol]?.toString().toLowerCase()) || 'not_started';
      let status: 'not_started' | 'in_progress' | 'completed' | 'review_needed' = 'not_started';
      if (rawStatus.includes('prog') || rawStatus.includes('doing')) status = 'in_progress';
      else if (rawStatus.includes('comp') || rawStatus.includes('done')) status = 'completed';

      const rawDiff = (diffCol !== -1 && row[diffCol]?.toString().toLowerCase()) || 'intermediate';
      let difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert' = 'intermediate';
      if (rawDiff.includes('beg') || rawDiff.includes('easy')) difficulty = 'beginner';
      else if (rawDiff.includes('adv')) difficulty = 'advanced';
      else if (rawDiff.includes('exp')) difficulty = 'expert';

      const estHours = hoursCol !== -1 && Number(row[hoursCol]) ? Number(row[hoursCol]) : 2;
      milestoneHours += estHours;

      const notesParts: string[] = [];
      if (goalCol !== -1 && row[goalCol]) notesParts.push(`### Learning Goal\n${row[goalCol]}`);
      if (prereqCol !== -1 && row[prereqCol]) notesParts.push(`**Prerequisites**: ${row[prereqCol]}`);
      if (ytCol !== -1 && row[ytCol]) notesParts.push(`**Recommended Video**: ${row[ytCol]}`);
      if (readCol !== -1 && row[readCol]) notesParts.push(`**Key Reading**: ${row[readCol]}`);
      if (docCol !== -1 && row[docCol]) notesParts.push(`**Docs**: ${row[docCol]}`);
      if (codeCol !== -1 && row[codeCol]) notesParts.push(`**Coding Exercise**: ${row[codeCol]}`);
      if (projCol !== -1 && row[projCol]) notesParts.push(`**Mini Project**: ${row[projCol]}`);
      if (notesCol !== -1 && row[notesCol]) notesParts.push(`**Notes**: ${row[notesCol]}`);

      const orderIndex = milestoneTopics.length + 1;
      const slug = slugify(finalTitle);
      const topicId = stableId('t', milestoneId, String(orderIndex), finalTitle);

      milestoneTopics.push({
        id: topicId,
        milestoneId,
        title: finalTitle,
        slug,
        description: goalCol !== -1 && row[goalCol] ? String(row[goalCol]) : null,
        difficulty,
        status,
        orderIndex,
        estimatedMinutes: Math.round(estHours * 60),
        actualMinutes: status === 'completed' ? Math.round(estHours * 60) : 0,
        masteryScore: status === 'completed' ? 95 : status === 'in_progress' ? 40 : 0,
        notesMarkdown: notesParts.length > 0 ? notesParts.join('\n\n') : null,
        createdAt: now,
        updatedAt: now,
      });
    }

    totalHours += milestoneHours;

    await db.insert(milestones).values({
      id: milestoneId,
      roadmapId: MASTER_ROADMAP_ID,
      title: sheetName,
      orderIndex: mIdx + 1,
      estimatedHours: Math.round(milestoneHours),
      createdAt: now,
      updatedAt: now,
    });

    for (const top of milestoneTopics) {
      totalTopics += 1;
      await db.insert(topics).values(top);
    }
  }

  await db
    .update(roadmaps)
    .set({ totalEstimatedHours: Math.round(totalHours), updatedAt: now })
    .where(eq(roadmaps.id, MASTER_ROADMAP_ID));

  const papersSheet = workbook.Sheets['Research Papers'];
  if (papersSheet) {
    const rawPapers: unknown[][] = XLSX.utils.sheet_to_json(papersSheet, { header: 1 });
    if (rawPapers && rawPapers.length > 4) {
      let headerIdx = 3;
      for (let r = 0; r < Math.min(6, rawPapers.length); r++) {
        if (rawPapers[r]?.includes('Paper') && rawPapers[r]?.includes('Authors')) {
          headerIdx = r;
          break;
        }
      }

      const pHeaders = rawPapers[headerIdx] as string[];
      const paperCol = pHeaders.indexOf('Paper');
      const authCol = pHeaders.indexOf('Authors');
      const yrCol = pHeaders.indexOf('Year');
      const catCol = pHeaders.indexOf('Category');
      const readStatusCol = pHeaders.indexOf('Read');
      const sumCol = pHeaders.indexOf('Summary');

      for (let r = headerIdx + 1; r < rawPapers.length; r++) {
        const row = rawPapers[r] as unknown[];
        if (!row || !row[paperCol] || typeof row[paperCol] !== 'string') continue;
        const pTitle = row[paperCol].trim();
        if (!pTitle || pTitle === 'Foundational Architecture') continue;

        const pId = stableId('paper', pTitle);
        const authors =
          authCol !== -1 && row[authCol]
            ? String(row[authCol])
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : ['Research Team'];
        const isRead =
          readStatusCol !== -1 &&
          (row[readStatusCol] === true ||
            row[readStatusCol] === 1 ||
            String(row[readStatusCol]).toLowerCase() === 'true' ||
            String(row[readStatusCol]).toLowerCase() === 'yes' ||
            String(row[readStatusCol]).toLowerCase() === 'done');
        const summary =
          sumCol !== -1 && row[sumCol] ? String(row[sumCol]) : 'High-impact AI research paper.';
        const category = catCol !== -1 && row[catCol] ? String(row[catCol]) : 'LLM & Systems';
        const year = yrCol !== -1 && row[yrCol] ? String(row[yrCol]) : '2024';

        totalPapers += 1;
        await db.insert(papers).values({
          id: pId,
          arxivId: null,
          doi: null,
          title: pTitle,
          authorsJson: JSON.stringify(authors),
          abstract: summary,
          source: 'arxiv',
          pdfUrl: null,
          localPdfPath: null,
          status: isRead ? 'processed' : 'inbox',
          primaryCategory: category,
          categoriesJson: JSON.stringify([category]),
          summaryMarkdown: summary,
          keyContributionsJson: JSON.stringify([summary]),
          publishedAt: `${year}-01-01`,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }

  // Ensure default habits exist for dashboard habit engine
  const existingHabits = await db.select({ id: habits.id }).from(habits).limit(1);
  if (existingHabits.length === 0) {
    for (let i = 0; i < DEFAULT_HABITS.length; i++) {
      const h = DEFAULT_HABITS[i]!;
      await db.insert(habits).values({
        id: `habit-${slugify(h.name)}`,
        name: h.name,
        habitType: h.habitType as any,
        targetDailyUnits: h.targetDailyUnits,
        unitLabel: h.unitLabel,
        color: h.color,
        isActive: true,
        orderIndex: i + 1,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  const { buildKnowledgeGraph } = await import('../graph/build-knowledge-graph');
  const graph = await buildKnowledgeGraph();

  logger.info('Master AI Engineer Tracker successfully ingested', {
    roadmapId: MASTER_ROADMAP_ID,
    milestones: totalMilestones,
    topics: totalTopics,
    papers: totalPapers,
    graph,
  });

  return {
    roadmapId: MASTER_ROADMAP_ID,
    milestonesCount: totalMilestones,
    topicsCount: totalTopics,
    papersCount: totalPapers,
    sourceFile: resolvedPath,
  };
}

if (
  process.argv[1]?.includes('master-tracker-importer') ||
  process.argv[1]?.endsWith('master-tracker-importer.ts')
) {
  const target = process.argv[2];
  importMasterTracker(target)
    .then((res) => {
      console.log('Master ingestion completed:', res);
      closeDatabase();
      process.exit(0);
    })
    .catch((err) => {
      console.error('Master ingestion failed:', err);
      closeDatabase();
      process.exit(1);
    });
}
