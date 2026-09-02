import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHaptics } from '@/shared/lib/haptics';
import { useAuthStore } from '@/features/auth';
import { useViewingsStore } from '@/features/viewings';
import { EmptyState, InlineError, ListSkeleton } from '@/shared/ui';
import { formatDateShort } from '@/shared/lib/format';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Ожидает', color: '#ff9500', bg: 'rgba(255, 149, 0, 0.15)' },
  confirmed: { label: 'Подтверждена', color: '#34c759', bg: 'rgba(52, 199, 89, 0.15)' },
  cancelled: { label: 'Отменена', color: '#ff3b30', bg: 'rgba(255, 59, 48, 0.15)' },
};

export function ViewingsPage() {
  const navigate = useNavigate();
  const { trigger } = useHaptics();
  const { status } = useAuthStore();
  const isAuthenticated = status === 'authenticated';

  const { viewings, isLoading, error, fetchViewings, updateStatus, clearError } = useViewingsStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchViewings();
    }
  }, [isAuthenticated, fetchViewings]);

  if (!isAuthenticated) {
    return (
      <div className="p-4 space-y-6 pb-20">
        <EmptyState
          title="Войдите, чтобы увидеть заявки"
          description="Авторизуйтесь через Telegram, чтобы получать заявки на осмотр ваших объявлений"
          action={{ label: 'Войти', onClick: () => {} }}
        />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      <h1 className="text-tg-text text-2xl font-bold">📅 Записи на осмотр</h1>

      {error && <InlineError message={error} onDismiss={clearError} />}

      {isLoading && viewings.length === 0 ? (
        <ListSkeleton count={3} />
      ) : viewings.length === 0 ? (
        <EmptyState
          icon={<span className="text-5xl mb-2">📅</span>}
          title="Пока нет заявок"
          description="Когда кто-то запишется на осмотр вашего объявления, заявка появится здесь"
        />
      ) : (
        <div className="space-y-3">
          {viewings.map((viewing) => {
            const st = STATUS_LABELS[viewing.status] || STATUS_LABELS.pending;
            return (
              <div
                key={viewing.id}
                className="p-4 rounded-xl space-y-2"
                style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => { trigger('light'); navigate(`/property/${viewing.property_id}`); }}
                    className="text-sm font-medium text-left"
                    style={{ color: 'var(--tg-theme-button-color)' }}
                  >
                    Объявление #{viewing.property_id}
                  </button>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                    style={{ backgroundColor: st.bg, color: st.color }}
                  >
                    {st.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-tg-text text-base">
                  <span className="font-medium">👤 {viewing.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
                  <span>📞 {viewing.phone}</span>
                </div>

                {(viewing.preferred_date || viewing.preferred_time) && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
                    <span>
                      🗓 {viewing.preferred_date ? formatDateShort(viewing.preferred_date) : '—'}
                      {viewing.preferred_time ? ` в ${viewing.preferred_time}` : ''}
                    </span>
                  </div>
                )}

                {viewing.comment && (
                  <p className="text-sm text-tg-text" style={{ opacity: 0.85 }}>💬 {viewing.comment}</p>
                )}

                <p className="text-xs" style={{ color: 'var(--tg-theme-hint-color)', opacity: 0.7 }}>
                  Создано: {formatDateShort(viewing.created_at)}
                </p>

                {viewing.status === 'pending' && (
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => { trigger('light'); updateStatus(viewing.id, 'confirmed'); }}
                      className="flex-1 py-2 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: 'rgba(52, 199, 89, 0.15)', color: '#34c759' }}
                    >
                      Подтвердить
                    </button>
                    <button
                      onClick={() => { trigger('light'); updateStatus(viewing.id, 'cancelled'); }}
                      className="flex-1 py-2 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: 'rgba(255, 59, 48, 0.15)', color: '#ff3b30' }}
                    >
                      Отменить
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
