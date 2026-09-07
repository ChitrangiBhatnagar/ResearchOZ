# ADR 0002: Second-brain MCP over research papers

## Status

Accepted — 2026-09-02

## Context

ResearchOS stores curriculum and papers in local SQLite. External AI clients
need a stdio MCP façade so they can ingest papers, link them into a knowledge
graph, and query that corpus as a personal “second brain” without a cloud DB.
The MCP process must not become a second persistence boundary or duplicate
application rules.

## Decision

1. **Ingest** — `searchAndIngestPapers` (`packages/db/src/importers/arxiv.ts`)
   pulls arXiv Atom results into `papers` (+ flashcards).
2. **Graph rebuild** — `buildKnowledgeGraph`
   (`packages/db/src/graph/build-knowledge-graph.ts`) wipes and reseeds
   `knowledge_nodes` / `knowledge_edges` from:
   - canonical AI concepts (Transformer, GQA, FlashAttention, LoRA, …)
   - curriculum milestones / topic clusters
   - each paper title+abstract keyword-linked to matching concepts
3. **Application boundary** — `@research-os/application`
   (`packages/application/src`) owns application-facing topic search and topic
   status commands over the database/domain APIs. This package is the boundary
   to extend with planner, progress, graph, and research services.
4. **MCP adapter** — `@research-os/mcp` (`packages/mcp/src/index.ts`) exposes
   tools and resources through the application boundary. It contains protocol
   validation and response formatting, not persistence logic.

```
fetch_papers → application services → SQLite papers → buildKnowledgeGraph → nodes/edges
search_second_brain / get_paper_detail / get_concept  ← read path
link_paper_concept / update_paper_notes               ← write path
```

## Consequences

- Pros: offline, single DB, external clients + desktop share state; no Docker required.
- Pros: MCP mutations can share validation, transactions, side effects, and
   future UI invalidation with other application adapters.
- Cons: full graph wipe on rebuild (manual edges with `propertiesJson.manual`
  can be re-linked via `link_paper_concept`); keyword linking is not semantic.
- Follow-ups: incremental graph updates; optional Ollama embeddings in MCP.

## Key files

| File | Role |
|------|------|
| `packages/application/src` | Canonical application service boundary |
| `packages/mcp/src/index.ts` | MCP tools + resources |
| `packages/db/src/importers/arxiv.ts` | Paper ingest |
| `packages/db/src/graph/build-knowledge-graph.ts` | Graph builder |
| `packages/db/src/queries/second-brain.ts` | Search / link / notes APIs |
| `packages/db/src/queries/graph.ts` | Graph read APIs |
| `.cursor/mcp.json` | Cursor registration |
