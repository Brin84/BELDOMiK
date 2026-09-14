import { useState } from 'react';
import { useHaptics } from '@/shared/lib/haptics';
import { useTelegram } from '@/app/providers/TelegramProvider';
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
 *
 * Как звоним на iOS: WebApp.openLink() открывает HTTPS-URL в системном
 * Safari-контексте (SFSafariViewController), где хост (Telegram) НЕ может
 * перехватить tel:. Поэтому primary-кнопка ведёт на relay-страницу
 * (frontend/public/relay.html), которая редиректит на tel: — iOS показывает
 * нативный диалог «Позвонить <номер>». «Скопировать номер» — запасной вариант.
 * На Android primary остаётся настоящим tel: + копирование как запасной.
 */
export function CallSheet({ telHref, display, onClose }: CallSheetProps) {
  const { trigger } = useHaptics();
  const { showToast } = useToast();
  const { platform, openLink } = useTelegram();
  const [copied, setCopied] = useState(false);

  // iOS WKWebView блокирует tel: полностью — прямой анкор там «мёртвый».
  // На iOS «Позвонить» идёт через relay-страницу в Safari-контексте.
  const isIOS = platform === 'ios';

  const handleCall = () => {
    trigger('success');
    if (isIOS) {
      // openLink уводит Telegram в нативный Safari-контекст (SFSafariViewController),
      // где relay-страница редиректит на tel: и iOS показывает диалог вызова.
      // Если openLink упал (URL не https — например локальный dev без WebApp) —
      // не закрываем лист, пользователь остаётся на кнопке копирования.
      try {
        openLink(`${window.location.origin}/relay.html?phone=${encodeURIComponent(telHref)}`);
        onClose();
      } catch {
        showToast('Не удалось запустить звонок — скопируйте номер ниже', 'warning');
      }
    }
  };

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
    <div className="call-sheet" role="dialog" aria-modal="true" aria-label="Позвонить по телефону">
      <button
        type="button"
        className="call-sheet__backdrop"
        aria-label="Закрыть"
        onClick={onClose}
      />
      <div className="call-sheet__stack">
        <div className="call-sheet__panel">
          {/* Номер синим сверху — как у ссылки в сообщении канала (iOS контекстное
              меню Telegram): тап по номеру/«Позвонить» = набор. */}
          <div className="call-sheet__number">{display}</div>

          <div className="call-sheet__menu">
            {isIOS ? (
              // iOS: Идём через relay-страницу — она открывается в системном Safari,
              // где tel: запускает нативный набор (WKWebView тел: блокирует).
              <button
                type="button"
                className="call-sheet__item call-sheet__item--call"
                onClick={handleCall}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>Позвонить по телефону</span>
              </button>
            ) : (
              <a
                className="call-sheet__item call-sheet__item--call"
                href={`tel:${telHref}`}
                onClick={() => trigger('success')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>Позвонить по телефону</span>
              </a>
            )}

            <button
              type="button"
              className="call-sheet__item call-sheet__item--copy"
              onClick={handleCopy}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>{copied ? 'Номер скопирован' : 'Копировать номер'}</span>
            </button>
          </div>

          <p className="call-sheet__hint">
            Если звонок не запускается — скопируйте номер и наберите его в приложении «Телефон».
          </p>
        </div>

        <div className="call-sheet__cancel-card">
          <button type="button" className="call-sheet__cancel" onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
