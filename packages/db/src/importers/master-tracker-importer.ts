import * as XLSX from 'xlsx';
import { getDatabase } from '../client.js';
import { roadmaps, milestones, topics } from '../schema/roadmap.js';
import { papers } from '../schema/research.js';
import { habits } from '../schema/habits.js';
import { createLogger, DEFAULT_HABITS } from '@research-os/shared';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const logger = createLogger('MasterTrackerImporter');

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
];

export async function importMasterTracker(filePath: string): Promise<{
  roadmapId: string;
  milestonesCount: number;
  topicsCount: number;
  papersCount: number;
}> {
  logger.info('Starting Ingestion of Master AI Engineer Workbook', { filePath });

  if (!fs.existsSync(filePath)) {
    throw new Error(`Master tracker file does not exist at: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath);
  const db = getDatabase();
  const now = new Date().toISOString();

  const roadmapId = 'roadmap-ai-engineer-master';
  const roadmapTitle = 'AI & Systems Research Engineer Master Curriculum (Phases 1-3)';

  // 1. Create or Replace Master Roadmap
  await db.insert(roadmaps)
    .values({
      id: roadmapId,
      title: roadmapTitle,
      slug: 'ai-engineer-master-curriculum',
      description: 'Master curriculum spanning Python internals, Systems, Math, ML/DL, LLM Engineering, CUDA GPU Programming, and Distributed Systems.',
      targetRole: 'AI Research Engineer / LLM Systems Engineer',
      totalEstimatedHours: 450,
      status: 'active',
      sourceType: 'excel_import',
      sourceFile: filePath,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  let totalMilestones = 0;
  let totalTopics = 0;
  let totalPapers = 0;

  // 2. Parse Subject Sheets
  for (let mIdx = 0; mIdx < CURRICULUM_SHEETS.length; mIdx++) {
    const sheetName = CURRICULUM_SHEETS[mIdx]!;
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (!rawRows || rawRows.length < 4) continue;

    const milestoneId = `ms-${sheetName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    totalMilestones += 1;

    // Estimate hours
    let milestoneHours = 0;
    const milestoneTopics: any[] = [];

    // Header row is index 3 (Status, Topic, Subtopic, Difficulty, Prerequisites, Learning Goal, Est. Hours, ...)
    let headerRowIdx = 3;
    for (let r = 0; r < Math.min(6, rawRows.length); r++) {
      const rRow = rawRows[r];
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

    let currentCategoryTopic = sheetName;

    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      // Check if this is a section header row
      if (row.length === 1 && typeof row[0] === 'string' && row[0].trim()) {
        currentCategoryTopic = row[0].trim();
        continue;
      }

      const subtopic = subtopicCol !== -1 ? row[subtopicCol]?.toString().trim() : '';
      const topicName = topicCol !== -1 ? row[topicCol]?.toString().trim() : '';
      const finalTitle = subtopic ? `${topicName ? topicName + ': ' : ''}${subtopic}` : topicName || currentCategoryTopic;

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

      // Construct rich Markdown study notes
      const notesParts: string[] = [];
      if (goalCol !== -1 && row[goalCol]) notesParts.push(`### Learning Goal\n${row[goalCol]}`);
      if (prereqCol !== -1 && row[prereqCol]) notesParts.push(`**Prerequisites**: ${row[prereqCol]}`);
      if (ytCol !== -1 && row[ytCol]) notesParts.push(`**Recommended Video**: ${row[ytCol]}`);
      if (readCol !== -1 && row[readCol]) notesParts.push(`**Key Reading**: ${row[readCol]}`);
      if (docCol !== -1 && row[docCol]) notesParts.push(`**Docs**: ${row[docCol]}`);
      if (codeCol !== -1 && row[codeCol]) notesParts.push(`**Coding Exercise**: ${row[codeCol]}`);
      if (projCol !== -1 && row[projCol]) notesParts.push(`**Mini Project**: ${row[projCol]}`);
      if (notesCol !== -1 && row[notesCol]) notesParts.push(`**Notes**: ${row[notesCol]}`);

      const topicId = `t-${crypto.randomUUID()}`;
      milestoneTopics.push({
        id: topicId,
        milestoneId,
        title: finalTitle,
        slug: finalTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60),
        description: goalCol !== -1 && row[goalCol] ? String(row[goalCol]) : null,
        difficulty,
        status,
        orderIndex: milestoneTopics.length + 1,
        estimatedMinutes: Math.round(estHours * 60),
        actualMinutes: status === 'completed' ? Math.round(estHours * 60) : 0,
        masteryScore: status === 'completed' ? 95 : 0,
        notesMarkdown: notesParts.length > 0 ? notesParts.join('\n\n') : null,
        createdAt: now,
        updatedAt: now,
      });
    }

    await db.insert(milestones)
      .values({
        id: milestoneId,
        roadmapId,
        title: sheetName,
        orderIndex: mIdx + 1,
        estimatedHours: Math.round(milestoneHours),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    for (const top of milestoneTopics) {
      totalTopics += 1;
      await db.insert(topics)
        .values(top)
        .onConflictDoNothing();
    }
  }

  // 3. Ingest Research Papers Sheet
  const papersSheet = workbook.Sheets['Research Papers'];
  if (papersSheet) {
    const rawPapers: any[][] = XLSX.utils.sheet_to_json(papersSheet, { header: 1 });
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
      const readCol = pHeaders.indexOf('Read');
      const sumCol = pHeaders.indexOf('Summary');

      for (let r = headerIdx + 1; r < rawPapers.length; r++) {
        const row = rawPapers[r];
        if (!row || !row[paperCol] || typeof row[paperCol] !== 'string') continue;
        const pTitle = row[paperCol].trim();
        if (!pTitle || pTitle === 'Foundational Architecture') continue;

        const pId = `paper-${crypto.randomUUID()}`;
        const authors = authCol !== -1 && row[authCol] ? String(row[authCol]).split(',').map((s) => s.trim()) : ['Research Team'];
        const isRead = readCol !== -1 && (row[readCol] === true || row[readCol] === 1 || String(row[readCol]).toLowerCase() === 'true');
        const summary = sumCol !== -1 && row[sumCol] ? String(row[sumCol]) : 'High-impact AI research paper.';
        const category = catCol !== -1 && row[catCol] ? String(row[catCol]) : 'LLM & Systems';
        const year = yrCol !== -1 && row[yrCol] ? String(row[yrCol]) : '2024';

        totalPapers += 1;
        await db.insert(papers)
          .values({
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
          })
          .onConflictDoNothing();
      }
    }
  }

  logger.info('Master AI Engineer Tracker Successfully Ingested', {
    roadmapId,
    milestones: totalMilestones,
    topics: totalTopics,
    papers: totalPapers,
  });

  return {
    roadmapId,
    milestonesCount: totalMilestones,
    topicsCount: totalTopics,
    papersCount: totalPapers,
  };
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('master-tracker-importer.ts')) {
  const target = process.argv[2] || 'C:/Users/Chitrangi/Downloads/AI_Engineer_Tracker_-_Master__Phases_1-3_.xlsx';
  importMasterTracker(target)
    .then((res) => {
      console.log('Master ingestion completed:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Master ingestion failed:', err);
      process.exit(1);
    });
}
