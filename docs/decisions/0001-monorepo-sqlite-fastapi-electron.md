# 1. Monorepo, SQLite with Drizzle ORM, FastAPI Sidecar, and Electron/Next.js Desktop

Date: 2026-08-19

## Status
Accepted

## Context
ResearchOS requires a production-grade, offline-first personal AI operating system for AI Engineers and Researchers. Key constraints include sub-2s startup, under 400MB memory footprint, offline durability, full keyboard accessibility, and separation between AI/Python processing and UI rendering.

## Decision
1. **Monorepo**: Structure with `pnpm` workspaces separating UI (`packages/ui`), database schema & client (`packages/db`), shared utilities (`packages/shared`), and domain types (`packages/types`) from application entrypoints (`apps/desktop`, `apps/api`).
2. **Database**: Normalized SQLite managed via Drizzle ORM. Eliminates remote database dependencies and guarantees offline-first durability.
3. **Desktop**: Electron wrapping Next.js 15 App Router with Context Isolation and secure IPC bridge.
4. **AI Backend**: FastAPI sidecar hosting LangGraph orchestrator, PyMuPDF, embeddings, and routing between local Ollama and NVIDIA NIM.
5. **UI**: Shadcn UI + Tailwind CSS configured for a refined Dark-first theme inspired by Linear, Cursor, and Raycast.

## Consequences
- Clean decoupled architecture with strong boundary isolation.
- Fast local iteration and simple multi-platform bundling.
