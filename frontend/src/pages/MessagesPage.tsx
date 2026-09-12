import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHaptics } from '@/shared/lib/haptics';
import { useAuthStore } from '@/features/auth';
import { useChatStore, formatChatTime, initialOf } from '@/features/chat';
import { ListSkeleton, EmptyState, InlineError } from '@/shared/ui';

import './MessagesPage/MessagesPage.css';

/** Вкладка «Сообщения»: переписки покупателя с продавцами по объявлениям.
 * Чат создаётся из карточки объявления (кнопка «Написать») и хранится,
 * пока пользователь сам его не удалит. */
export function MessagesPage() {
  const { trigger } = useHaptics();
  const navigate = useNavigate();
  const { user, status } = useAuthStore();
  const isAuthenticated = status === 'authenticated' && user;

  const {
    conversations,
    total,
    isLoading,
    error,
    fetchConversations,
    fetchUnreadCount,
    clearError,
  } = useChatStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
      fetchUnreadCount();
    }
  }, [isAuthenticated, fetchConversations, fetchUnreadCount]);

  const handleRetry = useCallback(() => {
    clearError();
    fetchConversations();
  }, [clearError, fetchConversations]);

  if (!isAuthenticated) {
    return (
      <div className="messages-page">
        <div className="messages-page__inner">
          <h1 className="messages-page__title">Сообщения</h1>
          <EmptyState
            title="Войдите, чтобы видеть переписку"
            description="Авторизуйтесь через Telegram, чтобы общаться с продавцами по объявлениям"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="messages-page">
      <div className="messages-page__inner">
        <header className="messages-page__header">
          <h1 className="messages-page__title">Сообщения</h1>
          {total > 0 && (
            <span className="messages-page__count">{total} чат{total === 1 ? '' : 'а'}</span>
          )}
        </header>

        {error && <InlineError message={error} onDismiss={clearError} />}

        {isLoading && conversations.length === 0 ? (
          <ListSkeleton count={4} />
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={
              <svg
                width="80"
                height="80"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.2}
                className="text-slate-400"
                style={{ opacity: 0.5 }}
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            }
            title="Переписок пока нет"
            description="Найдите понравившееся объявление и нажмите «Написать» в его карточке — диалог с продавцом появится здесь"
            action={error ? { label: 'Повторить', onClick: handleRetry } : undefined}
          />
        ) : (
          <ul className="inbox">
            {conversations.map((conversation) => (
              <li key={conversation.id} className="inbox__item-wrap">
                <button
                  type="button"
                  onClick={() => {
                    trigger('light');
                    navigate(`/messages/${conversation.id}`);
                  }}
                  className="inbox__item"
                  aria-label={`Чат с ${conversation.counterpart_name}`}
                >
                  <span className="inbox__avatar">{initialOf(conversation.counterpart_name)}</span>
                  <span className="inbox__body">
                    <span className="inbox__top">
                      <span className="inbox__name">{conversation.counterpart_name}</span>
                      {conversation.last_message_at && (
                        <time className="inbox__time">
                          {formatChatTime(conversation.last_message_at)}
                        </time>
                      )}
                    </span>
                    <span className="inbox__preview">
                      {conversation.last_message_text || 'Переписка началась…'}
                    </span>
                    <span className="inbox__property">{conversation.property_title}</span>
                  </span>
                  {conversation.unread_count > 0 && (
                    <span className="inbox__badge">
                      {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="messages-page__footer">
          BELDOMiK 🇧🇾 — переписка не является чатом Telegram и хранится, пока вы не удалите её
        </p>
      </div>
    </div>
  );
}