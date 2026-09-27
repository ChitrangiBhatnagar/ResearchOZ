import { NextResponse } from 'next/server';
import { retrieveResearchSources, type ResearchSource } from '@research-os/db';
import { APP_CONFIG } from '@research-os/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SIDECAR_URL = (
  process.env.RESEARCHOS_API_URL || `http://${APP_CONFIG.DEFAULT_API_HOST}:${APP_CONFIG.DEFAULT_API_PORT}`
).replace(/\/$/, '');

type AskBody = {
  question?: string;
  paperIds?: string[];
  contextLabel?: string | null;
};

export type AskResponse = {
  question: string;
  status: 'answered' | 'sources_only' | 'no_sources';
  answer: {
    text: string;
    uncertainty: string | null;
    citedRefs: number[];
    grounded: boolean;
    model: string | null;
  } | null;
  sources: Array<ResearchSource & { ref: number }>;
  retrieval: { terms: string[]; semantic: boolean };
  notice: string | null;
};

async function sidecarJson<T>(path: string, init: RequestInit, timeoutMs: number): Promise<T | null> {
  try {
    const res = await fetch(`${SIDECAR_URL}/api/v1${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function semanticScores(question: string): Promise<Record<string, number> | null> {
  const json = await sidecarJson<{
    data?: { results?: Array<{ paper_id?: string; score?: number; match_type?: string }> };
  }>(`/search/semantic?q=${encodeURIComponent(question.slice(0, 300))}&limit=8`, { method: 'GET' }, 4000);
  const results = json?.data?.results;
  if (!results) return null;
  const scores: Record<string, number> = {};
  for (const r of results) {
    if (r.match_type !== 'semantic' || !r.paper_id || typeof r.score !== 'number') continue;
    scores[r.paper_id] = Math.max(scores[r.paper_id] ?? 0, r.score);
  }
  return Object.keys(scores).length ? scores : null;
}

function parseAnswer(raw: string): { text: string; uncertainty: string | null } {
  const answerMatch = raw.match(/ANSWER:\s*([\s\S]*?)(?:\n\s*UNCERTAINTY:|$)/i);
  const uncertaintyMatch = raw.match(/UNCERTAINTY:\s*([\s\S]*)$/i);
  const text = (answerMatch?.[1] ?? raw).trim();
  const uncertainty = uncertaintyMatch?.[1]?.trim() ?? null;
  const meaningful = uncertainty && !/^none\.?$/i.test(uncertainty) ? uncertainty : null;
  return { text, uncertainty: meaningful };
}

export async function POST(request: Request) {
  let body: AskBody;
  try {
    body = (await request.json()) as AskBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const question = body.question?.trim();
  if (!question) return NextResponse.json({ error: 'question is required' }, { status: 400 });
  if (question.length > 1000) {
    return NextResponse.json({ error: 'Please keep questions under 1000 characters' }, { status: 400 });
  }

  try {
    const semantic = await semanticScores(question);
    const { terms, sources: retrieved } = await retrieveResearchSources({
      question,
      paperIds: Array.isArray(body.paperIds) ? body.paperIds.filter((id) => typeof id === 'string') : [],
      limit: 8,
      semanticScores: semantic ?? undefined,
    });
    const sources = retrieved.map((s, i) => ({ ...s, ref: i + 1 }));

    const generated = await sidecarJson<{
      data?: { available?: boolean; answer?: string | null; model?: string };
    }>(
      '/agent/answer',
      {
        method: 'POST',
        body: JSON.stringify({
          question,
          context_label: body.contextLabel ?? null,
          sources: sources.map((s) => ({ ref: s.ref, title: s.title, kind: s.kind, text: s.excerpt || s.title })),
        }),
      },
      55_000
    );

    const rawAnswer = generated?.data?.available ? generated.data.answer : null;
    let answer: AskResponse['answer'] = null;
    if (rawAnswer) {
      const parsed = parseAnswer(rawAnswer);
      const citedRefs = Array.from(
        new Set(Array.from(parsed.text.matchAll(/\[(\d+)\]/g), (m) => Number(m[1])))
      ).filter((n) => n >= 1 && n <= sources.length);
      answer = {
        ...parsed,
        citedRefs,
        grounded: sources.length > 0,
        model: generated?.data?.model ?? null,
      };
    }

    let notice: string | null = null;
    if (!answer) {
      notice =
        generated === null
          ? 'The AI engine is not reachable, so no explanation was generated. The sources below are what your library contains on this question.'
          : 'The local language model (Ollama) is not running, so no explanation was generated. Showing matching sources only.';
    } else if (sources.length === 0) {
      notice = 'Nothing in your library matched this question, so the explanation below is general knowledge and is not backed by your papers.';
    }

    const response: AskResponse = {
      question,
      status: answer ? 'answered' : sources.length ? 'sources_only' : 'no_sources',
      answer,
      sources,
      retrieval: { terms, semantic: Boolean(semantic) },
      notice,
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Research copilot query failed', error);
    return NextResponse.json({ error: 'The research query failed', detail: String(error) }, { status: 500 });
  }
}
