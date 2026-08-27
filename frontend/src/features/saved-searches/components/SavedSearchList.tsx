import { useEffect, useCallback } from 'react';
import { useSavedSearchesStore } from '../savedSearchesStore';
import { SavedSearchCard } from './SavedSearchCard';
import { EmptyState, ListSkeleton, InlineError } from '@/shared/ui';
import type { SavedSearch } from '@/shared/api/types';

interface SavedSearchListProps {
  onApplySearch: (filtersJson: string) => void;
  onEditSearch: (savedSearch: SavedSearch) => void;
}

export function SavedSearchList({ onApplySearch, onEditSearch }: SavedSearchListProps) {
  const {
    savedSearches,
    isLoading,
    error,
    fetchSavedSearches,
    clearError,
  } = useSavedSearchesStore();

  const handleRetry = useCallback(() => {
    clearError();
    fetchSavedSearches();
  }, [clearError, fetchSavedSearches]);

  // Load saved searches on mount
  useEffect(() => {
    fetchSavedSearches();
  }, [fetchSavedSearches]);

  if (isLoading && savedSearches.length === 0) {
    return <ListSkeleton count={3} />;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <InlineError message={error} onDismiss={clearError} />
        <button
          onClick={handleRetry}
          className="w-full py-3 px-4 rounded-xl font-medium"
          style={{
            backgroundColor: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
          }}
        >
          Повторить загрузку
        </button>
      </div>
    );
  }

  if (savedSearches.length === 0) {
    return (
      <EmptyState
        icon={
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} className="text-tg-hint" style={{ opacity: 0.5 }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <path d="M8 12h8" />
            <path d="M12 8v8" />
          </svg>
        }
        title="Нет сохранённых поисков"
        description="Создайте первый сохранённый поиск на странице каталога, чтобы получать уведомления о новых объявлениях"
        action={{ label: 'Перейти в каталог', onClick: () => onApplySearch('{}') }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {savedSearches.map((savedSearch) => (
        <SavedSearchCard
          key={savedSearch.id}
          savedSearch={savedSearch}
          onApply={onApplySearch}
          onEdit={onEditSearch}
        />
      ))}
    </div>
  );
}