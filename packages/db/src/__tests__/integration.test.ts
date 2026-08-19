import * as XLSX from 'xlsx';
import path from 'node:path';
import fs from 'node:fs';
import { getDatabase, closeDatabase } from '../client.js';
import { roadmaps, milestones, topics } from '../schema/roadmap.js';
import { habits, habitLogs } from '../schema/habits.js';
import { flashcards } from '../schema/flashcards.js';
import { knowledgeNodes } from '../schema/graph.js';
import { importRoadmapFromExcel } from '../importers/excel-importer.js';
import { calculateSM2NextReview, createLogger } from '@research-os/shared';
import { eq } from 'drizzle-orm';

const logger = createLogger('IntegrationTest');

async function runTests() {
  logger.info('Starting ResearchOS Automated Integration Tests');
  const db = getDatabase();

  // Test 1: Verify Seeded Data
  const allRoadmaps = await db.select().from(roadmaps);
  console.log(`✓ Roadmaps Count: ${allRoadmaps.length}`);
  if (allRoadmaps.length === 0) throw new Error('Assertion failed: Expected seeded roadmaps');

  const allMilestones = await db.select().from(milestones);
  console.log(`✓ Milestones Count: ${allMilestones.length}`);
  if (allMilestones.length < 4) throw new Error('Assertion failed: Expected at least 4 milestones');

  const allTopics = await db.select().from(topics);
  console.log(`✓ Topics Count: ${allTopics.length}`);
  if (allTopics.length < 16) throw new Error('Assertion failed: Expected at least 16 topics');

  const allHabits = await db.select().from(habits);
  console.log(`✓ Habits Count: ${allHabits.length}`);
  if (allHabits.length < 6) throw new Error('Assertion failed: Expected at least 6 habits');

  const allFlashcards = await db.select().from(flashcards);
  console.log(`✓ Flashcards Count: ${allFlashcards.length}`);
  if (allFlashcards.length === 0) throw new Error('Assertion failed: Expected flashcards');

  const allNodes = await db.select().from(knowledgeNodes);
  console.log(`✓ Knowledge Graph Nodes Count: ${allNodes.length}`);
  if (allNodes.length === 0) throw new Error('Assertion failed: Expected knowledge nodes');

  // Test 2: SM-2 Spaced Repetition Logic
  const sm2Initial = calculateSM2NextReview(5, 0, 0, 2.5);
  console.log('✓ SM-2 Perfect Rating Calculation:', sm2Initial);
  if (sm2Initial.intervalDays !== 1 || sm2Initial.repetitionNumber !== 1) {
    throw new Error('Assertion failed: SM-2 initial interval mismatch');
  }

  const sm2Second = calculateSM2NextReview(4, 1, 1, 2.6);
  console.log('✓ SM-2 Second Review Calculation:', sm2Second);
  if (sm2Second.intervalDays !== 6 || sm2Second.repetitionNumber !== 2) {
    throw new Error('Assertion failed: SM-2 second interval mismatch');
  }

  // Test 3: Programmatic Excel Creation & Ingestion Test
  const testExcelPath = path.resolve(process.cwd(), 'storage/test_curriculum.xlsx');
  const wb = XLSX.utils.book_new();
  const testData = [
    {
      Module: 'CUDA Optimization',
      Topic: 'Warp-Level Primitives & Shuffle Instructions',
      'Estimated Hours': 4,
      Difficulty: 'Expert',
      Status: 'In Progress',
      Notes: '__shfl_sync and warp voting functions',
    },
    {
      Module: 'CUDA Optimization',
      Topic: 'Asynchronous Memory Copies with TMA on Hopper',
      'Estimated Hours': 6,
      Difficulty: 'Expert',
      Status: 'Not Started',
      Notes: 'Tensor Memory Accelerator hardware features',
    },
    {
      Module: 'Quantization & Sparsity',
      Topic: 'FP8 and INT4 Weight-Only vs KV Quantization',
      'Estimated Hours': 3,
      Difficulty: 'Advanced',
      Status: 'Completed',
      Notes: 'AWQ, SmoothQuant and FP8 E4M3/E5M2 formats',
    },
  ];
  const ws = XLSX.utils.json_to_sheet(testData);
  XLSX.utils.book_append_sheet(wb, ws, 'Curriculum');
  XLSX.writeFile(wb, testExcelPath);

  logger.info('Generated test Excel spreadsheet', { testExcelPath });

  const importResult = await importRoadmapFromExcel(
    testExcelPath,
    'GPU Kernel & Quantization Masterclass',
    'CUDA Performance Engineer'
  );

  console.log('✓ Excel Roadmap Ingestion Result:', importResult);
  if (importResult.topicsCreated !== 3 || importResult.milestonesCreated !== 2) {
    throw new Error('Assertion failed: Excel importer count mismatch');
  }

  const importedRoadmap = await db
    .select()
    .from(roadmaps)
    .where(eq(roadmaps.id, importResult.roadmapId));
  if (importedRoadmap.length === 0) {
    throw new Error('Assertion failed: Imported roadmap not found in DB');
  }
  console.log('✓ Imported Roadmap Database Record:', importedRoadmap[0]?.title);

  // Cleanup test spreadsheet
  if (fs.existsSync(testExcelPath)) {
    fs.unlinkSync(testExcelPath);
  }

  logger.info('All Integration Tests Passed Successfully!');
  closeDatabase();
}

runTests().catch((err) => {
  console.error('Integration test failed:', err);
  process.exit(1);
});
