export type PaperSource = 'arxiv' | 'nvidia' | 'paperswithcode' | 'manual_upload';
export type PaperStatus = 'inbox' | 'reading' | 'processed' | 'archived';

export interface Paper {
  id: string;
  arxivId: string | null;
  doi: string | null;
  title: string;
  authors: string[]; // JSON array in DB
  abstract: string;
  source: PaperSource;
  pdfUrl: string | null;
  localPdfPath: string | null;
  status: PaperStatus;
  primaryCategory: string | null; // e.g. cs.CL, cs.AI
  categories: string[];
  summaryMarkdown: string | null;
  keyContributions: string[];
  citationCount: number | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaperSection {
  id: string;
  paperId: string;
  title: string;
  content: string;
  pageNumber: number;
  orderIndex: number;
}

export interface PaperHighlight {
  id: string;
  paperId: string;
  pageNumber: number;
  text: string;
  color: 'yellow' | 'green' | 'blue' | 'purple' | 'red';
  note: string | null;
  createdAt: string;
}
