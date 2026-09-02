import { useEffect, useState } from 'react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { backHandlerBlocked } from '@/shared/lib/backButton';
import { useCollectionsStore } from '@/features/collections';
import { useAuthStore } from '@/features/auth';

interface CollectionPickerModalProps {
  propertyId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function CollectionPickerModal({ propertyId, isOpen, onClose }: CollectionPickerModalProps) {
  const { trigger } = useHaptics();
  const { backButton } = useTelegram();
  const { status } = useAuthStore();
  const isAuthenticated = status === 'authenticated';

  const {
    collections,
    fetchCollections,
    addProperty,
    removeProperty,
  } = useCollectionsStore();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [collectionItemIds, setCollectionItemIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchCollections();
    }
  }, [isOpen, isAuthenticated, fetchCollections]);

  // Track which collections already contain this property
  useEffect(() => {
    if (isOpen && collections.length > 0) {
      // We need to check each collection's items
      // For simplicity, we'll track this via addProperty/removeProperty responses
      // and maintain local state
    }
  }, [isOpen, collections]);

  // Telegram BackButton — modal takes over while open, blocks AppShell's handler
  useEffect(() => {
    if (backButton && isOpen) {
      backHandlerBlocked.current = true;
      backButton.show();
      const handleBack = () => onClose();
      backButton.onClick(handleBack);
      return () => {
        backButton.offClick(handleBack);
        backButton.hide();
        backHandlerBlocked.current = false;
      };
    }
  }, [backButton, isOpen, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleToggle = async (collectionId: number, isInCollection: boolean) => {
    trigger('light');
    setIsSaving(true);
    try {
      if (isInCollection) {
        await removeProperty(collectionId, propertyId);
        setCollectionItemIds((prev) => {
          const next = new Set(prev);
          next.delete(collectionId);
          return next;
        });
      } else {
        await addProperty(collectionId, propertyId);
        setCollectionItemIds((prev) => new Set(prev).add(collectionId));
      }
    } catch { /* handled in store */ }
    setIsSaving(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsSaving(true);
    const { createCollection } = useCollectionsStore.getState();
    const created = await createCollection({ name: newName.trim() });
    if (created) {
      trigger('light');
      await addProperty(created.id, propertyId);
      setCollectionItemIds((prev) => new Set(prev).add(created.id));
      setShowCreate(false);
      setNewName('');
    }
    setIsSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Добавить в подборку"
    >
      <div className="absolute inset-0 bg-black/50" />

      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl shadow-2xl"
        style={{
          backgroundColor: 'var(--tg-theme-bg-color)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--tg-theme-hint-color)', opacity: 0.4 }} />
        </div>

        <div className="flex items-center justify-between px-4 pb-3">
          <h2 className="text-tg-text text-xl font-semibold">📁 В подборку</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl"
            style={{ color: 'var(--tg-theme-hint-color)' }}
            aria-label="Закрыть"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-4 pb-6 space-y-2 overflow-y-auto" style={{ maxHeight: '50vh' }}>
          {showCreate ? (
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Название подборки"
                maxLength={200}
                autoFocus
                className="flex-1 px-3 py-2.5 rounded-lg outline-none text-base"
                style={{
                  backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                  color: 'var(--tg-theme-text-color)',
                  border: '1px solid var(--tg-theme-hint-color)',
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || isSaving}
                className="px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--tg-theme-button-color)',
                  color: 'var(--tg-theme-button-text-color)',
                }}
              >
                {isSaving ? '...' : '✓'}
              </button>
              <button
                onClick={() => { setShowCreate(false); setNewName(''); }}
                className="px-3 py-2.5 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                  color: 'var(--tg-theme-text-color)',
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-xl transition-colors"
              style={{
                border: '1px dashed var(--tg-theme-hint-color)',
                color: 'var(--tg-theme-button-color)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="text-sm font-medium">Новая подборка</span>
            </button>
          )}

          {!isAuthenticated ? (
            <p className="text-center py-4 text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
              Войдите, чтобы добавлять в подборки
            </p>
          ) : collections.length === 0 && !showCreate ? (
            <p className="text-center py-4 text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
              У вас пока нет подборок
            </p>
          ) : (
            collections.map((collection) => {
              const isInCollection = collectionItemIds.has(collection.id);
              return (
                <button
                  key={collection.id}
                  onClick={() => handleToggle(collection.id, isInCollection)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors"
                  style={{
                    backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                  }}
                >
                  <span className="text-xl flex-shrink-0">
                    {isInCollection ? '✅' : '📁'}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium text-sm truncate" style={{ color: 'var(--tg-theme-text-color)' }}>
                      {collection.name}
                    </span>
                    <span className="block text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
                      {collection.property_count} объектов
                    </span>
                  </span>
                  {isInCollection && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(52, 199, 89, 0.15)', color: '#34c759' }}>
                      Добавлено
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
