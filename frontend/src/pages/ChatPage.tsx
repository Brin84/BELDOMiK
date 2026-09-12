import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Home, Send, Trash2 } from 'lucide-react';
import { useHaptics } from '@/shared/lib/haptics';
import { useChatStore, formatMessageTime } from '@/features/chat';
import { Skeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/ui/ErrorState';

import './ChatPage/ChatPage.css';

/** Окно переписки покупателя с продавцом (/messages/:id). */
export function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const conversationId = id ? parseInt(id, 10) : null;
  const navigate = useNavigate();
  const { trigger } = useHaptics();

  const { active, isActiveLoading, isSending, error, clearError } = useChatStore();
  const openChat = useChatStore((s) => s.openChat);
  const pollActive = useChatStore((s) => s.pollActive);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const removeChat = useChatStore((s) => s.removeChat);
  const clearActive = useChatStore((s) => s.clearActive);

  const [draft, setDraft] = useState('');
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId || Number.isNaN(conversationId)) return;
    openChat(conversationId);
    const poll = window.setInterval(() => pollActive(conversationId), 5000);
    return () => {
      window.clearInterval(poll);
      clearActive();
    };
  }, [conversationId, openChat, pollActive, clearActive]);

  // Прокрутка к последнему сообщению при добавлении/загрузке истории.
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: 'end' });
  }, [active?.messages.length, isActiveLoading]);

  const handleSend = useCallback(() => {
    if (!conversationId || Number.isNaN(conversationId)) return;
    const text = draft.trim();
    if (!text || isSending) return;
    trigger('light');
    setDraft('');
    void sendMessage(conversationId, text);
  }, [conversationId, draft, isSending, trigger, sendMessage]);

  const handleDelete = useCallback(async () => {
    if (!conversationId || Number.isNaN(conversationId)) return;
    if (!window.confirm('Удалить переписку? У собеседника сообщения сохранятся.')) return;
    trigger('success');
    try {
      await removeChat(conversationId);
      navigate('/messages', { replace: true });
    } catch {
      // Ошибка остаётся в сторе и покажется под шапкой.
    }
  }, [conversationId, trigger, removeChat, navigate]);

  if (isActiveLoading || (active && active.id !== conversationId)) {
    return (
      <div className="chat-page">
        <div className="chat-page__body">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-24 rounded-2xl mt-3" />
          <Skeleton className="h-24 rounded-2xl mt-3 ml-8" />
          <Skeleton className="h-24 rounded-2xl mt-3" />
        </div>
      </div>
    );
  }

  if (!active) {
    return (
      <ErrorState
        message={error ?? 'Чат не найден'}
        onRetry={() => (conversationId ? openChat(conversationId) : navigate('/messages'))}
      />
    );
  }

  const messages = active.messages ?? [];

  return (
    <div className="chat-page">
      <header className="chat-page__header">
        <button
          type="button"
          onClick={() => {
            trigger('light');
            navigate('/messages');
          }}
          className="chat-page__icon-btn"
          aria-label="К списку переписок"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="chat-page__info">
          <div className="chat-page__name">{active.counterpart_name}</div>
          <button
            type="button"
            onClick={() => navigate(`/property/${active.property_id}`)}
            className="chat-page__sub"
            title="Открыть объявление"
          >
            <Home size={12} className="chat-page__sub-icon" />
            {active.property_title}
          </button>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          className="chat-page__icon-btn chat-page__icon-btn--danger"
          aria-label="Удалить переписку"
        >
          <Trash2 size={19} />
        </button>
      </header>

      {error && (
        <div className="chat-page__error">
          <span>{error}</span>
          <button type="button" onClick={clearError} aria-label="Скрыть">
            ✕
          </button>
        </div>
      )}

      <div className="chat-track">
        {messages.length === 0 ? (
          <p className="chat-track__empty">
            Переписка началась… Напишите продавцу первое сообщение.
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`chat-bubble ${
                message.is_mine ? 'chat-bubble--mine' : 'chat-bubble--theirs'
              }`}
            >
              <p className="chat-bubble__text">{message.text}</p>
              <time className="chat-bubble__time">{formatMessageTime(message.created_at)}</time>
            </div>
          ))
        )}
        <div ref={listEndRef} />
      </div>

      <form
        className="chat-input"
        onSubmit={(event) => {
          event.preventDefault();
          handleSend();
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Сообщение…"
          className="chat-input__field"
          maxLength={2000}
          enterKeyHint="send"
        />
        <button
          type="submit"
          disabled={!draft.trim() || isSending}
          className="chat-input__send"
          aria-label="Отправить"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}