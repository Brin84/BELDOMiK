interface ShareData {
  title?: string;
  text?: string;
  url?: string;
}

export function useShare() {
  const share = async (data: ShareData) => {
    // Check if Web Share API is available
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (error) {
        // User cancelled or error occurred, fall through to fallback
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
      }
    }

    // Fallback: copy to clipboard
    const text = `${data.title ? `${data.title}\n` : ''}${data.text || ''}${data.url ? `\n${data.url}` : ''}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API failed, last resort - use prompt
      if (typeof window !== 'undefined') {
        window.prompt('Скопируйте ссылку для поделиться:', data.url || window.location.href);
      }
    }
  };

  return { share };
}