import { NextResponse, type NextRequest } from 'next/server';
import { z } from '@tidaq/core';
import { getTest, signedScreenshotUrl } from '@/lib/admin/audit';
import { requireAdmin } from '@/lib/admin/session';

/** Opens a test's private screenshot via a signed link that expires after 5 minutes. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin('/admin/audit');
  const id = z.coerce
    .number()
    .int()
    .positive()
    .safeParse((await params).id);
  const test = id.success ? await getTest(id.data) : null;
  if (!test?.screenshot_path) return new NextResponse('Kein Screenshot', { status: 404 });
  const response = NextResponse.redirect(await signedScreenshotUrl(test.screenshot_path), 302);
  response.headers.set('cache-control', 'no-store');
  return response;
}
