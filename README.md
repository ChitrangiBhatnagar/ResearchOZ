<div align="center">

# ResearchOS

**A production-grade, offline-first desktop AI study operating system engineered for AI & Research Engineers.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Electron](https://img.shields.io/badge/Electron-34-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![SQLite](https://img.shields.io/badge/SQLite-LibSQL-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

</div>

---

## 🌟 Product Vision

**ResearchOS is not a note-taking app.** It is an intelligent desktop operating system designed to accelerate the trajectory toward becoming a world-class AI Research & Systems Engineer.

The application treats your Excel study curriculum as the single source of truth and transforms it into an interactive, AI-orchestrated workspace that:
- **Tracks study progress** across 11 master AI engineering subjects and 230+ topics.
- **Enforces daily habits** (deep study, kernel coding, paper reading, exercise, meditation).
- **Curates & synthesizes research papers** directly from arXiv and NVIDIA Research.
- **Drives active recall** through SM-2 spaced repetition flashcards.
- **Generates adaptive daily study plans** matching your current energy level and time budget.
- **Maintains 100% offline durability** with a normalized local SQLite engine.

---

## ⚡ Core Principles & Performance Benchmarks

| Principle | Target / Standard |
|---|---|
| **Offline First** | 100% local persistence via SQLite (WAL mode). Cloud AI is strictly optional. |
| **Sub-2s Startup** | Fast, lightweight initialization under 2,000ms. |
| **Memory Footprint** | Operating memory maintained below 400MB. |
| **Search Latency** | Instant semantic and keyword queries under 100ms. |
| **PDF Rendering** | PyMuPDF extraction and display under 500ms. |
| **Linear / Raycast UX** | Dark-first theme (`zinc-950`), 8px grid, smooth micro-interactions under 200ms. |

---

## 🏗️ System Architecture

```
+-----------------------------------------------------------------------------------+
|                                ResearchOS Desktop                                 |
|                                                                                   |
|  +---------------------------+       IPC Bridge      +--------------------------+ |
|  |   Electron Main Process   |<--------------------->|   Next.js 15 UI Shell    | |
|  |  (Window, Lifecycle,      |  (Context Isolation)  | (React 19, Tailwind,     | |
|  |   Native FS, Dialogs)     |                       |  Shadcn, Heatmap, cmdk)  | |
|  +-------------+-------------+                       +------------+-------------+ |
|                |                                                  |               |
|                | Spawns & Supervises                              | REST / WS     |
|                v                                                  v               |
|  +------------------------------------------------------------------------------+ |
|  |                     FastAPI Local AI Sidecar Service                         | |
|  |  +------------------------------------------------------------------------+  | |
|  |  | LangGraph Multi-Tool Orchestrator (ResearchAgent)                      |  | |
|  |  | - arXiv / NVIDIA Research Fetcher                                      |  | |
|  |  | - PyMuPDF Section Extractor & Summary Engine                          |  | |
|  |  | - Dynamic Study Planner Engine (Energy & Habit Heuristics)             |  | |
|  |  | - Local Ollama / NVIDIA NIM Model Router                               |  | |
|  |  +------------------------------------------------------------------------+  | |
|  +------------------------------------------------------------------------------+ |
|                                        |                                          |
|                                        v                                          |
|  +------------------------------------------------------------------------------+ |
|  |                      Local SQLite Database & Storage                         | |
|  |  - LibSQL / Drizzle ORM Schema (Roadmaps, Milestones, Topics, Habits, Cards) | |
|  |  - storage/papers (PDFs) • storage/cache • storage/embeddings                | |
|  +------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------+
```

---

## 📁 Monorepo Layout

```
research-os/
├── apps/
│   ├── desktop/             # Next.js 15 App router + Electron desktop shell
│   │   ├── src/
│   │   │   ├── app/         # Dashboard, Roadmap, Habits, Research, Flashcards
│   │   │   ├── components/  # AppSidebar, Header, ExcelImportModal
│   │   │   ├── main/        # Electron main process & IPC handlers
│   │   │   └── preload/     # Context-isolated secure preload bridge
│   └── api/                 # FastAPI Python sidecar service
│       ├── main.py
│       └── routers/         # health, planner, research
├── packages/
│   ├── types/               # TypeScript domain models & API contracts
│   ├── shared/              # Structured JSON logger, SM-2 math, constants, date utils
│   ├── db/                  # Normalized SQLite schemas, Drizzle ORM, Excel ingestion
│   └── ui/                  # Shadcn primitives, Linear dark theme tokens, Heatmap
├── storage/
│   ├── papers/              # Cached research PDFs
│   ├── notes/               # Markdown study notes
│   ├── cache/               # Search & API cache
│   └── embeddings/          # Vector stores
└── docs/
    └── decisions/           # Architecture Decision Records (ADRs)
```

---

## 📚 Master AI Engineering Curriculum

The built-in master tracker (`AI_Engineer_Tracker_-_Master__Phases_1-3_.xlsx`) ingests 11 comprehensive phases:

1. **Python Advanced**: CPython internals, GIL, memory management, `asyncio` event loop, C-extensions.
2. **Data Structures & Algorithms**: Cache-friendly arrays, lock-free queues, graph algorithms for systems.
3. **Operating Systems**: Virtual memory, `epoll` / `io_uring`, eBPF, Linux scheduler, page faults.
4. **Computer Networking**: gRPC / Protobuf, HTTP/2, RDMA, NCCL ring all-reduce topology.
5. **Databases**: PostgreSQL internals, WAL, LSM trees, Vector similarity search (HNSW, IVF-PQ).
6. **Mathematics for ML**: SVD, Eigendecomposition, Information Theory, Convex Optimization.
7. **Machine Learning**: Statistical learning theory, Tree Ensembles (GBDTs), PAC learning.
8. **Deep Learning Foundations**: Computational graphs, manual autograd derivation, AdamW, LayerNorm vs RMSNorm.
9. **LLM Engineering**: Tokenization, RoPE, Grouped-Query Attention (GQA), FlashAttention-1/2/3, MoE, SFT, DPO, Speculative Decoding.
10. **CUDA & GPU Programming**: SM memory hierarchy, SRAM tiling, Warp shuffles, Tensor Cores, OpenAI Triton.
11. **Distributed Systems & Training**: DDP, ZeRO-1/2/3, FSDP, Megatron Tensor Parallelism, Pipeline Parallelism (1F1B).

---

## 🚀 Quickstart & Development

### Prerequisites
- **Node.js**: `v22+` or `v24+`
- **pnpm**: `v10+` (`npm i -g pnpm`)
- **Python**: `3.11+`

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Seed SQLite Database with AI Master Curriculum
```bash
pnpm --filter @research-os/db seed
```

### 3. Run Web Development Server (Next.js 15)
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Desktop Application (Electron)
```bash
pnpm dev:electron
```

### 5. Launch FastAPI AI Sidecar
```bash
cd apps/api
pip install -r requirements.txt
python main.py
```

---

## 🧪 Testing & Verification

```bash
# Run typechecking across all monorepo packages
pnpm typecheck

# Run automated integration tests (SQLite, SM-2, Excel Ingestion)
pnpm --filter @research-os/db test

# Build production Next.js desktop renderer
pnpm --filter @research-os/desktop build
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + K` / `Cmd + K` | Open Global Command Palette |
| `Ctrl + I` | Import Study Roadmap from Excel / CSV |
| `G then D` | Navigate to Executive Dashboard |
| `G then R` | Navigate to Curriculum Roadmap |
| `G then H` | Navigate to Habits & Consistency Matrix |
| `G then P` | Navigate to Research Papers |
| `G then F` | Start Spaced Repetition Flashcards Review |
| `Space` | Reveal Flashcard Answer & Code Snippet |

---

## 🗺️ Roadmap & Phases

- [x] **Phase 1: Foundation** (Monorepo, Electron, Next.js 15, Shadcn UI, SQLite, Master Excel Importer)
- [ ] **Phase 2: Study Tracking & Analytics** (Deep work timer, session logs, GitHub heatmap analytics)
- [ ] **Phase 3: Research Pipeline** (arXiv client, PyMuPDF paper extractor, annotation canvas)
- [ ] **Phase 4: AI & Orchestrator** (LangGraph agent, local Ollama / NVIDIA NIM routing, auto-quiz)
- [ ] **Phase 5: Knowledge Graph** (Vector embeddings, automated concept relation extractor, graph visualizer)
- [ ] **Phase 6: Release & Polish** (Offline package bundling, installer, notification daemon)

---

## ResearchOS MCP (Cursor)

ResearchOS exposes a local **stdio MCP server** so Cursor agents can read your roadmap, papers, knowledge graph, and habits from the same SQLite database as the desktop app.

### Setup

1. Import master data if you have not already:

   ```bash
   pnpm --filter @research-os/db import:master
   ```

2. Register the server in Cursor. Copy [`.cursor/mcp.json`](.cursor/mcp.json) or add this to your user MCP config:

   ```json
   {
     "mcpServers": {
       "researchos": {
         "command": "pnpm",
         "args": ["--filter", "@research-os/mcp", "exec", "tsx", "src/index.ts"],
         "env": {
           "DATABASE_PATH": "storage/researchos.db"
         }
       }
     }
   }
   ```

   Run from the monorepo root. `DATABASE_PATH` is resolved relative to the repo root via `@research-os/db` (same as the desktop app).

3. Restart Cursor or reload MCP servers. Verify with prompts like:
   - "List subjects in my roadmap"
   - "Fetch NVIDIA transformer papers"
   - "Show the knowledge graph summary"

### Tools (v1)

| Tool | Purpose |
|------|---------|
| `list_subjects` | Roadmap milestone / subject sheets |
| `get_roadmap` | Full curriculum tree |
| `search_topics` | Find topics by query, subject, status |
| `list_papers` / `get_paper` | Research library |
| `fetch_papers` | arXiv / NVIDIA ingest |
| `get_knowledge_graph` | Nodes + edges |
| `get_concept` | Node detail (notes, papers, edges) |
| `rebuild_graph` | Refresh graph links |
| `get_habits` / `toggle_habit` | Consistency matrix |

### Resources

Read-only JSON: `researchos://roadmap`, `researchos://papers`, `researchos://graph`

### Manual run

```bash
pnpm --filter @research-os/mcp start
```

Logs go to stderr; stdout is reserved for JSON-RPC.

---

## 📄 License

MIT © [Chitrangi Bhatnagar](https://github.com/ChitrangiBhatnagar)
