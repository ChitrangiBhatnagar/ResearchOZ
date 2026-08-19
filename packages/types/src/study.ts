export type SessionType = 'deep_work' | 'reading' | 'coding' | 'revision' | 'quiz';
export type EnergyLevel = 'low' | 'medium' | 'high' | 'peak';

export interface StudySession {
  id: string;
  topicId: string | null;
  sessionType: SessionType;
  durationMinutes: number;
  energyLevel: EnergyLevel;
  focusScore: number; // 1-10
  notes: string | null;
  startedAt: string;
  endedAt: string;
  createdAt: string;
}

export type HabitType =
  | 'study'
  | 'coding'
  | 'paper'
  | 'revision'
  | 'sleep'
  | 'exercise'
  | 'meditation';

export interface Habit {
  id: string;
  name: string;
  habitType: HabitType;
  description: string | null;
  targetDailyUnits: number; // e.g. minutes, count, or hours
  unitLabel: string; // e.g. "mins", "papers", "hrs"
  color: string;
  isActive: boolean;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  logDate: string; // YYYY-MM-DD
  completed: boolean;
  value: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  studyMinutes: number;
  habitsCompleted: number;
}

export interface DashboardMetrics {
  totalStudyMinutesAllTime: number;
  totalStudyMinutesThisWeek: number;
  currentStreakDays: number;
  longestStreakDays: number;
  papersReadCount: number;
  revisionQueueCount: number;
  activeRoadmapProgressPercentage: number;
  activeRoadmapTitle: string | null;
  completedTopicsCount: number;
  totalTopicsCount: number;
}
