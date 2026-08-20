'use client';

import * as React from 'react';
import { Network, Search, ZoomIn, ZoomOut, Layers, GitBranch, Database, Cpu } from 'lucide-react';
import { Card, Badge, Input, Button } from '@research-os/ui';

type NodeCategory = 'all' | 'concept' | 'technique' | 'paper' | 'tool';

interface GraphNode {
  id: string;
  label: string;
  category: 'concept' | 'technique' | 'paper' | 'tool';
  subject: string;
  x: number;
  y: number;
  connections: number;
}

// Static seed graph — Phase 1 MVP (full graph renders from SQLite in Phase 2)
const SEED_NODES: GraphNode[] = [
  { id: 'n-transformer', label: 'Transformer Architecture', category: 'concept', subject: 'LLM Engineering', x: 45, y: 40, connections: 8 },
  { id: 'n-attention', label: 'Multi-Head Attention', category: 'technique', subject: 'LLM Engineering', x: 30, y: 60, connections: 6 },
  { id: 'n-gqa', label: 'Grouped-Query Attention', category: 'technique', subject: 'LLM Engineering', x: 55, y: 62, connections: 4 },
  { id: 'n-fa', label: 'FlashAttention', category: 'technique', subject: 'CUDA & GPU', x: 70, y: 48, connections: 5 },
  { id: 'n-rope', label: 'RoPE Embeddings', category: 'technique', subject: 'LLM Engineering', x: 22, y: 48, connections: 3 },
  { id: 'n-cuda', label: 'CUDA Kernel Programming', category: 'technique', subject: 'CUDA & GPU', x: 75, y: 30, connections: 7 },
  { id: 'n-cuda-arch', label: 'GPU SM Architecture', category: 'concept', subject: 'CUDA & GPU', x: 80, y: 55, connections: 5 },
  { id: 'n-zero', label: 'ZeRO Optimizer (1/2/3)', category: 'technique', subject: 'Distributed Training', x: 25, y: 28, connections: 4 },
  { id: 'n-fsdp', label: 'FSDP / Model Sharding', category: 'technique', subject: 'Distributed Training', x: 42, y: 22, connections: 3 },
  { id: 'n-fa2-paper', label: 'FlashAttention-2 Paper', category: 'paper', subject: 'Research', x: 60, y: 35, connections: 4 },
  { id: 'n-triton', label: 'OpenAI Triton', category: 'tool', subject: 'CUDA & GPU', x: 85, y: 40, connections: 3 },
  { id: 'n-dpo', label: 'DPO / RLHF', category: 'technique', subject: 'LLM Engineering', x: 18, y: 70, connections: 2 },
  { id: 'n-moe', label: 'Mixture of Experts (MoE)', category: 'concept', subject: 'LLM Engineering', x: 35, y: 76, connections: 3 },
  { id: 'n-speculative', label: 'Speculative Decoding', category: 'technique', subject: 'LLM Engineering', x: 52, y: 78, connections: 2 },
  { id: 'n-hnsw', label: 'HNSW Index', category: 'technique', subject: 'Databases', x: 68, y: 74, connections: 2 },
];

const CATEGORY_STYLES = {
  concept: { bg: 'bg-indigo-600', border: 'border-indigo-500', badge: 'indigo' as const, label: 'Concept', glow: '#6366f1' },
  technique: { bg: 'bg-emerald-600', border: 'border-emerald-500', badge: 'success' as const, label: 'Technique', glow: '#10b981' },
  paper: { bg: 'bg-amber-600', border: 'border-amber-500', badge: 'warning' as const, label: 'Paper', glow: '#f59e0b' },
  tool: { bg: 'bg-purple-600', border: 'border-purple-500', badge: 'secondary' as const, label: 'Tool', glow: '#a855f7' },
};

