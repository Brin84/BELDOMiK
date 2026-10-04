import { useEffect, useCallback } from 'react';
import { useHaptics } from '@/shared/lib/haptics';
import { useAuthStore } from '@/features/auth';
import { useFavoritesStore } from '@/features/favorites';
import { PropertyCard } from '@/entities/property';
import { ListSkeleton, EmptyState, InlineError } from '@/shared/ui';

export function FavoritesPage() {
  const { trigger } = useHaptics();
  const { user, status } = useAuthStore();
  const isAuthenticated = status === 'authenticated' && user;

  const {
    favorites,
    isLoading,
    error,
    total,
    fetchFavorites,
    clearError,
  } = useFavoritesStore();

  // Initialize on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites(true);
    }
  }, [isAuthenticated, fetchFavorites]);

  const handleRetry = useCallback(() => {
    clearError();
    fetchFavorites(true);
  }, [clearError, fetchFavorites]);

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
    <div className="p-4 space-y-6 pb-24" style={{ backgroundColor: 'var(--bd-bg-base, #e0e5ec)', color: 'var(--bd-text-primary, #2d3748)' }}>
      <NeuCard padding="none">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold">❤️ Избранное</h1>
          {total > 0 && (
            <span className="text-sm" style={{ color: 'var(--bd-text-secondary, #718096)' }}>
              {total} объектов
            </span>
          )}
        </div>
      </NeuCard>

      {/* Error State */}
      {error && <InlineError message={error} onDismiss={clearError} />}

      {isLoading && favorites.length === 0 ? (
        <ListSkeleton count={5} />
      ) : favorites.length === 0 ? (
        <EmptyState
          icon={
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} style={{ color: 'var(--bd-text-secondary)', opacity: 0.5 }}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          }
          title="Пока нет избранных объектов"
          description="Нажимайте на сердечко в карточке объявления, чтобы добавить его сюда. Мы будем уведомлять вас об изменении цены."
          action={error ? { label: 'Повторить', onClick: handleRetry } : undefined}
        />
      ) : (
        <>
          <div className="space-y-3">
            {favorites.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onFavoriteToggle={async (propertyId) => {
                  trigger('light');
                  try {
                    await useFavoritesStore.getState().toggleFavorite(propertyId);
                  } catch {
                    // Error already handled in store
                  }
                }}
              />
            ))}
          </div>

          {favorites.length > 0 && (
            <p className="text-center text-sm py-4" style={{ color: 'var(--bd-text-secondary, #718096)' }}>
              Все {total} избранных загружены
            </p>
          )}
        </>
      )}

      {/* Footer info */}
      <p className="text-center text-sm pt-8" style={{ color: 'var(--bd-text-secondary, #718096)' }}>
        BELDOMiK 🇧🇾 — недвижимость Беларуси
      </p>
    </div>
  );
}