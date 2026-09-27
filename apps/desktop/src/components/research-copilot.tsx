'use client';

import * as React from 'react';
import {
  Sparkles,
  X,
  Loader2,
  ArrowUp,
  FileText,
  AlertTriangle,
  BookOpen,
  Lightbulb,
  Network,
  History,
  ExternalLink,
} from 'lucide-react';
import { Badge, Button } from '@research-os/ui';
import { cn } from '@/lib/utils';
import type { AskResponse } from '../app/api/research/ask/route';

export type CopilotContext = {
  /** Short human label for what the copilot is scoped to, e.g. "3 selected papers". */
  label: string;
  paperIds: string[];
  topic?: string;
};

type OpenOptions = { question?: string; autoRun?: boolean; context?: CopilotContext };

type CopilotApi = {
  open: boolean;
  openCopilot: (options?: OpenOptions) => void;
  closeCopilot: () => void;
  context: CopilotContext | null;
  setContext: (context: CopilotContext | null) => void;
};

const CopilotCtx = React.createContext<CopilotApi | null>(null);

export function useResearchCopilot(): CopilotApi {
  const ctx = React.useContext(CopilotCtx);
  if (!ctx) throw new Error('useResearchCopilot must be used inside ResearchCopilotProvider');
  return ctx;
}

type Entry = { id: number; question: string; scopeLabel: string; result: AskResponse };

const LIBRARY_PROMPTS = [
  'Find papers related to multimodal RAG',
  'What approaches are commonly used for hallucination reduction?',
  'What research gaps are repeatedly mentioned?',
  'Which papers are most relevant to efficient attention on GPUs?',
];

const SELECTION_PROMPTS = [
  'Compare these papers',
  'What are the limitations mentioned across these papers?',
  'Explain these papers in simpler terms',
  'What methodology do these papers share?',
];

export function ResearchCopilotProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [context, setContextState] = React.useState<CopilotContext | null>(null);
  const [pending, setPending] = React.useState<OpenOptions | null>(null);

  const setContext = React.useCallback((next: CopilotContext | null) => setContextState(next), []);
  const openCopilot = React.useCallback((options?: OpenOptions) => {
    if (options?.context) setContextState(options.context);
    setOpen(true);
    setPending(options ?? {});
  }, []);
  const closeCopilot = React.useCallback(() => setOpen(false), []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'j' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const api = React.useMemo(
    () => ({ open, openCopilot, closeCopilot, context, setContext }),
    [open, openCopilot, closeCopilot, context, setContext]
  );

  return (
    <CopilotCtx.Provider value={api}>
      {children}
      <CopilotPanel
        open={open}
        onClose={closeCopilot}
        context={context}
        pending={pending}
        onPendingHandled={() => setPending(null)}
      />
    </CopilotCtx.Provider>
  );
}

