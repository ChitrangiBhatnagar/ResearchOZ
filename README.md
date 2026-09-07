<div align="center">

# ResearchOS

**A production-grade, offline-first desktop AI study operating system engineered for AI & Research Engineers.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Electron](https://img.shields.io/badge/Electron-34-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![SQLite](https://img.shields.io/badge/SQLite-LibSQL-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![MCP](https://img.shields.io/badge/MCP-Cursor-000000)](https://modelcontextprotocol.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

</div>

---

## 🌟 Product Vision

**ResearchOS is not a note-taking app.** It is an intelligent desktop operating system designed to accelerate the trajectory toward becoming a world-class AI Research & Systems Engineer.

The application treats your Excel study curriculum as the single source of truth and transforms it into an interactive, AI-orchestrated workspace that:
- **Tracks study progress** across 11 master AI engineering subjects and 230+ topics.
- **Enforces daily habits** (deep study, kernel coding, paper reading, exercise, meditation).
- **Curates & synthesizes research papers** from arXiv, NVIDIA Research, Hugging Face, OpenReview, and Papers with Code.
- **Builds a knowledge graph** linking curriculum topics, concepts, and papers.
- **Drives active recall** through SM-2 spaced repetition flashcards.
- **Generates adaptive daily study plans** matching your current energy level and time budget.
- **Exposes the same data to Cursor** via a local MCP server so agents can read and update your study OS.
- **Maintains 100% offline durability** with a normalized local SQLite engine (cloud / Ollama AI is optional).

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
|                | Spawns & Supervises                              | REST          |
|                v                                                  v               |
|  +------------------------------------------------------------------------------+ |
|  |                     FastAPI Local AI Sidecar (:8765)                         | |
|  |  - LangGraph ResearchAgent (search / summarize / extract)                    | |
|  |  - PyMuPDF prepare, page render, section extract                             | |
|  |  - Semantic search + embedding index (Ollama nomic-embed-text)               | |
|  |  - Study planner (energy & time heuristics)                                  | |
|  |  - Local Ollama chat router (llama3.2 default)                               | |
|  +------------------------------------------------------------------------------+ |
|                                        |                                          |
|                                        v                                          |
|  +------------------------------------------------------------------------------+ |
|  |                 ResearchOS Application Services & API                        | |
|  |  - Canonical topic, planner, progress, graph, and research workflows         | |
|  +--------------------------------------+---------------------------------------+ |
|                                         |                                       |
|                                         v                                       |
|  |                      Local SQLite Database & Storage                         | |
|  |  - LibSQL / Drizzle ORM (Roadmaps, Topics, Habits, Papers, Graph, Cards)     | |
|  |  - storage/papers • storage/cache • storage/embeddings                       | |
|  +------------------------------------------------------------------------------+ |
|                                        ^                                          |
|                                        | application services                    |
|  +------------------------------------------------------------------------------+ |
|  |                 ResearchOS MCP Server (stdio adapter)                        | |
|  |  Tools: roadmap, papers, graph, habits, planner, activity heatmap            | |
|  |  Resources: researchos://roadmap | papers | graph                            | |
|  +------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------+
```

---

## 📁 Monorepo Layout

```
research-os/
├── apps/
│   ├── desktop/             # Next.js 15 App router + Electron desktop shell
│   │   └── src/
│   │       ├── app/         # Dashboard, Roadmap, Habits, Research, Flashcards,
│   │       │                # Knowledge Graph, Planner, Settings + curriculum APIs
│   │       ├── components/  # AppSidebar, Header, ExcelImportModal, graph UI
│   │       ├── main/        # Electron main process & IPC handlers
│   │       └── preload/     # Context-isolated secure preload bridge
│   └── api/                 # FastAPI Python sidecar (port 8765)
│       ├── main.py
│       ├── config.py        # Repo root, DB path, Ollama models
│       ├── agents/          # LangGraph ResearchAgent
│       ├── routers/         # health, planner, research, papers, agent, search
│       └── services/        # db, pdf, ollama, embeddings
├── packages/
│   ├── types/               # TypeScript domain models & API contracts
│   ├── shared/              # Structured JSON logger, SM-2 math, constants, date utils
│   ├── db/                  # Normalized SQLite schemas, Drizzle ORM, Excel ingestion
│   ├── application/         # Canonical application services over repositories
│   ├── mcp/                 # Client-agnostic MCP adapter over application services
│   └── ui/                  # Shadcn primitives, Linear dark theme tokens, Heatmap
├── storage/
│   ├── papers/              # Cached research PDFs
│   ├── notes/               # Markdown study notes
│   ├── cache/               # Search & API cache
│   ├── embeddings/          # Vector store artifacts
│   └── researchos.db        # Primary SQLite database
├── .cursor/
│   └── mcp.json             # Ready-to-use Cursor MCP registration
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
- **Ollama** (optional): for agent chat + semantic embeddings (`ollama serve`)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Seed / Import Curriculum into SQLite
```bash
# Seed baseline schema + sample data
pnpm --filter @research-os/db seed

# Or import the master AI Engineer tracker spreadsheet
pnpm --filter @research-os/db import:master
```

### 3. Run Web Development Server (Next.js 15)
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Desktop Application (Electron)
```bash
pnpm --filter @research-os/desktop dev:electron
```

### 5. Launch FastAPI AI Sidecar
```bash
cd apps/api
pip install -r requirements.txt
python main.py
```
API listens on `http://127.0.0.1:8765` by default (`PORT` env overrides).

### 6. (Optional) Local LLM via Ollama
```bash
ollama serve
ollama pull llama3.2          # chat model
ollama pull nomic-embed-text  # embeddings for semantic search
```

Environment overrides (API):

| Variable | Default |
|---|---|
| `DATABASE_PATH` | `storage/researchos.db` |
| `OLLAMA_URL` | `http://127.0.0.1:11434` |
| `OLLAMA_CHAT_MODEL` | `llama3.2` |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` |
| `PORT` | `8765` |

---

## 🤖 FastAPI Sidecar API

Base path: `/api/v1`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` (health) | Process health / readiness |
| `POST` | `/planner/generate` | Daily plan from minutes + energy level |
| `GET` | `/research/search` | Paper search |
| `POST` | `/papers/{id}/prepare` | Download / cache PDF + extract sections |
| `GET` | `/papers/{id}/meta` | Page count & metadata |
| `GET` | `/papers/{id}/pages/{n}` | Render page as PNG |
| `GET` | `/papers/{id}/pages/{n}/base64` | Render page as base64 PNG |
| `POST` | `/papers/{id}/extract` | Section extraction via PyMuPDF |
| `GET` | `/agent/status` | Ollama availability + agent id |
| `POST` | `/agent/chat` | LangGraph research agent chat |
| `GET` | `/search/semantic` | Embedding search (falls back to keyword) |
| `POST` | `/search/index` | Re-index paper embeddings |

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
- [x] **Phase 2: Study Tracking & Analytics** (Curriculum dashboard APIs, habits week matrix, activity heatmap)
- [x] **Phase 3: Research Pipeline** (Paper ingest, PyMuPDF prepare/extract/render, research library UI)
- [x] **Phase 4: AI & Orchestrator** (LangGraph agent, local Ollama routing, semantic search + embeddings)
- [x] **Phase 5: Knowledge Graph** (Graph rebuild, concept detail, zoomable graph UI, MCP access)
- [x] **Phase 5b: Cursor MCP** (stdio MCP server — roadmap, papers, graph, habits, planner tools)
- [ ] **Phase 6: Release & Polish** (Offline package bundling, installer, notification daemon)

---

## ResearchOS MCP (Cursor)

ResearchOS exposes a local **stdio MCP adapter** (`@research-os/mcp`) so Cursor, Claude, Windsurf, and other MCP clients can read and update your roadmap, papers, knowledge graph, habits, and study plan through the canonical application services. MCP never accesses SQLite directly.

### Setup

1. Import master data if you have not already:

   ```bash
   pnpm --filter @research-os/db import:master
   ```

2. Register the server in Cursor. The repo already ships [`.cursor/mcp.json`](.cursor/mcp.json) — or add this to your user MCP config:

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

  Run from the monorepo root. During development, the application service resolves `DATABASE_PATH` relative to the repo root. In production, Electron should supervise the application API and MCP process so clients never need to know the SQLite path.

3. Restart Cursor or reload MCP servers. Try prompts like:
   - "List subjects in my roadmap"
   - "Mark topic X as in progress"
   - "Fetch NVIDIA transformer papers"
   - "Generate a 90-minute high-energy study plan"
   - "Show the knowledge graph summary"
   - "What's my activity heatmap for the last 90 days?"

### Tools

| Tool | Purpose |
|------|---------|
| `list_subjects` | Roadmap milestone / subject sheets with progress |
| `get_roadmap` | Full curriculum tree (optional subject filter) |
| `search_topics` | Find topics by query, subject, or status |
| `update_topic_status` | Cycle or set topic status (`not_started` → `in_progress` → `completed`) |
| `list_papers` / `get_paper` | Research library read |
| `get_paper_detail` | Paper + summary + linked second-brain concepts |
| `fetch_papers` | Ingest from arXiv (NVIDIA/HF/etc. filters) → auto rebuild graph |
| `update_paper_status` | `inbox` → `reading` → `processed` → `archived` |
| `update_paper_notes` | Write markdown notes / summary on a paper |
| `link_paper_concept` | Manually link paper ↔ concept (creates label if needed) |
| `search_second_brain` | Unified search across papers, concepts, topics |
| `second_brain_stats` | Paper / node / edge counts |
| `get_knowledge_graph` | Nodes + edges summary |
| `get_concept` | Node detail by id or label |
| `rebuild_graph` | Refresh graph links from curriculum + papers |
| `get_habits` / `toggle_habit` | Consistency matrix for the current week |
| `generate_study_plan` | Daily plan from `available_minutes` + `energy_level` |
| `get_activity_heatmap` | 7–365 day study activity heatmap |

### Resources

| URI | Contents |
|-----|----------|
| `researchos://roadmap` | Active roadmap tree |
| `researchos://papers` | Paper library (up to 200) |
| `researchos://graph` | Knowledge graph payload |
| `researchos://second-brain` | Stats + graph size summary |

### Second-brain flow (papers → graph)

```
fetch_papers  →  SQLite papers (+ flashcards)
              →  buildKnowledgeGraph()
              →  knowledge_nodes / knowledge_edges
search_second_brain / get_paper_detail / get_concept  (read)
link_paper_concept / update_paper_notes               (write)
```

MCP is an integration boundary, not a persistence boundary. Mutations go through application services so validation, transactions, side effects, and future UI invalidation can be shared by the desktop UI, API, automation, and external MCP clients. See [docs/decisions/0002-second-brain-mcp.md](docs/decisions/0002-second-brain-mcp.md).

### Manual run

```bash
pnpm --filter @research-os/mcp start
```

Logs go to **stderr**; **stdout** is reserved for JSON-RPC.

---

## 📄 License

MIT © [Chitrangi Bhatnagar](https://github.com/ChitrangiBhatnagar)
