'use client';

import * as React from 'react';
import {
  Layers,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
} from '@research-os/ui';

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

export default function FlashcardsPage() {
  const [deck, setDeck] = React.useState<CardItem[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isRevealed, setIsRevealed] = React.useState(false);
  const [completedCount, setCompletedCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
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

  const handleRate = async (rating: number) => {
    if (!currentCard) return;

    await fetch('/api/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId: currentCard.id, rating }),
    });

    setCompletedCount((c) => c + 1);
    setIsRevealed(false);
    if (currentIndex < deck.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setCurrentIndex(deck.length);
    }
  };

  const isDeckFinished = currentIndex >= deck.length;

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">Loading flashcards from database…</div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
            Active Recall & Spaced Repetition (SM-2)
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Due cards from SQLite — ratings persist intervals locally
          </p>
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
        <Badge variant="indigo">
          {isDeckFinished ? 'Deck Completed' : deck.length === 0 ? 'No cards due' : `Card ${currentIndex + 1} of ${deck.length}`}
        </Badge>
      </div>

      {!isDeckFinished && currentCard ? (
        <div className="space-y-4">
          <Card className="p-7 bg-zinc-900/50 border-zinc-800/80 min-h-[260px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60 mb-4">
                <Badge variant="secondary" className="text-[10px]">
                  {currentCard.topic}
                </Badge>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Ease Factor: {currentCard.easeFactor} • Reps: {currentCard.repetitions}
                </span>
              </div>

              <h2 className="text-base font-semibold text-zinc-100 leading-snug">
                {currentCard.question}
              </h2>

              {isRevealed && (
                <div className="mt-5 pt-4 border-t border-zinc-800/60 space-y-3 animate-in fade-in-50 duration-200">
                  <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                    {currentCard.answer}
                  </p>

                  {currentCard.codeSnippet && (
                    <div className="rounded-lg bg-zinc-950 p-3 font-mono text-[11px] text-emerald-400 border border-zinc-800/80 overflow-x-auto">
                      <pre>{currentCard.codeSnippet}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-6">
              {!isRevealed ? (
                <Button
                  variant="primary"
                  className="w-full h-9 text-xs font-semibold"
                  onClick={() => setIsRevealed(true)}
                >
                  Reveal Answer & Code (Space)
                </Button>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  <Button variant="destructive" size="sm" className="text-[11px]" onClick={() => void handleRate(1)}>
                    1 - Blackout (&lt;1d)
                  </Button>
                  <Button variant="outline" size="sm" className="text-[11px] border-zinc-800 text-zinc-300" onClick={() => void handleRate(3)}>
                    3 - Hard (2d)
                  </Button>
                  <Button variant="secondary" size="sm" className="text-[11px]" onClick={() => void handleRate(4)}>
                    4 - Good (4d)
                  </Button>
                  <Button variant="primary" size="sm" className="text-[11px]" onClick={() => void handleRate(5)}>
                    5 - Perfect (6d)
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-8 text-center space-y-4 bg-zinc-900/40 border-zinc-800">
          <div className="w-12 h-12 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-zinc-100">
            {deck.length === 0 ? 'No Flashcards Due' : 'Review Deck Finished!'}
          </h2>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {deck.length === 0
              ? 'Fetch papers from the Research Hub or run db seed to generate cards.'
              : `You reviewed ${completedCount} flashcards. Intervals updated in SQLite.`}
          </p>
          <Button variant="outline" size="sm" onClick={() => void load()} className="text-xs border-zinc-800 text-zinc-300">
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            {deck.length === 0 ? 'Reload Deck' : 'Review Again'}
          </Button>
        </Card>
      )}
    </div>
  );
}
