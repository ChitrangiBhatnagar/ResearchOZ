'use client';

import * as React from 'react';
import { Search, Download, Sparkles, FileText, RefreshCw, Loader2 } from 'lucide-react';
import { Card, Button, Badge, Input } from '@research-os/ui';

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

  const syncWorkbook = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/curriculum/import', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || json.detail || 'Import failed');
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
    setSteps([
      { name: `Search ${source}`, status: 'running' },
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
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setFetching(false);
    }
  };

  const filteredPapers = papers.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.abstract.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.authors.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Research Paper Hub</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Personal library · workbook papers + live fetch from arXiv / NVIDIA / HF / OpenReview / PapersWithCode ·{' '}
            {papers.length} stored
          </p>
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs flex items-center space-x-1.5"
          onClick={() => void syncWorkbook()}
          disabled={syncing}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Syncing…' : 'Re-sync Excel'}</span>
        </Button>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Agent fetch workflow</h2>
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
              onClick={() => setSource(s.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] border ${
                source === s.id ? 'border-primary/50 bg-primary/15 text-primary' : 'border-border text-muted-foreground'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={fetchQuery}
            onChange={(e) => setFetchQuery(e.target.value)}
            placeholder="NVIDIA Transformer papers"
            className="h-9 text-xs"
          />
          <Button
            variant="primary"
            size="sm"
            className="h-9 px-4 text-xs flex items-center space-x-1.5 shrink-0"
            onClick={() => void runFetch()}
            disabled={fetching || !fetchQuery.trim()}
          >
            {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>{fetching ? 'Fetching…' : 'Fetch papers'}</span>
          </Button>
        </div>
        {steps.length > 0 && (
          <ol className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {steps.map((step) => (
              <li key={step.name} className="rounded-lg border border-border/70 p-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{step.status}</div>
                <div className="text-[11px] font-medium mt-0.5">{step.name}</div>
                {step.detail && <div className="text-[10px] text-muted-foreground mt-0.5">{step.detail}</div>}
              </li>
            ))}
          </ol>
        )}
      </Card>

      <div className="flex items-center space-x-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter library by title, author, category…"
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {loading && papers.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading papers…</div>
      ) : (
        <div className="space-y-4">
          {filteredPapers.map((paper) => (
            <Card key={paper.id} className="p-5 hover:border-border transition-colors">
              <div className="flex items-start justify-between gap-4">
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
                        paper.status === 'processed'
                          ? 'success'
                          : paper.status === 'reading'
                            ? 'warning'
                            : 'outline'
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
                  <p className="text-[11px] text-muted-foreground">{paper.authors.join(', ')}</p>
                  <p className="text-xs text-foreground/80 line-clamp-2 mt-2 leading-relaxed">{paper.abstract}</p>
                </div>
                <div className="flex flex-col space-y-2 shrink-0">
                  {paper.arxivId ? (
                    <a href={`https://arxiv.org/pdf/${paper.arxivId}.pdf`} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline" className="text-xs flex items-center space-x-1.5 w-full">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        <span>Open PDF</span>
                      </Button>
                    </a>
                  ) : (
                    <Button size="sm" variant="outline" className="text-xs flex items-center space-x-1.5" disabled>
                      <FileText className="w-3.5 h-3.5" />
                      <span>No PDF</span>
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-xs flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>In graph</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {filteredPapers.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">No papers match your search.</div>
          )}
        </div>
      )}
    </div>
  );
}
