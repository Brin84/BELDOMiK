import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHaptics } from '@/shared/lib/haptics';
import { useAuthStore } from '@/features/auth';
import { useCollectionsStore } from '@/features/collections';
import { EmptyState, InlineError, ListSkeleton } from '@/shared/ui';

export function CollectionsPage() {
  const navigate = useNavigate();
  const { trigger } = useHaptics();
  const { status } = useAuthStore();
  const isAuthenticated = status === 'authenticated';

  const { collections, isLoading, isSaving, error, fetchCollections, createCollection, clearError } =
    useCollectionsStore();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchCollections();
    }
  }, [isAuthenticated, fetchCollections]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const created = await createCollection({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
    });
    if (created) {
      trigger('light');
      setShowCreate(false);
      setNewName('');
      setNewDescription('');
      navigate(`/collections/${created.id}`);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4 space-y-6 pb-20">
        <EmptyState
          title="Войдите, чтобы увидеть подборки"
          description="Авторизуйтесь через Telegram, чтобы создавать подборки понравившихся объектов"
          action={{ label: 'Войти', onClick: () => {} }}
        />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-tg-text text-2xl font-bold">📁 Подборки</h1>
        <span className="text-tg-hint text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
          {collections.length} шт.
        </span>
      </div>

      {error && <InlineError message={error} onDismiss={clearError} />}

      {/* Create form */}
      {showCreate && (
        <div
          className="p-4 rounded-xl space-y-3"
          style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
        >
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Название подборки"
            maxLength={200}
            className="w-full px-3 py-2.5 rounded-lg outline-none text-base"
            style={{
              backgroundColor: 'var(--tg-theme-bg-color)',
              color: 'var(--tg-theme-text-color)',
              border: '1px solid var(--tg-theme-hint-color)',
            }}
          />
          <input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Описание (необязательно)"
            maxLength={2000}
            className="w-full px-3 py-2.5 rounded-lg outline-none text-base"
            style={{
              backgroundColor: 'var(--tg-theme-bg-color)',
              color: 'var(--tg-theme-text-color)',
              border: '1px solid var(--tg-theme-hint-color)',
            }}
          />
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreate}
              disabled={isSaving || !newName.trim()}
              className="flex-1 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
              style={{
                backgroundColor: 'var(--tg-theme-button-color)',
                color: 'var(--tg-theme-button-text-color)',
              }}
            >
              {isSaving ? 'Создание...' : 'Создать'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
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
      )}

      {isLoading && collections.length === 0 ? (
        <ListSkeleton count={3} />
      ) : collections.length === 0 && !showCreate ? (
        <EmptyState
          icon={<span className="text-5xl mb-2">📁</span>}
          title="Пока нет подборок"
          description="Создавайте подборки, чтобы группировать понравившиеся объекты — например, «Квартиры у метро» или «Дома до $100 000»"
          action={{ label: 'Создать подборку', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <>
          {!showCreate && collections.length > 0 && (
            <button
              onClick={() => { trigger('light'); setShowCreate(true); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium"
              style={{
                backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                border: '1px dashed var(--tg-theme-hint-color)',
                color: 'var(--tg-theme-button-color)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Новая подборка
            </button>
          )}

          <div className="space-y-3">
            {collections.map((collection) => (
              <button
                key={collection.id}
                onClick={() => { trigger('light'); navigate(`/collections/${collection.id}`); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors"
                style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
              >
                <span className="text-2xl flex-shrink-0">📁</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-medium text-sm truncate" style={{ color: 'var(--tg-theme-text-color)' }}>
                    {collection.name}
                  </span>
                  {collection.description && (
                    <span className="block text-xs truncate" style={{ color: 'var(--tg-theme-hint-color)' }}>
                      {collection.description}
                    </span>
                  )}
                </span>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
                  {collection.property_count}
                </span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
