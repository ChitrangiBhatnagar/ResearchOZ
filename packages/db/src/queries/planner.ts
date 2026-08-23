import { getActiveRoadmapTree, type CurriculumTopic, type CurriculumMilestone } from './curriculum';

export type EnergyLevel = 'low' | 'medium' | 'high' | 'peak';

export type PlanItem = {
  topic_id: string;
  topic_title: string;
  milestone_title: string;
  recommended_order: number;
  estimated_minutes: number;
  priority: 'must_do' | 'should_do' | 'optional';
  reasoning: string;
};

export type DailyPlan = {
  plan_date: string;
  available_minutes: number;
  target_energy_level: EnergyLevel;
  focus_suggestion: string;
  items: PlanItem[];
};

function difficultyScore(d: CurriculumTopic['difficulty']): number {
  if (d === 'expert') return 4;
  if (d === 'advanced') return 3;
  if (d === 'intermediate') return 2;
  return 1;
}

function energyMinDifficulty(energy: EnergyLevel): number {
  if (energy === 'peak' || energy === 'high') return 2;
  if (energy === 'medium') return 1;
  return 0;
}

function pickTopics(
  milestones: CurriculumMilestone[],
  energy: EnergyLevel,
  budget: number
): PlanItem[] {
  const flat = milestones.flatMap((m) =>
    m.topics
      .filter((t) => t.status !== 'completed')
      .map((t) => ({ topic: t, milestone: m.title }))
  );

  const minDiff = energyMinDifficulty(energy);
  const ranked = flat
    .filter(({ topic }) => difficultyScore(topic.difficulty) >= minDiff || topic.status === 'review_needed')
    .sort((a, b) => {
      if (a.topic.status === 'in_progress' && b.topic.status !== 'in_progress') return -1;
      if (b.topic.status === 'in_progress' && a.topic.status !== 'in_progress') return 1;
      if (a.topic.status === 'review_needed' && b.topic.status !== 'review_needed') return energy === 'low' ? -1 : 1;
      const diff = difficultyScore(b.topic.difficulty) - difficultyScore(a.topic.difficulty);
      if (energy === 'peak' || energy === 'high') return diff;
      if (energy === 'low') return -diff;
      return a.topic.orderIndex - b.topic.orderIndex;
    });

  const items: PlanItem[] = [];
  let remaining = budget;
  let order = 1;

  for (const { topic, milestone } of ranked) {
    if (remaining < 15) break;
    const mins = Math.min(topic.estimatedMinutes || 45, remaining);
    const priority: PlanItem['priority'] =
      order === 1 ? 'must_do' : order === 2 ? 'should_do' : 'optional';
    items.push({
      topic_id: topic.id,
      topic_title: topic.title,
      milestone_title: milestone,
      recommended_order: order,
      estimated_minutes: mins,
      priority,
      reasoning:
        topic.status === 'in_progress'
          ? `Continue in-progress topic matched to ${energy} energy.`
          : topic.status === 'review_needed'
            ? 'Scheduled review — ideal for lower-intensity sessions.'
            : `${topic.difficulty} topic from your master workbook queue.`,
    });
    remaining -= mins;
    order += 1;
    if (items.length >= 4) break;
  }

  return items;
}

export async function generateDailyPlan(options: {
  availableMinutes: number;
  energyLevel: EnergyLevel;
}): Promise<DailyPlan> {
  const roadmap = await getActiveRoadmapTree();
  const milestones = roadmap?.milestones ?? [];
  const items = pickTopics(milestones, options.energyLevel, options.availableMinutes);

  const focusSuggestion =
    options.energyLevel === 'peak'
      ? 'Start with the hardest derivation first while cognitive bandwidth is maximal. Avoid context switching for at least 90 minutes.'
      : options.energyLevel === 'high'
        ? 'Tackle architecture-heavy topics early; reserve lighter reading for the last block.'
        : options.energyLevel === 'medium'
          ? 'Use Pomodoro — 25 min focused study, 5 min break. Review prior notes before new material.'
          : 'Light review and flashcards only — rebuild momentum without deep context switches.';

  return {
    plan_date: new Date().toISOString().slice(0, 10),
    available_minutes: options.availableMinutes,
    target_energy_level: options.energyLevel,
    focus_suggestion: focusSuggestion,
    items,
  };
}
