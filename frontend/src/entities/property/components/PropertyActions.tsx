import { useState } from 'react';
import { useHaptics } from '@/shared/lib/haptics';
import { useShare } from '@/shared/lib/share';

interface PropertyActionsProps {
  propertyId: number;
  isFavorite: boolean;
  favoritesCount: number;
  onFavoriteToggle?: (propertyId: number, isCurrentlyFavorite: boolean) => Promise<void>;
  propertyTitle?: string;
  propertyUrl?: string;
}

export function PropertyActions({
  propertyId,
  isFavorite,
  favoritesCount,
  onFavoriteToggle,
  propertyTitle = 'Объявление',
  propertyUrl,
}: PropertyActionsProps) {
  const { trigger } = useHaptics();
  const { share } = useShare();
  const [localIsFavorite, setLocalIsFavorite] = useState(isFavorite);
  const [localFavoritesCount, setLocalFavoritesCount] = useState(favoritesCount);
  const [isToggling, setIsToggling] = useState(false);

  const handleFavoriteClick = async () => {
    if (isToggling) return;
    trigger('light');
    setIsToggling(true);
    const newFavoriteState = !localIsFavorite;
    setLocalIsFavorite(newFavoriteState);
    setLocalFavoritesCount(prev => newFavoriteState ? prev + 1 : prev - 1);

    try {
      if (onFavoriteToggle) {
        await onFavoriteToggle(propertyId, localIsFavorite);
      }
      // TODO: Call actual API endpoint when implemented
      // await api.favorites.toggle(propertyId);
    } catch (error) {
      // Revert on error
      setLocalIsFavorite(localIsFavorite);
      setLocalFavoritesCount(favoritesCount);
      trigger('error');
      console.error('Failed to toggle favorite:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const handleShareClick = async () => {
    trigger('light');
    const url = propertyUrl || (typeof window !== 'undefined' ? window.location.href : '');
    const text = `${propertyTitle} на BELDOMiK`;
    try {
      await share({ title: propertyTitle, text, url });
    } catch (error) {
      // Share API might not be available or user cancelled
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Share failed:', error);
      }
    }
  };

  return (
    <section className="bg-tg-bg rounded-2xl p-4">
      <div className="flex items-center gap-3">
        {/* Favorite button */}
        <button
          onClick={handleFavoriteClick}
          disabled={isToggling}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200"
          style={{
            backgroundColor: localIsFavorite
              ? 'var(--tg-theme-button-color)'
              : 'var(--tg-theme-secondary-bg-color)',
            color: localIsFavorite
              ? 'var(--tg-theme-button-text-color)'
              : 'var(--tg-theme-text-color)',
            border: localIsFavorite ? 'none' : '1px solid var(--tg-theme-hint-color)',
            borderWidth: localIsFavorite ? '0' : '0.5px',
            opacity: isToggling ? 0.6 : 1,
          }}
          aria-label={localIsFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
          aria-pressed={localIsFavorite}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={localIsFavorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={2}
            className="flex-shrink-0"
            style={{ color: localIsFavorite ? 'inherit' : 'var(--tg-theme-button-color)' }}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span className="text-sm">{localFavoritesCount > 0 ? localFavoritesCount : ''}</span>
        </button>

        {/* Share button */}
        <button
          onClick={handleShareClick}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200"
          style={{
            backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            color: 'var(--tg-theme-text-color)',
            border: '1px solid var(--tg-theme-hint-color)',
            borderWidth: '0.5px',
          }}
          aria-label="Поделиться"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--tg-theme-button-color)' }}>
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span className="text-sm">Поделиться</span>
        </button>
      </div>
    </section>
  );
}