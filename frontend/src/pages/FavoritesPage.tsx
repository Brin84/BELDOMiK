import { EmptyState } from '@/shared/ui';
import { useAuthStore } from '@/features/auth';

export function FavoritesPage() {
  const { user, status } = useAuthStore();
  const isAuthenticated = status === 'authenticated' && user;

  if (!isAuthenticated) {
    return (
      <div className="p-4 space-y-6 pb-20">
        <EmptyState
          title="Войдите, чтобы увидеть избранное"
          description="Авторизуйтесь через Telegram, чтобы сохранять понравившиеся объекты и получать уведомления об изменении цены"
          action={{
            label: 'Войти',
            onClick: () => {
              // Auth is handled by TelegramProvider
            },
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-tg-text text-2xl font-bold">❤️ Избранное</h1>
      </div>

      <EmptyState
        title="Пока нет избранных объектов"
        description="Нажимайте на сердечко в карточке объявления, чтобы добавить его сюда. Мы будем уведомлять вас об изменении цены."
        icon={
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} className="text-tg-hint" style={{ opacity: 0.5 }}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        }
      />

      <div className="pt-8 text-center text-tg-hint text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
        BELDOMiK 🇧🇾 — недвижимость Беларуси
      </div>
    </div>
  );
}