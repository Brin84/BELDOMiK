import { useState } from 'react';
import { useHaptics } from '@/shared/lib/haptics';
import { useToast } from '@/shared/ui/Toast';
import { copyToClipboard } from '@/shared/lib/clipboard';

interface CallSheetProps {
  /** Номер в формате для tel: (только цифры и ведущий +). */
  telHref: string;
  /** Номер как показываем человеку. */
  display: string;
  onClose: () => void;
}

/**
 * Лист звонка.
 *
 * Зачем отдельный экран, а не прямая ссылка tel:
 * — на iPhone Telegram-клиент использует WKWebView, который НЕ передаёт tel:
 *   системной звонилке: тап по кнопке визуально срабатывает, но набора нет.
 *   Программный клик по анкору и window.location там тоже не помогают —
 *   это ограничение платформы, а не кода.
 * — на Android тот же tel: обычно отрабатывает штатно.
 * Поэтому показываем номер крупно и даём два независимых пути: «Позвонить»
 * (настоящий анкор — срабатывает там, где платформа разрешает) и «Скопировать
 * номер» (работает всегда). Так кнопка не бывает «мёртвой» ни на iOS, ни на
 * Android.
 */
export function CallSheet({ telHref, display, onClose }: CallSheetProps) {
  const { trigger } = useHaptics();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    trigger('light');
    const ok = await copyToClipboard(display);
    if (ok) {
      setCopied(true);
      trigger('success');
      showToast('Номер скопирован — наберите его в приложении «Телефон»', 'success', 4000);
    } else {
      trigger('error');
      showToast('Не удалось скопировать — наберите номер вручную', 'warning');
    }
  };

  return (
    <div className="call-sheet" role="dialog" aria-modal="true" aria-label="Позвонить продавцу">
      <button
        type="button"
        className="call-sheet__backdrop"
        aria-label="Закрыть"
        onClick={onClose}
      />
      <div className="call-sheet__panel">
        <div className="call-sheet__grip" aria-hidden="true" />
        <div className="call-sheet__title">Позвонить продавцу</div>

        <div className="call-sheet__number">{display}</div>

        <a
          className="call-sheet__btn call-sheet__btn--call"
          href={`tel:${telHref}`}
          onClick={() => trigger('success')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          Позвонить
        </a>

        <button
          type="button"
          className="call-sheet__btn call-sheet__btn--copy"
          onClick={handleCopy}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {copied ? 'Номер скопирован' : 'Скопировать номер'}
        </button>

        <p className="call-sheet__hint">
          Если звонок не запускается, скопируйте номер и наберите его в приложении «Телефон».
        </p>

        <button type="button" className="call-sheet__btn call-sheet__btn--cancel" onClick={onClose}>
          Отмена
        </button>
      </div>
    </div>
  );
}