export default function KnowledgeGraphPage() {
  const [query, setQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<NodeCategory>('all');
  const [selectedNode, setSelectedNode] = React.useState<GraphNode | null>(null);

  const filteredNodes = SEED_NODES.filter((node) => {
    const matchesQuery = query === '' || node.label.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || node.category === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  const stats = {
    concepts: SEED_NODES.filter((n) => n.category === 'concept').length,
    techniques: SEED_NODES.filter((n) => n.category === 'technique').length,
    papers: SEED_NODES.filter((n) => n.category === 'paper').length,
    tools: SEED_NODES.filter((n) => n.category === 'tool').length,
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Knowledge Graph</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Semantic concept map auto-generated from your curriculum, papers, and study sessions.
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-700">
          Phase 2 — Full Vector Graph
        </Badge>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Concepts', count: stats.concepts, icon: Layers, color: 'text-indigo-400' },
          { label: 'Techniques', count: stats.techniques, icon: GitBranch, color: 'text-emerald-400' },
          { label: 'Papers', count: stats.papers, icon: Database, color: 'text-amber-400' },
          { label: 'Tools', count: stats.tools, icon: Cpu, color: 'text-purple-400' },
        ].map(({ label, count, icon: Icon, color }) => (
          <Card key={label} className="p-3">
            <div className="flex items-center space-x-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <div>
                <div className="text-sm font-bold text-zinc-100">{count}</div>
                <div className="text-[10px] text-zinc-500">{label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
        {/* Graph Canvas */}
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
              <Input
                placeholder="Search concepts, techniques, papers..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-zinc-900 border-zinc-800 w-full"
              />
            </div>
            {(['all', 'concept', 'technique', 'paper', 'tool'] as NodeCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'border-indigo-600/70 bg-indigo-950/40 text-indigo-300'
                    : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {/* SVG Canvas */}
          <Card className="relative overflow-hidden bg-zinc-950/60 border-zinc-800/60" style={{ height: 460 }}>
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
              className="absolute inset-0"
            >
              {/* Subtle grid */}
              <defs>
                <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
                  <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(39,39,42,0.6)" strokeWidth="0.2" />
                </pattern>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="0.5" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />

              {/* Edges (draw between known connected pairs) */}
              {[
                ['n-transformer', 'n-attention'],
                ['n-transformer', 'n-gqa'],
                ['n-transformer', 'n-rope'],
                ['n-transformer', 'n-fa'],
                ['n-transformer', 'n-moe'],
                ['n-attention', 'n-gqa'],
                ['n-fa', 'n-cuda'],
                ['n-fa', 'n-cuda-arch'],
                ['n-fa', 'n-fa2-paper'],
                ['n-fa2-paper', 'n-triton'],
                ['n-cuda', 'n-triton'],
                ['n-cuda', 'n-cuda-arch'],
                ['n-zero', 'n-fsdp'],
                ['n-transformer', 'n-speculative'],
                ['n-dpo', 'n-transformer'],
              ].map(([fromId, toId]) => {
                const fromNode = filteredNodes.find((n) => n.id === fromId);
                const toNode = filteredNodes.find((n) => n.id === toId);
                if (!fromNode || !toNode) return null;
                return (
                  <line
                    key={`${fromId}-${toId}`}
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke="rgba(113,113,122,0.25)"
                    strokeWidth="0.3"
                  />
                );
              })}

              {/* Nodes */}
              {filteredNodes.map((node) => {
                const style = CATEGORY_STYLES[node.category];
                const isSelected = selectedNode?.id === node.id;
                const radius = 1.2 + Math.min(node.connections * 0.15, 1.2);
                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedNode(isSelected ? null : node)}
                    style={{ cursor: 'pointer' }}
                  >
                    {isSelected && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={radius + 1.5}
                        fill={`${style.glow}22`}
                        stroke={style.glow}
                        strokeWidth="0.3"
                      />
                    )}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={radius}
                      fill={isSelected ? style.glow : `${style.glow}88`}
                      stroke={style.glow}
                      strokeWidth="0.25"
                      filter={isSelected ? 'url(#glow)' : undefined}
                    />
                    <text
                      x={node.x}
                      y={node.y + radius + 1.5}
                      textAnchor="middle"
                      fill="rgba(228,228,231,0.8)"
                      fontSize="1.6"
                      fontFamily="system-ui"
                    >
                      {node.label.length > 22 ? node.label.slice(0, 22) + '…' : node.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Phase 2 Overlay badge */}
            <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md text-[10px] bg-zinc-900/80 border border-zinc-800/60 text-zinc-400">
              <Network className="inline w-3 h-3 mr-1" />
              Phase 2 — Full force-directed graph with HNSW embeddings
            </div>
          </Card>
        </div>

        {/* Node Detail Panel */}
        <div className="space-y-3">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">
            {selectedNode ? 'Node Detail' : 'Select a node'}
          </div>
          {selectedNode ? (
            <Card className="p-4 space-y-3">
              <div className="flex items-start space-x-2">
                <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${CATEGORY_STYLES[selectedNode.category].bg}`} />
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">{selectedNode.label}</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{selectedNode.subject}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-zinc-800/60 rounded-lg p-2 text-center">
                  <div className="font-bold text-zinc-100">{selectedNode.connections}</div>
                  <div className="text-zinc-500">Connections</div>
                </div>
                <div className="bg-zinc-800/60 rounded-lg p-2 text-center">
                  <div className={`font-bold capitalize ${CATEGORY_STYLES[selectedNode.category].bg.replace('bg-', 'text-').replace('-600', '-400')}`}>
                    {CATEGORY_STYLES[selectedNode.category].label}
                  </div>
                  <div className="text-zinc-500">Category</div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full h-7 text-xs border-zinc-700">
                Go to Topic in Roadmap
              </Button>
            </Card>
          ) : (
            <Card className="p-5 text-center border-zinc-800/50">
              <Network className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">
                Click any node to explore its connections and navigate to its source topic in the roadmap.
              </p>
            </Card>
          )}

          {/* Legend */}
          <Card className="p-3 space-y-2">
            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Legend</div>
            {Object.entries(CATEGORY_STYLES).map(([cat, style]) => (
              <div key={cat} className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${style.bg}`} />
                <span className="text-[11px] text-zinc-400 capitalize">{cat}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
