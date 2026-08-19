import { SM2_DEFAULTS } from './constants';
import type { HeatmapDay } from '@research-os/types';

export function formatDateToYYYYMMDD(date: Date = new Date()): string {
  return date.toISOString().split('T')[0]!;
}

export function calculateSM2NextReview(
  rating: number, // 0 to 5
  currentRepetitions: number,
  currentIntervalDays: number,
  currentEaseFactor: number
): {
  repetitionNumber: number;
  intervalDays: number;
  easeFactor: number;
  dueAt: string;
} {
  let repetitionNumber = currentRepetitions;
  let intervalDays = currentIntervalDays;
  let easeFactor = currentEaseFactor;

  if (rating >= 3) {
    if (repetitionNumber === 0) {
      intervalDays = SM2_DEFAULTS.INITIAL_INTERVAL_DAYS;
    } else if (repetitionNumber === 1) {
      intervalDays = SM2_DEFAULTS.SECOND_INTERVAL_DAYS;
    } else {
      intervalDays = Math.round(currentIntervalDays * currentEaseFactor);
    }
    repetitionNumber += 1;
  } else {
    repetitionNumber = 0;
    intervalDays = 1;
  }

  // SM-2 formula for ease factor
  easeFactor = easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
  if (easeFactor < SM2_DEFAULTS.MINIMUM_EASE_FACTOR) {
    easeFactor = SM2_DEFAULTS.MINIMUM_EASE_FACTOR;
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + intervalDays);

  return {
    repetitionNumber,
    intervalDays,
    easeFactor: Number(easeFactor.toFixed(2)),
    dueAt: dueDate.toISOString(),
  };
}

export function generatePastNDaysHeatmap(
  daysCount: number = 90,
  activityMap: Map<string, { studyMinutes: number; habitsCompleted: number }>
): HeatmapDay[] {
  const result: HeatmapDay[] = [];
  const today = new Date();

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = formatDateToYYYYMMDD(d);

    const activity = activityMap.get(dateStr) || { studyMinutes: 0, habitsCompleted: 0 };
    const totalScore = activity.studyMinutes / 30 + activity.habitsCompleted;

    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (totalScore >= 6) level = 4;
    else if (totalScore >= 4) level = 3;
    else if (totalScore >= 2) level = 2;
    else if (totalScore > 0) level = 1;

    result.push({
      date: dateStr,
      count: activity.habitsCompleted,
      level,
      studyMinutes: activity.studyMinutes,
      habitsCompleted: activity.habitsCompleted,
    });
  }

  return result;
}
