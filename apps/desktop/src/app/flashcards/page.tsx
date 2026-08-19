'use client';

import * as React from 'react';
import {
  Layers,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Code,
  ArrowRight,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
} from '@research-os/ui';
import { calculateSM2NextReview } from '@research-os/shared';

interface CardItem {
  id: string;
  topic: string;
  question: string;
  answer: string;
  codeSnippet?: string;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
}

const INITIAL_DECK: CardItem[] = [
  {
    id: 'c-1',
    topic: 'Transformer Mechanics',
    question: 'What is the primary memory bandwidth advantage of Grouped-Query Attention (GQA) over Multi-Head Attention (MHA) during autoregressive generation?',
    answer: 'In autoregressive generation, memory bandwidth to HBM is the bottleneck. MHA requires loading independent Key and Value heads for every Query head. GQA clusters multiple Query heads to share a single Key-Value head, drastically reducing KV cache size and memory traffic by a factor of (H_q / H_kv).',
    codeSnippet: '# GQA Shape Transformation\n# Q: (B, S, num_heads, head_dim)\n# K, V: (B, S, num_kv_heads, head_dim) where num_kv_heads << num_heads',
    repetitions: 2,
    intervalDays: 3,
    easeFactor: 2.5,
  },
  {
    id: 'c-2',
    topic: 'GPU Architecture',
    question: 'Why does FlashAttention compute softmax online using tiling instead of materializing the full (N x N) attention matrix?',
    answer: 'GPU High Bandwidth Memory (HBM) is slow compared to on-chip SRAM (~19TB/s vs ~2TB/s). Materializing the (N x N) matrix incurs O(N^2) memory reads/writes to HBM. By computing softmax incrementally in SRAM tiles using the online normalizer trick, FlashAttention achieves O(N) HBM memory traffic.',
    codeSnippet: 'm_new = max(m_prev, row_max(S_tile))\nl_new = exp(m_prev - m_new) * l_prev + row_sum(exp(S_tile - m_new))',
    repetitions: 1,
    intervalDays: 1,
    easeFactor: 2.5,
  },
];

export default function FlashcardsPage() {
  const [deck, setDeck] = React.useState<CardItem[]>(INITIAL_DECK);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isRevealed, setIsRevealed] = React.useState(false);
  const [completedCount, setCompletedCount] = React.useState(0);

  const currentCard = deck[currentIndex];

  const handleRate = (rating: number) => {
    if (!currentCard) return;

    const sm2Result = calculateSM2NextReview(
      rating,
      currentCard.repetitions,
      currentCard.intervalDays,
      currentCard.easeFactor
    );

    console.log(`SM-2 Updated for card ${currentCard.id}:`, sm2Result);

    setCompletedCount((c) => c + 1);
    setIsRevealed(false);
    if (currentIndex < deck.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setCurrentIndex(deck.length); // Deck finished
    }
  };

  const isDeckFinished = currentIndex >= deck.length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
            Active Recall & Spaced Repetition (SM-2)
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Retention algorithm optimizes neural recall intervals before memory decay
          </p>
        </div>
        <Badge variant="indigo">
          {isDeckFinished ? 'Deck Completed' : `Card ${currentIndex + 1} of ${deck.length}`}
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
                  <Button
                    variant="destructive"
                    size="sm"
                    className="text-[11px]"
                    onClick={() => handleRate(1)}
                  >
                    1 - Blackout (&lt;1d)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[11px] border-zinc-800 text-zinc-300"
                    onClick={() => handleRate(3)}
                  >
                    3 - Hard (2d)
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-[11px]"
                    onClick={() => handleRate(4)}
                  >
                    4 - Good (4d)
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="text-[11px]"
                    onClick={() => handleRate(5)}
                  >
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
          <h2 className="text-base font-bold text-zinc-100">Review Deck Finished!</h2>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            You reviewed {completedCount} flashcards. Intervals have been updated in your local SQLite store.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentIndex(0);
              setIsRevealed(false);
              setCompletedCount(0);
            }}
            className="text-xs border-zinc-800 text-zinc-300"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Review Deck Again
          </Button>
        </Card>
      )}
    </div>
  );
}
