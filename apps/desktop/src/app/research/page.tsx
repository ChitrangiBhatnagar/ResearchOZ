'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, Download, Sparkles, FileText, RefreshCw, Loader2, Network, Check, X } from 'lucide-react';
import { Card, Button, Badge, Input } from '@research-os/ui';
import { useDomainEvents } from '../../components/domain-event-listener';
import { useResearchCopilot, type CopilotContext } from '../../components/research-copilot';
import { cn } from '@/lib/utils';

interface PaperItem {
  id: string;
  arxivId: string | null;
  title: string;
  authors: string[];
  abstract: string;
  category: string;
  publishedDate: string;
  status: string;
}

const SOURCES = [
  { id: 'arxiv', label: 'arXiv' },
  { id: 'nvidia', label: 'NVIDIA Research' },
  { id: 'huggingface', label: 'Hugging Face' },
  { id: 'openreview', label: 'OpenReview' },
  { id: 'paperswithcode', label: 'PapersWithCode' },
] as const;

type FetchStep = { name: string; status: string; detail?: string };

export default function ResearchPage() {
  const [papers, setPapers] = React.useState<PaperItem[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [fetchQuery, setFetchQuery] = React.useState('NVIDIA Transformer');
  const [source, setSource] = React.useState<(typeof SOURCES)[number]['id']>('nvidia');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [syncing, setSyncing] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [steps, setSteps] = React.useState<FetchStep[]>([]);
  const [lastImport, setLastImport] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const { openCopilot, setContext } = useResearchCopilot();

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/curriculum/papers');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.detail || 'Failed to load papers');
      setPapers(json.papers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  useDomainEvents((event) => {
    if (event.type === 'paper.updated' || event.type === 'research.imported') void load();
  });

  const syncWorkbook = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch('/api/curriculum/import', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.detail || json.error || 'Import failed');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
    }
  };

  const runFetch = async () => {
    setFetching(true);
    setError(null);
    setLastImport(null);
    setSteps([
      { name: `Search ${SOURCES.find((s) => s.id === source)?.label ?? source}`, status: 'running' },
      { name: 'Store locally', status: 'pending' },
      { name: 'Flashcards + graph links', status: 'pending' },
    ]);
    try {
      const res = await fetch('/api/papers/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: fetchQuery, source, maxResults: 8 }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Fetch failed');
      setSteps(json.steps || []);
      setLastImport(`Imported ${json.imported} · skipped ${json.skipped} · ${json.flashcards} flashcards`);
      await load();
    } catch (err) {
      setSteps([]);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setFetching(false);
    }
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredPapers = React.useMemo(
    () =>
      papers.filter(
        (p) =>
          !q ||
          p.title.toLowerCase().includes(q) ||
          p.abstract.toLowerCase().includes(q) ||
          p.authors.some((a) => a.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q)
      ),
    [papers, q]
  );

  const selectedIds = React.useMemo(
    () => papers.filter((p) => selected.has(p.id)).map((p) => p.id),
    [papers, selected]
  );

  const workspaceContext = React.useMemo<CopilotContext | null>(() => {
    if (selectedIds.length > 0) {
      return {
        label: `${selectedIds.length} selected paper${selectedIds.length === 1 ? '' : 's'}`,
        paperIds: selectedIds,
      };
    }
    if (q && filteredPapers.length > 0) {
      return {
        label: `${Math.min(filteredPapers.length, 10)} results for “${searchQuery.trim()}”`,
        paperIds: filteredPapers.slice(0, 10).map((p) => p.id),
        topic: searchQuery.trim(),
      };
    }
    return null;
  }, [selectedIds, q, filteredPapers, searchQuery]);

  React.useEffect(() => {
    setContext(workspaceContext);
  }, [workspaceContext, setContext]);

  React.useEffect(() => () => setContext(null), [setContext]);

  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const askAboutPaper = (paper: PaperItem, question: string) =>
    openCopilot({
      question,
      autoRun: true,
      context: { label: `Paper: ${paper.title.slice(0, 60)}${paper.title.length > 60 ? '…' : ''}`, paperIds: [paper.id] },
    });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">Research Paper Hub</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Personal library · workbook papers + live fetch from arXiv / NVIDIA / HF / OpenReview / PapersWithCode ·{' '}
            {papers.length} stored
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="primary"
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => openCopilot()}
            title="Ask the research copilot (Ctrl+J)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ask AI
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => void syncWorkbook()}
            disabled={syncing}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', syncing && 'animate-spin')} />
            <span>{syncing ? 'Syncing…' : 'Re-sync Excel'}</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-start justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss error" className="shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Fetch new papers</h2>
          {lastImport && <span className="text-[11px] text-muted-foreground">{lastImport}</span>}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Example: “Fetch the latest NVIDIA Transformer papers.” Searches the selected source via arXiv, stores
          metadata + PDF links, writes flashcards, and relinks the knowledge graph.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSource(s.id)}
              aria-pressed={source === s.id}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] border transition-colors',
                source === s.id
                  ? 'border-primary/50 bg-primary/15 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!fetching && fetchQuery.trim()) void runFetch();
          }}
        >
          <Input
            value={fetchQuery}
            onChange={(e) => setFetchQuery(e.target.value)}
            placeholder="NVIDIA Transformer papers"
            className="h-9 text-xs"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="h-9 px-4 text-xs gap-1.5 shrink-0"
            disabled={fetching || !fetchQuery.trim()}
          >
            {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>{fetching ? 'Fetching…' : 'Fetch papers'}</span>
          </Button>
        </form>
        {steps.length > 0 && (
          <ol className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {steps.map((step) => (
              <li
                key={step.name}
                className={cn(
                  'rounded-lg border p-2',
                  step.status === 'error' ? 'border-destructive/40 bg-destructive/10' : 'border-border/70 bg-muted/30'
                )}
              >
                <div
                  className={cn(
                    'text-[10px] uppercase tracking-wider flex items-center gap-1',
                    step.status === 'error' ? 'text-destructive' : 'text-muted-foreground'
                  )}
                >
                  {step.status === 'running' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                  {step.status === 'done' && <Check className="w-2.5 h-2.5 text-primary" />}
                  {step.status}
                </div>
                <div className="text-[11px] font-medium mt-0.5">{step.name}</div>
                {step.detail && <div className="text-[10px] text-muted-foreground mt-0.5">{step.detail}</div>}
              </li>
            ))}
          </ol>
        )}
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter library by title, author, category…"
            className="pl-9 h-9 text-xs"
          />
        </div>
        {workspaceContext && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-muted-foreground">{workspaceContext.label}</span>
            {selectedIds.length > 0 && (
              <Button variant="ghost" size="sm" className="text-[11px]" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-[11px] gap-1 border-primary/40 text-primary hover:bg-primary/10"
              onClick={() => openCopilot({ context: workspaceContext })}
            >
              <Sparkles className="w-3 h-3" />
              {selectedIds.length > 1 ? 'Compare with AI' : 'Ask AI about these'}
            </Button>
          </div>
        )}
      </div>

      {loading && papers.length === 0 ? (
        <div className="py-16 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading papers…
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPapers.map((paper) => {
            const isSelected = selected.has(paper.id);
            return (
              <Card
                key={paper.id}
                className={cn('p-5 transition-colors', isSelected ? 'border-primary/50 bg-primary/[0.03]' : 'hover:border-border')}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    aria-label={isSelected ? 'Deselect paper' : 'Select paper for AI questions'}
                    title="Select to ask AI about multiple papers"
                    onClick={() => toggleSelected(paper.id)}
                    className={cn(
                      'mt-0.5 w-4 h-4 rounded-[5px] flex items-center justify-center shrink-0 transition-colors',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-card text-transparent hover:border-primary/60'
                    )}
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        {paper.arxivId ? (
                          <Badge variant="secondary" className="text-[9px] font-mono">
                            arXiv:{paper.arxivId}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px]">
                            Workbook
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-[9px]">
                          {paper.category}
                        </Badge>
                        <Badge
                          variant={
                            paper.status === 'processed' ? 'success' : paper.status === 'reading' ? 'warning' : 'outline'
                          }
                          className="text-[9px]"
                        >
                          {paper.status}
                        </Badge>
                        {paper.publishedDate && (
                          <span className="text-[10px] text-muted-foreground">{paper.publishedDate.slice(0, 4)}</span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold tracking-tight mt-1">{paper.title}</h3>
                      {paper.authors.length > 0 && (
                        <p className="text-[11px] text-muted-foreground">{paper.authors.join(', ')}</p>
                      )}
                      <p className="text-xs text-foreground/80 line-clamp-2 mt-2 leading-relaxed">{paper.abstract}</p>
                    </div>
                    <div className="flex md:flex-col gap-2 shrink-0 md:w-36">
                      {paper.arxivId ? (
                        <a
                          href={`https://arxiv.org/pdf/${paper.arxivId}.pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-7 items-center justify-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-primary" />
                          Open PDF
                        </a>
                      ) : (
                        <Button size="sm" variant="outline" className="text-xs gap-1.5" disabled title="No PDF link for workbook papers">
                          <FileText className="w-3.5 h-3.5" />
                          No PDF
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1.5"
                        onClick={() => askAboutPaper(paper, 'Explain this paper in simpler terms, including its main idea and limitations.')}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        Explain simply
                      </Button>
                      <Link
                        href={`/knowledge-graph?paper=${encodeURIComponent(paper.id)}`}
                        className="inline-flex h-7 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                      >
                        <Network className="w-3.5 h-3.5 text-primary" />
                        In graph
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
          {filteredPapers.length === 0 && (
            <Card className="py-10 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                {papers.length === 0 ? 'Your library is empty.' : 'No papers match your filter.'}
              </p>
              {q && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      setFetchQuery(searchQuery.trim());
                      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Fetch papers on “{searchQuery.trim()}”
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs gap-1"
                    onClick={() => openCopilot({ question: searchQuery.trim(), autoRun: true })}
                  >
                    <Sparkles className="w-3 h-3 text-primary" />
                    Ask AI instead
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
