import { EmptyState } from '@/shared/ui';

/** Вкладка «Сообщения» нижней навигации.
 * Переписка с продавцами пока не реализована на бэкенде — экран отдаёт
 * пустое состояние с подсказкой, откуда начнётся переписка. */
export function MessagesPage() {
  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-tg-text text-2xl font-bold">✉️ Сообщения</h1>
      </div>

      <EmptyState
        icon={
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} className="text-tg-hint" style={{ opacity: 0.5 }}>
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        }
        title="Сообщений пока нет"
        description="Когда продавец ответит на ваше обращение, переписка появится здесь. Написать владельцу можно прямо в карточке объявления — кнопка «Написать»."
      />
    </div>
  );
}