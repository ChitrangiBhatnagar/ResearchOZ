'use client';

import * as React from 'react';
import {
  BookOpen,
  Search,
  Download,
  Sparkles,
  ExternalLink,
  Layers,
  FileText,
  Clock,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
} from '@research-os/ui';

interface PaperItem {
  id: string;
  arxivId: string;
  title: string;
  authors: string[];
  abstract: string;
  category: string;
  publishedDate: string;
  status: 'inbox' | 'reading' | 'processed';
}

const INITIAL_PAPERS: PaperItem[] = [
  {
    id: 'p-1',
    arxivId: '2305.13245',
    title: 'GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints',
    authors: ['Joshua Ainslie', 'James Lee-Thorp', 'Michiel de Jong', 'Yury Zemlyanskiy'],
    abstract: 'Multi-head attention (MHA) has notable memory bandwidth overhead during inference due to loading keys and values at each decoding step. We introduce grouped-query attention (GQA), which groups queries into multiple subsets sharing single Key-Value heads.',
    category: 'cs.CL',
    publishedDate: 'May 2023',
    status: 'processed',
  },
  {
    id: 'p-2',
    arxivId: '2307.08691',
    title: 'FlashAttention-2: Faster Attention with Better Work Partitioning and Parallelism',
    authors: ['Tri Dao'],
    abstract: 'We present FlashAttention-2, which addresses work-partitioning inefficiencies across thread blocks and warps in GPU SMs, achieving up to 2x speedup over FlashAttention-1.',
    category: 'cs.LG',
    publishedDate: 'Jul 2023',
    status: 'reading',
  },
  {
    id: 'p-3',
    arxivId: '2309.06180',
    title: 'Efficient Memory Management for Large Language Model Serving with PagedAttention',
    authors: ['Woosuk Kwon', 'Zhuohan Li', 'Siyuan Zhuang', 'Ying Sheng', 'Lianmin Zheng'],
    abstract: 'Serving LLMs is constrained by GPU memory capacity. PagedAttention divides contiguous KV cache memory into non-contiguous blocks, enabling near-zero memory waste and high-throughput batching in vLLM.',
    category: 'cs.DC',
    publishedDate: 'Sep 2023',
    status: 'inbox',
  },
];

export default function ResearchPage() {
  const [papers, setPapers] = React.useState<PaperItem[]>(INITIAL_PAPERS);
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredPapers = papers.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.abstract.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.authors.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
            Research Literature Pipeline
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Direct arXiv & NVIDIA Research fetching • Local PyMuPDF parsing • Vector extraction
          </p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="flex items-center space-x-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search arXiv papers by title, author, keyword or arXiv ID (e.g. FlashAttention)..."
            className="pl-9 h-9 text-xs"
          />
        </div>
        <Button variant="primary" size="sm" className="h-9 px-4 text-xs flex items-center space-x-1.5">
          <Download className="w-3.5 h-3.5" />
          <span>Fetch arXiv Paper</span>
        </Button>
      </div>

      {/* Paper List */}
      <div className="space-y-4">
        {filteredPapers.map((paper) => (
          <Card key={paper.id} className="p-5 hover:border-zinc-700/80 transition-colors bg-zinc-900/40">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1 pr-6">
                <div className="flex items-center space-x-2">
                  <Badge variant="indigo" className="text-[9px] font-mono">
                    arXiv:{paper.arxivId}
                  </Badge>
                  <Badge variant="secondary" className="text-[9px]">
                    {paper.category}
                  </Badge>
                  <span className="text-[10px] text-zinc-500">{paper.publishedDate}</span>
                </div>
                <h3 className="text-sm font-semibold text-zinc-100 tracking-tight mt-1">
                  {paper.title}
                </h3>
                <p className="text-[11px] text-zinc-400">
                  {paper.authors.join(', ')}
                </p>
                <p className="text-xs text-zinc-300 line-clamp-2 mt-2 leading-relaxed">
                  {paper.abstract}
                </p>
              </div>

              <div className="flex flex-col space-y-2 shrink-0">
                <Button size="sm" variant="outline" className="text-xs flex items-center space-x-1.5 border-zinc-800">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Open PDF</span>
                </Button>
                <Button size="sm" variant="ghost" className="text-xs flex items-center space-x-1.5 text-zinc-400">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Synthesize</span>
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
