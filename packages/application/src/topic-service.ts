import { getActiveRoadmapTree, updateTopicStatus as updateTopicStatusRepository } from '@research-os/db';
import type { TopicStatus } from '@research-os/db';

export type TopicSearchOptions = {
  query?: string;
  subject?: string;
  status?: TopicStatus;
  limit?: number;
};

export async function searchTopics(options: TopicSearchOptions) {
  const roadmap = await getActiveRoadmapTree();
  if (!roadmap) return [];

  const query = options.query?.toLowerCase() ?? '';
  const subject = options.subject?.toLowerCase();
  const limit = options.limit ?? 50;
  const matches = [];

  for (const milestone of roadmap.milestones) {
    if (subject && !milestone.title.toLowerCase().includes(subject)) continue;
    for (const topic of milestone.topics) {
      if (options.status && topic.status !== options.status) continue;
      if (
        query &&
        !topic.title.toLowerCase().includes(query) &&
        !(topic.description ?? '').toLowerCase().includes(query)
      ) {
        continue;
      }
      matches.push({
        id: topic.id,
        title: topic.title,
        subject: milestone.title,
        status: topic.status,
        difficulty: topic.difficulty,
      });
      if (matches.length >= limit) return matches;
    }
  }

  return matches;
}

export const updateTopicStatusInDb = updateTopicStatusRepository;
