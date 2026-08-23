import { NextResponse } from 'next/server';
import { importMasterTracker, resolveMasterWorkbookPath } from '@research-os/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const sourceFile = resolveMasterWorkbookPath();
    const result = await importMasterTracker(sourceFile);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Master workbook import failed', error);
    return NextResponse.json(
      { ok: false, error: 'Import failed', detail: String(error) },
      { status: 500 }
    );
  }
}
