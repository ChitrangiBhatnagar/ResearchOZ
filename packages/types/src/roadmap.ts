export type RoadmapStatus = 'draft' | 'active' | 'completed' | 'archived';
export type TopicStatus = 'not_started' | 'in_progress' | 'completed' | 'review_needed';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface Roadmap {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  targetRole: string | null; // e.g., "AI Research Engineer", "CUDA Kernel Dev"
  totalEstimatedHours: number;
  status: RoadmapStatus;
  sourceType: 'manual' | 'excel_import' | 'ai_generated';
  sourceFile: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  roadmapId: string;
  title: string;
  description: string | null;
  orderIndex: number;
  estimatedHours: number;
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  id: string;
  milestoneId: string;
  title: string;
  slug: string;
  description: string | null;
  difficulty: DifficultyLevel;
  status: TopicStatus;
  orderIndex: number;
  estimatedMinutes: number;
  actualMinutes: number;
  masteryScore: number; // 0 to 100
  lastStudiedAt: string | null;
  notesMarkdown: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TopicPrerequisite {
  topicId: string;
  prerequisiteTopicId: string;
  isRequired: boolean;
}

export interface RoadmapWithHierarchy extends Roadmap {
  milestones: Array<
    Milestone & {
      topics: Topic[];
    }
  >;
  progressPercentage: number;
  completedTopicsCount: number;
  totalTopicsCount: number;
}
