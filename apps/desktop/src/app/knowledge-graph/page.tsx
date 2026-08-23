'use client';

import * as React from 'react';
import { Network, Search, RefreshCw, FileText, BookOpen, Wrench, FolderKanban, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Card, Badge, Input, Button } from '@research-os/ui';
import { KnowledgeForceGraph, type KnowledgeForceGraphHandle } from '../../components/knowledge-force-graph';
import Link from 'next/link';

type GNode = { id: string; label: string; nodeType: string; importance: number };
type GEdge = { id: string; source: string; target: string; edgeType: string };

type NodeDetail = {
  node: { id: string; label: string; nodeType: string; description: string | null };
  notes: string;
  topic: { id: string; title: string; status: string; difficulty: string } | null;
  paper: { id: string; title: string; abstract: string; status: string; pdfUrl: string | null } | null;
  papers: Array<{ id: string; title: string; status: string; category: string | null }>;
  implementations: Array<{ id: string; label: string; nodeType: string }>;
  projects: string[];
  edges: Array<{
    id: string;
    edgeType: string;
    direction: string;
    other: { id: string; label: string; nodeType: string };
  }>;
};

export default function KnowledgeGraphPage() {
  const [nodes, setNodes] = React.useState<GNode[]>([]);
  const [edges, setEdges] = React.useState<GEdge[]>([]);
  const [query, setQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<NodeDetail | null>(null);
  const [rebuilding, setRebuilding] = React.useState(false);
  const graphRef = React.useRef<KnowledgeForceGraphHandle>(null);

  const load = React.useCallback(async () => {
    const res = await fetch('/api/graph');
    const json = await res.json();
    setNodes(json.nodes || []);
    setEdges(json.edges || []);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void fetch(`/api/graph/nodes/${selectedId}`)
      .then((r) => r.json())
      .then((d) => setDetail(d.error ? null : d));
  }, [selectedId]);

  const rebuild = async () => {
    setRebuilding(true);
    try {
      await fetch('/api/graph', { method: 'POST' });
      await load();
    } finally {
      setRebuilding(false);
    }
  };

  const visibleNodes = nodes.filter((n) => {
    const q = query.toLowerCase();
    const okQ = !q || n.label.toLowerCase().includes(q);
    const okT = typeFilter === 'all' || n.nodeType === typeFilter;
    return okQ && okT;
  });
  const visibleIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target));

  const types = ['all', 'model_architecture', 'technique', 'paper', 'hardware', 'framework', 'concept'];

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col gap-3 min-h-0">
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Knowledge Graph</h1>
          <p className="text-xs text-muted-foreground">
            {nodes.length} nodes · {edges.length} edges · uses / improves / replaces / cites
          </p>
        </div>
        <Button variant="outline" size="sm" className="text-xs" onClick={() => void rebuild()} disabled={rebuilding}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${rebuilding ? 'animate-spin' : ''}`} />
          Rebuild from curriculum
        </Button>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find Transformer, Attention, CUDA…"
            className="pl-8 h-8 text-xs"
          />
        </div>
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-2.5 py-1 rounded-lg text-[11px] border ${
              typeFilter === t ? 'border-primary/50 bg-primary/15 text-primary' : 'border-border text-muted-foreground'
            }`}
          >
            {t.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3 flex-1 min-h-0">
        <Card className="relative overflow-hidden p-0 min-h-[420px] bg-[#050506] shadow-[inset_0_0_80px_rgba(249,115,22,0.08)]">
          <KnowledgeForceGraph
            ref={graphRef}
            nodes={visibleNodes}
            edges={visibleEdges}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <div className="absolute top-3 right-3 flex items-center gap-1">
            <div className="flex items-center gap-0.5 bg-background/80 border border-border rounded-md p-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                title="Zoom in"
                onClick={() => graphRef.current?.zoomIn()}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                title="Zoom out"
                onClick={() => graphRef.current?.zoomOut()}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                title="Fit to view"
                onClick={() => graphRef.current?.fitToView()}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="text-[10px] text-muted-foreground bg-background/80 border border-border rounded-md px-2 py-1">
              <Network className="inline w-3 h-3 mr-1" />
              Scroll to zoom · drag background to pan
            </div>
          </div>
        </Card>

        <div className="min-h-0 overflow-y-auto space-y-3">
          {detail ? (
            <Card className="p-4 space-y-3">
              <div>
                <Badge variant="secondary" className="capitalize text-[9px]">
                  {detail.node.nodeType.replace('_', ' ')}
                </Badge>
                <h2 className="text-sm font-semibold mt-1.5">{detail.node.label}</h2>
              </div>

              <section>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1">
                  <FileText className="w-3 h-3" /> Notes
                </div>
                <p className="text-xs text-foreground/80 whitespace-pre-wrap line-clamp-8">{detail.notes}</p>
              </section>

              <section>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1">
                  <BookOpen className="w-3 h-3" /> Papers
                </div>
                {detail.paper && (
                  <Link href="/research" className="block text-xs text-primary mb-1">
                    {detail.paper.title}
                  </Link>
                )}
                {detail.papers.slice(0, 6).map((p) => (
                  <div key={p.id} className="text-xs text-muted-foreground truncate">
                    {p.title}
                  </div>
                ))}
                {!detail.paper && detail.papers.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">No linked papers yet.</p>
                )}
              </section>

              <section>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1">
                  <Wrench className="w-3 h-3" /> Implementations
                </div>
                <div className="flex flex-wrap gap-1">
                  {detail.implementations.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => setSelectedId(n.id)}
                      className="text-[10px] px-2 py-0.5 rounded-md border border-border hover:border-primary/40"
                    >
                      {n.label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1">
                  <FolderKanban className="w-3 h-3" /> Projects
                </div>
                {detail.projects.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">No mini-projects parsed for this node.</p>
                ) : (
                  detail.projects.map((p) => (
                    <p key={p} className="text-xs">
                      {p}
                    </p>
                  ))
                )}
              </section>

              <section>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Edges</div>
                <div className="space-y-1">
                  {detail.edges.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setSelectedId(e.other.id)}
                      className="w-full text-left text-[11px] flex items-center gap-1.5 hover:text-primary"
                    >
                      <Badge variant="outline" className="text-[9px]">
                        {e.edgeType}
                      </Badge>
                      <span className="truncate">{e.other.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {detail.topic && (
                <Link href="/roadmap">
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                    Open in roadmap
                  </Button>
                </Link>
              )}
            </Card>
          ) : (
            <Card className="p-5 text-center">
              <Network className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                Click Attention, Transformer, CUDA, or any paper node to open notes, papers, implementations, and
                projects.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
