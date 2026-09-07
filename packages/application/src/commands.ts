import {
  buildKnowledgeGraph,
  linkPaperToConcept,
  searchAndIngestPapers,
  toggleHabitLog,
  updatePaperNotes,
  updatePaperStatus,
} from '@research-os/db';
import type { PaperSource, PaperStatus, TopicStatus } from '@research-os/db';
import { publishEvent } from './events';
import { updateTopicStatusInDb } from './topic-service';

export async function updateTopicStatusCommand(input: { topicId: string; status?: TopicStatus }) {
  const result = await updateTopicStatusInDb(input.topicId, input.status);
  if (result) {
    await publishEvent({
      type: 'topic.updated',
      aggregateId: result.id,
      changedFields: ['status', 'actualMinutes', 'lastStudiedAt', 'masteryScore'],
      payload: { status: result.status },
    });
  }
  return result;
}

export async function toggleHabit(input: { habitId: string; date: string }) {
  const result = await toggleHabitLog(input.habitId, input.date);
  await publishEvent({
    type: 'habit.updated',
    aggregateId: input.habitId,
    changedFields: ['completed', 'value'],
    payload: { date: input.date, completed: result.completed },
  });
  return result;
}

export async function updatePaperStatusCommand(input: { paperId: string; status: PaperStatus }) {
  const result = await updatePaperStatus(input.paperId, input.status);
  if (result) {
    await publishEvent({
      type: 'paper.updated',
      aggregateId: result.id,
      changedFields: ['status'],
      payload: { status: result.status },
    });
  }
  return result;
}

export async function updatePaperNotesCommand(input: { paperId: string; notes: string }) {
  const result = await updatePaperNotes(input.paperId, input.notes);
  if (result) {
    await publishEvent({
      type: 'paper.updated',
      aggregateId: result.id,
      changedFields: ['summaryMarkdown'],
    });
  }
  return result;
}

export async function linkPaperConceptCommand(input: Parameters<typeof linkPaperToConcept>[0]) {
  const result = await linkPaperToConcept(input);
  if (result.ok) {
    await publishEvent({
      type: 'graph.updated',
      aggregateId: input.paperId,
      changedFields: ['nodes', 'edges'],
      payload: { edgeId: result.edgeId },
    });
  }
  return result;
}

export async function rebuildGraphCommand() {
  const result = await buildKnowledgeGraph();
  await publishEvent({
    type: 'graph.updated',
    changedFields: ['nodes', 'edges'],
    payload: result,
  });
  return result;
}

export async function fetchPapersCommand(input: {
  query: string;
  source?: PaperSource;
  maxResults?: number;
}) {
  const result = await searchAndIngestPapers(input);
  await publishEvent({
    type: 'research.imported',
    changedFields: ['papers', 'flashcards', 'nodes', 'edges'],
    payload: { imported: result.imported, paperIds: result.papers.map((paper) => paper.id) },
  });
  return result;
}
