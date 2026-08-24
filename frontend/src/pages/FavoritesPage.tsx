import { useEffect, useCallback } from 'react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { useAuthStore } from '@/features/auth';
import { useFavoritesStore } from '@/features/favorites';
import { usePropertiesStore } from '@/features/properties/propertiesStore';
import { PropertyCard } from '@/entities/property';
import { ListSkeleton, EmptyState, InlineError } from '@/shared/ui';

export function FavoritesPage() {
  const { trigger } = useHaptics();
  const { user, status } = useAuthStore();
  const { mainButton } = useTelegram();
  const isAuthenticated = status === 'authenticated' && user;

  const {
    favorites,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    total,
    fetchFavorites,
    loadMore,
    clearError,
  } = useFavoritesStore();

  const { fetchProperties } = usePropertiesStore();

  // Initialize on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites(true);
    }
  }, [isAuthenticated, fetchFavorites]);

  // Show main button when there are favorites
  useEffect(() => {
    if (mainButton) {
      if (favorites.length > 0) {
        mainButton.setParams({
          text: `Показать ещё ${Math.min(20, total - favorites.length)} из ${total}`,
          is_visible: true,
          is_active: hasMore,
        });
        mainButton.show();
      } else {
        mainButton.hide();
      }

      return () => {
        mainButton.hide();
      };
    }
  }, [favorites.length, total, hasMore, mainButton]);

  const handleMainButtonClick = useCallback(() => {
    trigger('light');
    loadMore();
  }, [loadMore, trigger]);

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
    <div className="p-4 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-tg-text text-2xl font-bold">❤️ Избранное</h1>
        {total > 0 && (
          <span className="text-tg-hint text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
            {total} объектов
          </span>
        )}
      </div>

      {/* Error State */}
      {error && <InlineError message={error} onDismiss={clearError} />}

      {isLoading && favorites.length === 0 ? (
        <ListSkeleton count={5} />
      ) : favorites.length === 0 ? (
        <EmptyState
          icon={
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} className="text-tg-hint" style={{ opacity: 0.5 }}>
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
                    // Refresh properties store to update is_favorite there too
                    await fetchProperties(true);
                  } catch {
                    // Error already handled in store
                  }
                }}
              />
            ))}
          </div>

          {/* Load More / Pagination */}
          {hasMore && (
            <div className="pt-4">
              <button
                onClick={handleMainButtonClick}
                disabled={isLoadingMore}
                className="w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                  border: '1px solid var(--tg-theme-hint-color)',
                  color: 'var(--tg-theme-text-color)',
                }}
              >
                {isLoadingMore ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Загрузка...
                  </>
                ) : (
                  `Показать ещё ${Math.min(20, total - favorites.length)} из ${total}`
                )}
              </button>
            </div>
          )}

          {!hasMore && favorites.length > 0 && (
            <p className="text-center text-tg-hint text-sm py-4" style={{ color: 'var(--tg-theme-hint-color)' }}>
              Все {total} избранных загружены
            </p>
          )}
        </>
      )}

      {/* Footer info */}
      <p className="text-center text-tg-hint text-sm pt-8" style={{ color: 'var(--tg-theme-hint-color)' }}>
        BELDOMiK 🇧🇾 — недвижимость Беларуси
      </p>
    </div>
  );
}