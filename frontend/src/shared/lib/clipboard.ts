/**
 * Копирование текста в буфер обмена.
 *
 * navigator.clipboard требует secure context и доступен не во всех WebView
 * (в частности, в старых встроенных браузерах Telegram). Поэтому есть
 * фолбэк через скрытую textarea + execCommand('copy').
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Падаем в фолбэк ниже — например, WebView запретил clipboard API.
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
