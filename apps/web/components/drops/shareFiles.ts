/**
 * Hands images to the phone's share sheet (Web Share with files: Instagram, TikTok, WhatsApp) or,
 * where that isn't supported (most desktops), downloads them (C-080b/c). Browser only.
 */
export async function shareOrDownload(
  files: File[],
  meta: { title: string; text: string },
): Promise<'shared' | 'downloaded' | 'aborted'> {
  if (navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files, ...meta });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'aborted';
      throw e;
    }
  }
  for (const file of files) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
  return 'downloaded';
}
