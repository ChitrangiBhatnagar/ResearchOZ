export type FlashcardState = 'new' | 'learning' | 'review' | 'relearning';

export interface Flashcard {
  id: string;
  topicId: string | null;
  paperId: string | null;
  question: string;
  answer: string;
  codeSnippet: string | null;
  state: FlashcardState;
  easeFactor: number; // default 2.5 in SM-2
  intervalDays: number; // interval before next review
  repetitionNumber: number;
  dueAt: string; // ISO date string
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FlashcardReview {
  id: string;
  flashcardId: string;
  rating: number; // 0 (blackout) to 5 (perfect)
  reviewedAt: string;
  durationMs: number;
}

export type QuizQuestionType = 'multiple_choice' | 'conceptual_explanation' | 'code_snippet_analysis';

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  codeContext?: string;
}

export interface Quiz {
  id: string;
  topicId: string | null;
  title: string;
  questions: QuizQuestion[];
  generatedByModel: string;
  createdAt: string;
}

export interface DailyPlanItem {
  id: string;
  topicId: string;
  topicTitle: string;
  milestoneTitle: string;
  recommendedOrder: number;
  estimatedMinutes: number;
  priority: 'must_do' | 'should_do' | 'optional';
  reasoning: string;
  completed: boolean;
}

export interface DailyStudyPlan {
  id: string;
  planDate: string; // YYYY-MM-DD
  availableMinutes: number;
  targetEnergyLevel: 'low' | 'medium' | 'high' | 'peak';
  focusSuggestion: string;
  items: DailyPlanItem[];
  generatedAt: string;
}

export interface AIBrief {
  id: string;
  headline: string;
  summary: string;
  keyActionItem: string;
  dueRevisionCount: number;
  suggestedPaperId: string | null;
  suggestedPaperTitle: string | null;
  confidenceScore: number;
  generatedAt: string;
}