function CopilotPanel({
  open,
  onClose,
  context,
  pending,
  onPendingHandled,
}: {
  open: boolean;
  onClose: () => void;
  context: CopilotContext | null;
  pending: OpenOptions | null;
  onPendingHandled: () => void;
}) {
  const [question, setQuestion] = React.useState('');
  const [useScope, setUseScope] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<Entry[]>([]);
  const [activeId, setActiveId] = React.useState<number | null>(null);
  const [highlightRef, setHighlightRef] = React.useState<number | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const scoped = Boolean(context && context.paperIds.length > 0 && useScope);
  const active = history.find((h) => h.id === activeId) ?? null;

  React.useEffect(() => {
    setUseScope(true);
  }, [context?.label]);

  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const ask = React.useCallback(
    async (q: string, scopeOverride?: CopilotContext) => {
      const trimmed = q.trim();
      if (!trimmed || loading) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      setHighlightRef(null);
      const scope = scopeOverride ?? (scoped ? context : null);
      const scopeLabel = scope ? scope.label : 'Whole library';
      try {
        const res = await fetch('/api/research/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: trimmed,
            paperIds: scope ? scope.paperIds : [],
            contextLabel: scope ? scope.label : context?.topic ?? null,
          }),
          signal: controller.signal,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'The research query failed');
        const entry: Entry = { id: Date.now(), question: trimmed, scopeLabel, result: json as AskResponse };
        setHistory((prev) => [entry, ...prev].slice(0, 8));
        setActiveId(entry.id);
        setQuestion('');
        bodyRef.current?.scrollTo({ top: 0 });
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (abortRef.current === controller) setLoading(false);
      }
    },
    [context, loading, scoped]
  );

  React.useEffect(() => {
    if (!open || !pending) return;
    if (pending.question) {
      setQuestion(pending.question);
      if (pending.autoRun) void ask(pending.question, pending.context);
    }
    onPendingHandled();
  }, [open, pending, ask, onPendingHandled]);

  const focusSource = (ref: number) => {
    setHighlightRef(ref);
    document.getElementById(`copilot-source-${ref}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const prompts = scoped ? SELECTION_PROMPTS : LIBRARY_PROMPTS;

  return (
    <aside
      aria-label="Research copilot"
      aria-hidden={!open}
      inert={!open}
      className={cn(
        'fixed top-3 bottom-3 right-3 z-50 w-[min(440px,calc(100vw-1.5rem))] flex flex-col rounded-2xl border border-border bg-card text-card-foreground shadow-2xl transition-all duration-200 select-text',
        open ? 'translate-x-0 opacity-100' : 'translate-x-[110%] opacity-0 pointer-events-none'
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/70">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-tight">Research Copilot</h2>
            <p className="text-[10px] text-muted-foreground">Answers grounded in your research library</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Close copilot">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="px-4 pt-3 pb-3 border-b border-border/70 space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>Scope:</span>
          {context && context.paperIds.length > 0 ? (
            <div className="flex items-center gap-1 rounded-md border border-border bg-muted/50 p-0.5">
              <button
                type="button"
                onClick={() => setUseScope(true)}
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] transition-colors max-w-[13rem] truncate',
                  useScope ? 'bg-card text-foreground shadow-sm' : 'hover:text-foreground'
                )}
                title={context.label}
              >
                {context.label}
              </button>
              <button
                type="button"
                onClick={() => setUseScope(false)}
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] transition-colors',
                  !useScope ? 'bg-card text-foreground shadow-sm' : 'hover:text-foreground'
                )}
              >
                Whole library
              </button>
            </div>
          ) : (
            <span className="text-foreground/80">Whole library</span>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(question);
          }}
          className="relative"
        >
          <textarea
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void ask(question);
              }
            }}
            rows={2}
            maxLength={1000}
            placeholder={scoped ? 'Ask about the papers in scope…' : 'Ask a question about your research…'}
            className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 pr-11 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-ring/60"
          />
          <Button
            type="submit"
            variant="primary"
            size="icon"
            className="absolute right-2 bottom-2.5 h-7 w-7"
            disabled={loading || !question.trim()}
            aria-label="Ask"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUp className="w-3.5 h-3.5" />}
          </Button>
        </form>
        <p className="text-[10px] text-muted-foreground">Enter to ask · Shift+Enter for a new line · Ctrl+J to toggle</p>
      </div>

      <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
        {loading && (
          <div className="rounded-xl border border-border/70 bg-muted/40 p-3 flex items-start gap-2.5">
            <Loader2 className="w-4 h-4 animate-spin text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium">Searching your library and drafting an explanation…</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Local models can take up to a minute on longer questions.
              </p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p>{error}</p>
              <button
                type="button"
                className="underline underline-offset-2 text-[11px]"
                onClick={() => void ask(question || history[0]?.question || '')}
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {!active && !loading && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Lightbulb className="w-3 h-3" /> Try asking
            </p>
            <div className="space-y-1.5">
              {prompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => void ask(p)}
                  className="w-full text-left text-xs rounded-lg border border-border/70 bg-background px-3 py-2 text-foreground/90 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {active && !loading && (
          <ResearchBrief entry={active} highlightRef={highlightRef} onCite={focusSource} onAsk={(q) => void ask(q)} />
        )}

        {history.length > 1 && !loading && (
          <div className="pt-2 border-t border-border/70 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <History className="w-3 h-3" /> Recent questions
            </p>
            {history
              .filter((h) => h.id !== activeId)
              .map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    setActiveId(h.id);
                    setHighlightRef(null);
                    bodyRef.current?.scrollTo({ top: 0 });
                  }}
                  className="w-full text-left rounded-lg px-2.5 py-1.5 hover:bg-muted/60 transition-colors"
                >
                  <span className="block text-xs truncate">{h.question}</span>
                  <span className="block text-[10px] text-muted-foreground">
                    {h.scopeLabel} · {h.result.sources.length} sources
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function ResearchBrief({
  entry,
  highlightRef,
  onCite,
  onAsk,
}: {
  entry: Entry;
  highlightRef: number | null;
  onCite: (ref: number) => void;
  onAsk: (question: string) => void;
}) {
  const { result } = entry;
  const cited = new Set(result.answer?.citedRefs ?? []);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{entry.scopeLabel}</p>
        <h3 className="text-sm font-semibold mt-0.5 leading-snug">{entry.question}</h3>
      </div>

      {result.notice && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <p>{result.notice}</p>
        </div>
      )}

      {result.answer && (
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary" /> Explanation
            </h4>
            <Badge variant="indigo" className="text-[9px]">
              AI-generated{result.answer.grounded ? ` from ${result.sources.length} sources` : ' · general knowledge'}
            </Badge>
          </div>
          <div className="rounded-xl border border-border/70 bg-background p-3">
            <RichAnswer text={result.answer.text} maxRef={result.sources.length} onCite={onCite} />
          </div>
          {result.answer.grounded && result.answer.citedRefs.length === 0 && (
            <p className="text-[10px] text-muted-foreground">
              The model did not cite specific sources — verify claims against the sources below.
            </p>
          )}
        </section>
      )}

      {result.answer?.uncertainty && (
        <section className="rounded-xl border border-border/70 bg-muted/40 p-3 space-y-1">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> What the sources don&apos;t settle
          </h4>
          <p className="text-xs text-foreground/85 leading-relaxed whitespace-pre-wrap">{result.answer.uncertainty}</p>
        </section>
      )}

      <section className="space-y-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <BookOpen className="w-3 h-3" /> Retrieved sources ({result.sources.length})
        </h4>
        {result.sources.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-center space-y-1">
            <p className="text-xs text-foreground/85">Nothing in your library matches this question yet.</p>
            <p className="text-[11px] text-muted-foreground">
              Fetch papers on this topic from the Research Hub, then ask again.
            </p>
          </div>
        ) : (
          <ol className="space-y-2">
            {result.sources.map((s) => (
              <SourceCard
                key={`${s.kind}-${s.id}`}
                source={s}
                cited={cited.has(s.ref)}
                showCitedState={Boolean(result.answer?.grounded)}
                highlighted={highlightRef === s.ref}
                onAsk={onAsk}
              />
            ))}
          </ol>
        )}
        {result.sources.length > 0 && (
          <p className="text-[10px] text-muted-foreground">
            Found by {result.retrieval.semantic ? 'semantic + keyword' : 'keyword'} search
            {result.retrieval.terms.length > 0 && <> on: {result.retrieval.terms.slice(0, 8).join(', ')}</>}
          </p>
        )}
      </section>
    </div>
  );
}

function SourceCard({
  source,
  cited,
  showCitedState,
  highlighted,
  onAsk,
}: {
  source: AskResponse['sources'][number];
  cited: boolean;
  showCitedState: boolean;
  highlighted: boolean;
  onAsk: (question: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const meta = source.paper
    ? [source.paper.authors.slice(0, 3).join(', ') + (source.paper.authors.length > 3 ? ' et al.' : ''), source.paper.year, source.paper.category]
        .filter(Boolean)
        .join(' · ')
    : null;
  const Icon = source.kind === 'paper' ? FileText : source.kind === 'concept' ? Network : BookOpen;

  return (
    <li
      id={`copilot-source-${source.ref}`}
      className={cn(
        'rounded-xl border p-3 transition-colors',
        highlighted ? 'border-primary/60 bg-primary/5' : 'border-border/70 bg-background'
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 inline-flex h-5 min-w-5 px-1 items-center justify-center rounded-md bg-muted text-[10px] font-semibold text-foreground/80 shrink-0">
          {source.ref}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center flex-wrap gap-1">
            <Badge variant="outline" className="text-[9px] gap-1 capitalize">
              <Icon className="w-2.5 h-2.5" />
              {source.kind}
            </Badge>
            {source.origin === 'selected' && (
              <Badge variant="indigo" className="text-[9px]">
                In scope
              </Badge>
            )}
            {showCitedState &&
              (cited ? (
                <Badge variant="success" className="text-[9px]">
                  Cited
                </Badge>
              ) : (
                <span className="text-[9px] text-muted-foreground">Retrieved, not cited</span>
              ))}
          </div>
          <p className="text-xs font-medium leading-snug">{source.title}</p>
          {meta && <p className="text-[10px] text-muted-foreground truncate">{meta}</p>}
          {source.excerpt && (
            <p
              className={cn(
                'text-[11px] text-foreground/75 leading-relaxed whitespace-pre-wrap',
                !expanded && 'line-clamp-3'
              )}
            >
              {source.excerpt}
            </p>
          )}
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 pt-0.5">
            {source.excerpt.length > 220 && (
              <button
                type="button"
                className="text-[10px] text-muted-foreground hover:text-foreground"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
            {source.paper?.pdfUrl && (
              <a
                href={source.paper.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-primary hover:text-primary/80 inline-flex items-center gap-0.5"
              >
                Open PDF <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
            {source.kind === 'paper' && (
              <button
                type="button"
                className="text-[10px] text-primary hover:text-primary/80"
                onClick={() => onAsk(`Explain "${source.title}" in simpler terms`)}
              >
                Explain simply
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function renderInline(text: string, maxRef: number, onCite: (ref: number) => void, keyPrefix: string) {
  const parts = text.split(/(\[\d+\]|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    const cite = part.match(/^\[(\d+)\]$/);
    if (cite) {
      const ref = Number(cite[1]);
      if (ref >= 1 && ref <= maxRef) {
        return (
          <button
            key={key}
            type="button"
            onClick={() => onCite(ref)}
            className="mx-0.5 inline-flex h-4 min-w-4 px-1 items-center justify-center rounded bg-primary/15 text-primary text-[9px] font-semibold align-text-top hover:bg-primary/25"
            title={`Jump to source ${ref}`}
          >
            {ref}
          </button>
        );
      }
      return <span key={key}>{part}</span>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={key} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

function RichAnswer({ text, maxRef, onCite }: { text: string; maxRef: number; onCite: (ref: number) => void }) {
  const blocks: Array<{ type: 'p' | 'ul'; lines: string[] }> = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) {
      blocks.push({ type: 'p', lines: [] });
      continue;
    }
    const bullet = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
    const last = blocks[blocks.length - 1];
    if (bullet) {
      if (last?.type === 'ul') last.lines.push(bullet[1]!);
      else blocks.push({ type: 'ul', lines: [bullet[1]!] });
    } else if (last?.type === 'p' && last.lines.length > 0) {
      last.lines.push(line);
    } else {
      blocks.push({ type: 'p', lines: [line] });
    }
  }

  return (
    <div className="space-y-2 text-xs leading-relaxed text-foreground/90">
      {blocks
        .filter((b) => b.lines.length > 0)
        .map((b, i) =>
          b.type === 'ul' ? (
            <ul key={i} className="list-disc pl-4 space-y-1">
              {b.lines.map((l, j) => (
                <li key={j}>{renderInline(l, maxRef, onCite, `${i}-${j}`)}</li>
              ))}
            </ul>
          ) : (
            <p key={i}>{renderInline(b.lines.join(' '), maxRef, onCite, `${i}`)}</p>
          )
        )}
    </div>
  );
}
