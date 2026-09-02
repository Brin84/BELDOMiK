import { useState } from 'react';
import { useHaptics } from '@/shared/lib/haptics';
import { useAuthStore } from '@/features/auth';
import { useViewingsStore } from '@/features/viewings';

interface ViewingRequestFormProps {
  propertyId: number;
}

export function ViewingRequestForm({ propertyId }: ViewingRequestFormProps) {
  const { trigger } = useHaptics();
  const { status } = useAuthStore();
  const isAuthenticated = status === 'authenticated';

  const { createViewing, isSaving } = useViewingsStore();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) return;
    trigger('light');
    const ok = await createViewing({
      property_id: propertyId,
      name: name.trim(),
      phone: phone.trim(),
      preferred_date: date || undefined,
      preferred_time: time || undefined,
      comment: comment.trim() || undefined,
    });
    if (ok) {
      setSubmitted(true);
      setShowForm(false);
    }
  };

  if (submitted) {
    return (
      <div
        className="p-4 rounded-xl text-center"
        style={{ backgroundColor: 'rgba(52, 199, 89, 0.12)' }}
      >
        <span className="text-2xl">✅</span>
        <p className="text-sm font-medium mt-1" style={{ color: '#34c759' }}>
          Заявка отправлена!
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
          Владелец свяжется с вами для подтверждения
        </p>
      </div>
    );
  }

  if (!showForm) {
    return (
      <button
        onClick={() => { trigger('light'); setShowForm(true); }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium"
        style={{
          backgroundColor: 'var(--tg-theme-secondary-bg-color)',
          border: '1px solid var(--tg-theme-hint-color)',
          color: 'var(--tg-theme-button-color)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        📅 Записаться на осмотр
      </button>
    );
  }

  return (
    <div
      className="p-4 rounded-xl space-y-3"
      style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
    >
      <h3 className="text-sm font-semibold text-tg-text">📅 Запись на осмотр</h3>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ваше имя *"
        maxLength={100}
        className="w-full px-3 py-2.5 rounded-lg outline-none text-base"
        style={{
          backgroundColor: 'var(--tg-theme-bg-color)',
          color: 'var(--tg-theme-text-color)',
          border: '1px solid var(--tg-theme-hint-color)',
        }}
      />

      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Телефон *"
        maxLength={30}
        type="tel"
        className="w-full px-3 py-2.5 rounded-lg outline-none text-base"
        style={{
          backgroundColor: 'var(--tg-theme-bg-color)',
          color: 'var(--tg-theme-text-color)',
          border: '1px solid var(--tg-theme-hint-color)',
        }}
      />

      <div className="flex gap-2">
        <input
          value={date}
          onChange={(e) => setDate(e.target.value)}
          type="date"
          className="flex-1 px-3 py-2.5 rounded-lg outline-none text-base"
          style={{
            backgroundColor: 'var(--tg-theme-bg-color)',
            color: 'var(--tg-theme-text-color)',
            border: '1px solid var(--tg-theme-hint-color)',
          }}
        />
        <input
          value={time}
          onChange={(e) => setTime(e.target.value)}
          placeholder="Время"
          maxLength={20}
          className="w-24 px-3 py-2.5 rounded-lg outline-none text-base"
          style={{
            backgroundColor: 'var(--tg-theme-bg-color)',
            color: 'var(--tg-theme-text-color)',
            border: '1px solid var(--tg-theme-hint-color)',
          }}
        />
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Комментарий (необязательно)"
        maxLength={2000}
        rows={2}
        className="w-full px-3 py-2.5 rounded-lg outline-none text-base resize-none"
        style={{
          backgroundColor: 'var(--tg-theme-bg-color)',
          color: 'var(--tg-theme-text-color)',
          border: '1px solid var(--tg-theme-hint-color)',
        }}
      />

      {!isAuthenticated && (
        <p className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
          Войдите, чтобы заявка была привязана к вашему аккаунту
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={isSaving || !name.trim() || !phone.trim()}
          className="flex-1 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
          style={{
            backgroundColor: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
          }}
        >
          {isSaving ? 'Отправка...' : 'Отправить заявку'}
        </button>
        <button
          onClick={() => setShowForm(false)}
          className="px-4 py-2.5 rounded-xl font-medium"
          style={{
            backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            border: '1px solid var(--tg-theme-hint-color)',
            color: 'var(--tg-theme-text-color)',
          }}
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
