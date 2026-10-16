import { useState } from 'react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { api } from '@/shared/api/client';

interface MessageResponse {
  message: string;
}

export function SupportPage() {
  const { expand, close } = useTelegram();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const canSend = message.trim().length > 0 && !loading;

  const handleSend = async () => {
    if (!canSend) return;
    setLoading(true);
    setError('');
    try {
      await api.post<MessageResponse>('/api/v1/support', {
        text: message.trim(),
      });
      setDone(true);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'detail' in err
          ? String((err as { detail: string }).detail)
          : 'Произошла ошибка. Попробуйте ещё раз.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    close();
  };

  if (done) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--bd-bg-base)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: 'var(--bd-bg-base)',
            boxShadow: '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--bd-accent-primary)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--bd-text-primary)',
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          Обращение отправлено!
        </h2>
        <p
          style={{
            fontSize: 15,
            color: 'var(--bd-text-secondary)',
            textAlign: 'center',
            lineHeight: 1.5,
            maxWidth: 280,
          }}
        >
          Мы прочитали ваше сообщение и ответим вам в ближайшее время в чате
          поддержки.
        </p>

        <button
          onClick={handleClose}
          style={{
            marginTop: 32,
            width: '100%',
            maxWidth: 320,
            padding: '15px 24px',
            borderRadius: 16,
            backgroundColor: 'var(--bd-accent-primary)',
            color: '#fff',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 4px 12px var(--bd-accent-soft)',
            border: 'none',
            transition: 'transform 0.12s ease, box-shadow 0.12s ease',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(1px)';
            e.currentTarget.style.boxShadow = 'inset 2px 2px 4px rgba(0,0,0,0.15)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = '';
            e.currentTarget.style.boxShadow = '0 4px 12px var(--bd-accent-soft)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = '';
            e.currentTarget.style.boxShadow = '0 4px 12px var(--bd-accent-soft)';
          }}
        >
          Отлично
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bd-bg-base)',
        padding: '0 16px 32px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 2px 14px',
          borderBottom: '1px solid var(--bd-text-secondary)',
          marginBottom: 20,
          opacity: 0.3,
        }}
      >
        <button
          onClick={() => expand()}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--bd-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            padding: 0,
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: 'var(--bd-text-primary)',
            margin: 0,
          }}
        >
          Поддержка
        </h1>
        <div style={{ width: 24 }} />
      </div>

      {/* Instructions */}
      <p
        style={{
          fontSize: 14,
          color: 'var(--bd-text-secondary)',
          lineHeight: 1.5,
          marginBottom: 20,
        }}
      >
        Опишите вашу проблему или вопрос — мы ответим вам в ближайшее время.
        Обращения видны только администраторам BELDOMiK.
      </p>

      {/* Message textarea */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Опишите вашу проблему..."
        maxLength={2000}
        rows={6}
        style={{
          width: '100%',
          padding: '14px 16px',
          borderRadius: 16,
          backgroundColor: 'var(--bd-bg-base)',
          border: 'none',
          color: 'var(--bd-text-primary)',
          fontSize: 15,
          fontFamily: 'inherit',
          resize: 'none',
          boxShadow: 'inset 4px 4px 8px var(--bd-raise-dark), inset -4px -4px 8px var(--bd-raise-light)',
          outline: 'none',
          lineHeight: 1.5,
          boxSizing: 'border-box',
          transition: 'box-shadow 0.18s ease',
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow =
            'inset 3px 3px 6px var(--bd-raise-dark), inset -3px -3px 6px var(--bd-raise-light)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow =
            'inset 4px 4px 8px var(--bd-raise-dark), inset -4px -4px 8px var(--bd-raise-light)';
        }}
      />

      {/* Char counter */}
      <div
        style={{
          textAlign: 'right',
          fontSize: 12,
          color: 'var(--bd-text-secondary)',
          marginTop: 6,
          marginBottom: 20,
        }}
      >
        {message.length} / 2000
      </div>

      {/* Error */}
      {error && (
        <p
          style={{
            color: '#ef4444',
            fontSize: 14,
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          {error}
        </p>
      )}

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={!canSend}
        style={{
          width: '100%',
          padding: '15px 24px',
          borderRadius: 16,
          backgroundColor: canSend ? 'var(--bd-accent-primary)' : 'var(--bd-bg-base)',
          color: canSend ? '#fff' : 'var(--bd-text-secondary)',
          fontSize: 16,
          fontWeight: 700,
          cursor: canSend ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit',
          border: 'none',
          boxShadow:
            canSend
              ? '0 4px 12px var(--bd-accent-soft)'
              : '4px 4px 8px var(--bd-raise-dark), -4px -4px 8px var(--bd-raise-light)',
          transition: 'box-shadow 0.18s ease, transform 0.12s ease, background-color 0.18s ease',
          opacity: loading ? 0.7 : 1,
        }}
        onMouseDown={(e) => {
          if (!canSend) return;
          e.currentTarget.style.transform = 'translateY(1px)';
          e.currentTarget.style.boxShadow = 'inset 2px 2px 4px rgba(0,0,0,0.15)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = '0 4px 12px var(--bd-accent-soft)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = '0 4px 12px var(--bd-accent-soft)';
        }}
      >
        {loading ? 'Отправка...' : 'Отправить'}
      </button>
    </div>
  );
}