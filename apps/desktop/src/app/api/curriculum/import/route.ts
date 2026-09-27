import { NextResponse } from 'next/server';
import { importMasterTracker, resolveMasterWorkbookPath } from '@research-os/db';
import { publishEvent } from '@research-os/application';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const sourceFile = resolveMasterWorkbookPath();
    const result = await importMasterTracker(sourceFile);
    await publishEvent({
      type: 'research.imported',
      changedFields: ['roadmap', 'topics', 'papers', 'habits'],
      payload: { source: 'master-workbook' },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Master workbook import failed', error);
    return NextResponse.json(
      { ok: false, error: 'Import failed', detail: String(error) },
      { status: 500 }
    );
  }
}
