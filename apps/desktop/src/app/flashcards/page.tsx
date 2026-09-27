'use client';

import * as React from 'react';
import Link from 'next/link';
import { RotateCcw, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, Button, Badge } from '@research-os/ui';

interface CardItem {
  id: string;
  topic: string;
  question: string;
  answer: string;
  codeSnippet?: string | null;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
}

const RATINGS = [
  { value: 1, label: '1 - Blackout (<1d)', variant: 'destructive' as const, key: '1' },
  { value: 3, label: '3 - Hard (2d)', variant: 'outline' as const, key: '3' },
  { value: 4, label: '4 - Good (4d)', variant: 'secondary' as const, key: '4' },
  { value: 5, label: '5 - Perfect (6d)', variant: 'primary' as const, key: '5' },
];

export default function FlashcardsPage() {
  const [deck, setDeck] = React.useState<CardItem[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isRevealed, setIsRevealed] = React.useState(false);
  const [completedCount, setCompletedCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [rating, setRating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/flashcards');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load flashcards');
      setDeck(json.cards || []);
      setCurrentIndex(0);
      setIsRevealed(false);
      setCompletedCount(0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const currentCard = deck[currentIndex];

  const handleRate = React.useCallback(
    async (value: number) => {
      if (!currentCard || rating) return;
      setRating(true);
      setError(null);
      try {
        const res = await fetch('/api/flashcards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId: currentCard.id, rating: value }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || 'Could not save your rating');
        }
        setCompletedCount((c) => c + 1);
        setIsRevealed(false);
        setCurrentIndex((i) => i + 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setRating(false);
      }
    },
    [currentCard, rating]
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
      if (e.ctrlKey || e.metaKey || e.altKey || !currentCard) return;
      if (e.code === 'Space' && !isRevealed) {
        e.preventDefault();
        setIsRevealed(true);
        return;
      }
      if (isRevealed) {
        const match = RATINGS.find((r) => r.key === e.key);
        if (match) {
          e.preventDefault();
          void handleRate(match.value);
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [currentCard, isRevealed, handleRate]);

  const isDeckFinished = currentIndex >= deck.length;

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading flashcards…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Active Recall & Spaced Repetition (SM-2)</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Due cards from your library — ratings update review intervals</p>
        </div>
        <Badge variant="indigo">
          {isDeckFinished
            ? deck.length === 0
              ? 'No cards due'
              : 'Deck Completed'
            : `Card ${currentIndex + 1} of ${deck.length}`}
        </Badge>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {!isDeckFinished && currentCard ? (
        <Card className="p-7 min-h-[260px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/70 mb-4 gap-3">
              <Badge variant="secondary" className="text-[10px]">
                {currentCard.topic}
              </Badge>
              <span className="text-[10px] text-muted-foreground font-mono">
                Ease Factor: {currentCard.easeFactor} • Reps: {currentCard.repetitions}
              </span>
            </div>

            <h2 className="text-base font-semibold leading-snug">{currentCard.question}</h2>

            {isRevealed && (
              <div className="mt-5 pt-4 border-t border-border/70 space-y-3 animate-in fade-in-50 duration-200">
                <p className="text-xs text-foreground/85 leading-relaxed whitespace-pre-wrap">{currentCard.answer}</p>

                {currentCard.codeSnippet && (
                  <div className="rounded-lg bg-muted p-3 font-mono text-[11px] text-foreground border border-border/70 overflow-x-auto">
                    <pre>{currentCard.codeSnippet}</pre>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-6">
            {!isRevealed ? (
              <Button variant="primary" size="lg" className="w-full font-semibold" onClick={() => setIsRevealed(true)}>
                Reveal Answer & Code (Space)
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {RATINGS.map((r) => (
                    <Button
                      key={r.value}
                      variant={r.variant}
                      size="sm"
                      className="text-[11px]"
                      onClick={() => void handleRate(r.value)}
                      disabled={rating}
                    >
                      {r.label}
                    </Button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Press 1, 3, 4 or 5 to rate</p>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary border border-primary/25 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold">{deck.length === 0 ? 'No Flashcards Due' : 'Review Deck Finished!'}</h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {deck.length === 0 ? (
              <>
                Fetch papers from the{' '}
                <Link href="/research" className="text-primary hover:text-primary/80">
                  Research Hub
                </Link>{' '}
                to generate new cards.
              </>
            ) : (
              `You reviewed ${completedCount} flashcards. Intervals have been updated.`
            )}
          </p>
          <Button variant="outline" size="sm" onClick={() => void load()} className="text-xs">
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            {deck.length === 0 ? 'Reload Deck' : 'Review Again'}
          </Button>
        </Card>
      )}
    </div>
  );
}
