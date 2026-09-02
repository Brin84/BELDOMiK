import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHaptics } from '@/shared/lib/haptics';
import { useCollectionsStore } from '@/features/collections';
import { useFavoritesStore } from '@/features/favorites';
import { PropertyCard } from '@/entities/property';
import { EmptyState, InlineError, ListSkeleton } from '@/shared/ui';

export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const collectionId = Number(id);
  const navigate = useNavigate();
  const { trigger } = useHaptics();

  const { current, isLoading, isSaving, error, fetchCollection, updateCollection, deleteCollection, removeProperty, clearError } =
    useCollectionsStore();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (collectionId) {
      fetchCollection(collectionId);
    }
  }, [collectionId, fetchCollection]);

  const handleDelete = async () => {
    trigger('medium');
    await deleteCollection(collectionId);
    navigate('/collections');
  };

  const handleRename = async () => {
    if (!editName.trim()) return;
    trigger('light');
    await updateCollection(collectionId, { name: editName.trim() });
    setEditing(false);
  };

  if (isLoading && !current) {
    return (
      <div className="p-4 space-y-6 pb-24">
        <ListSkeleton count={3} />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="p-4 space-y-6 pb-24">
        <EmptyState title="Подборка не найдена" description="Возможно, она была удалена" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      {error && <InlineError message={error} onDismiss={clearError} />}

      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={200}
                autoFocus
                className="w-full px-3 py-2 rounded-lg outline-none text-lg font-bold"
                style={{
                  backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                  color: 'var(--tg-theme-text-color)',
                  border: '1px solid var(--tg-theme-hint-color)',
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleRename}
                  disabled={isSaving || !editName.trim()}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{ backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}
                >
                  Сохранить
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', color: 'var(--tg-theme-text-color)' }}
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <h1 className="text-tg-text text-2xl font-bold">📁 {current.name}</h1>
          )}
          {current.description && !editing && (
            <p className="text-tg-hint text-sm mt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
              {current.description}
            </p>
          )}
          <p className="text-tg-hint text-xs mt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
            {current.items.length} объектов
          </p>
        </div>

        <div className="flex gap-1 flex-shrink-0">
          {!editing && (
            <button
              onClick={() => { trigger('light'); setEditing(true); setEditName(current.name); }}
              className="p-2 rounded-lg"
              style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
              aria-label="Переименовать"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--tg-theme-hint-color)' }}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          <button
            onClick={() => { if (showDeleteConfirm) handleDelete(); else { trigger('light'); setShowDeleteConfirm(true); } }}
            className="p-2 rounded-lg"
            style={{
              backgroundColor: showDeleteConfirm ? 'var(--tg-theme-destructive-color, #ff3b30)' : 'var(--tg-theme-secondary-bg-color)',
            }}
            aria-label="Удалить подборку"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: showDeleteConfirm ? '#fff' : 'var(--tg-theme-hint-color)' }}>
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      {showDeleteConfirm && !editing && (
        <div
          className="p-3 rounded-xl text-sm"
          style={{ backgroundColor: 'rgba(255, 59, 48, 0.12)', color: 'var(--tg-theme-destructive-color, #ff3b30)' }}
        >
          Удалить подборку «{current.name}»? Нажмите на корзину ещё раз для подтверждения.
        </div>
      )}

      {current.items.length === 0 ? (
        <EmptyState
          icon={<span className="text-5xl mb-2">🗂</span>}
          title="Подборка пуста"
          description="Добавляйте объявления в подборку кнопкой «В подборку» на странице объекта"
          action={{ label: 'К объявлениям', onClick: () => navigate('/catalog') }}
        />
      ) : (
        <div className="space-y-3">
          {current.items.map((property) => (
            <div key={property.id} className="relative">
              <PropertyCard
                property={property}
                onFavoriteToggle={async (propertyId) => {
                  trigger('light');
                  try {
                    await useFavoritesStore.getState().toggleFavorite(propertyId);
                  } catch { /* handled in store */ }
                }}
              />
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  trigger('light');
                  await removeProperty(collectionId, property.id);
                }}
                className="absolute bottom-14 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow"
                style={{
                  backgroundColor: 'rgba(255, 59, 48, 0.9)',
                  color: 'white',
                  backdropFilter: 'blur(6px)',
                }}
                aria-label="Убрать из подборки"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
