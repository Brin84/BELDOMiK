import { useEffect, useState } from 'react';
import { useHaptics } from '@/shared/lib/haptics';
import { useAuthStore } from '@/features/auth';
import { useNotesStore } from '@/features/notes';

interface PropertyNoteSectionProps {
  propertyId: number;
}

export function PropertyNoteSection({ propertyId }: PropertyNoteSectionProps) {
  const { trigger } = useHaptics();
  const { status } = useAuthStore();
  const isAuthenticated = status === 'authenticated';

  const { note, fetchNote, saveNote, deleteNote } = useNotesStore();

  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNote(propertyId);
    }
  }, [isAuthenticated, propertyId, fetchNote]);

  useEffect(() => {
    if (note) {
      setText(note.text);
    }
  }, [note]);

  const handleSave = async () => {
    if (!text.trim()) return;
    setIsSaving(true);
    trigger('light');
    const ok = await saveNote(propertyId, text.trim());
    if (ok) setIsEditing(false);
    setIsSaving(false);
  };

  const handleDelete = async () => {
    trigger('medium');
    await deleteNote(propertyId);
    setText('');
    setIsEditing(false);
  };

  if (!isAuthenticated) return null;

  return (
    <div
      className="p-4 rounded-xl space-y-2"
      style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-tg-text">📝 Заметка</h3>
        {!isEditing && note && (
          <div className="flex gap-1">
            <button
              onClick={() => { trigger('light'); setIsEditing(true); setText(note.text); }}
              className="p-1.5 rounded-lg"
              style={{ color: 'var(--tg-theme-hint-color)' }}
              aria-label="Редактировать заметку"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg"
              style={{ color: 'var(--tg-theme-destructive-color, #ff3b30)' }}
              aria-label="Удалить заметку"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={10000}
            rows={3}
            placeholder="Ваша заметка об этом объявлении..."
            className="w-full px-3 py-2 rounded-lg outline-none text-sm resize-none"
            style={{
              backgroundColor: 'var(--tg-theme-bg-color)',
              color: 'var(--tg-theme-text-color)',
              border: '1px solid var(--tg-theme-hint-color)',
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving || !text.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
              style={{
                backgroundColor: 'var(--tg-theme-button-color)',
                color: 'var(--tg-theme-button-text-color)',
              }}
            >
              {isSaving ? '...' : 'Сохранить'}
            </button>
            <button
              onClick={() => { setIsEditing(false); setText(note?.text || ''); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                color: 'var(--tg-theme-text-color)',
              }}
            >
              Отмена
            </button>
          </div>
        </div>
      ) : note ? (
        <p className="text-sm text-tg-text" style={{ opacity: 0.9, whiteSpace: 'pre-wrap' }}>
          {note.text}
        </p>
      ) : (
        <button
          onClick={() => { trigger('light'); setIsEditing(true); setText(''); }}
          className="w-full text-left text-sm py-1"
          style={{ color: 'var(--tg-theme-hint-color)' }}
        >
          + Добавить заметку
        </button>
      )}
    </div>
  );
}
