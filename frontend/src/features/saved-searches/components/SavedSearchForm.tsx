import { useState, useEffect } from 'react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { backHandlerBlocked } from '@/shared/lib/backButton';
import { useSavedSearchesStore } from '../savedSearchesStore';
import { usePropertiesStore } from '@/features/properties/propertiesStore';
import type { SavedSearch, SavedSearchCreate, SavedSearchUpdate } from '@/shared/api/types';

const FREQUENCY_OPTIONS = [
  { value: 'immediate' as const, label: '🔔 Мгновенно', description: 'Уведомлять сразу при появлении' },
  { value: 'daily' as const, label: '📅 Ежедневно', description: 'Одна сводка в день' },
  { value: 'weekly' as const, label: '📅 Еженедельно', description: 'Одна сводка в неделю' },
  { value: 'disabled' as const, label: '🔕 Не уведомлять', description: 'Только сохранять поиск' },
];

interface SavedSearchFormProps {
  initialData?: SavedSearch;
  onClose: () => void;
  onSuccess: () => void;
}

export function SavedSearchForm({ initialData, onClose, onSuccess }: SavedSearchFormProps) {
  const { trigger } = useHaptics();
  const { mainButton, backButton } = useTelegram();
  const { createSavedSearch, updateSavedSearch, isLoading } = useSavedSearchesStore();
  const { filters } = usePropertiesStore();

  const isEditing = !!initialData;

  const [name, setName] = useState(initialData?.name || '');
  const [notifyFrequency, setNotifyFrequency] = useState<SavedSearchCreate['notify_frequency']>(
    initialData?.notify_frequency || 'daily'
  );
  const [filtersJson, setFiltersJson] = useState(initialData?.filters_json || JSON.stringify(filters));
  const [error, setError] = useState<string | null>(null);

  // Initialize with current filters if creating new
  useEffect(() => {
    if (!isEditing && !initialData) {
      setFiltersJson(JSON.stringify(filters));
    }
  }, [isEditing, initialData, filters]);

  // Setup Telegram buttons
  useEffect(() => {
    if (mainButton) {
      mainButton.setParams({
        text: isEditing ? 'Сохранить изменения' : 'Создать поиск',
        is_visible: true,
        is_active: name.trim().length > 0,
      });
      mainButton.show();

      const handleClick = async () => {
        trigger('medium');
        await handleSubmit();
      };
      mainButton.onClick(handleClick);

      return () => {
        mainButton.hide();
        mainButton.offClick(handleClick);
      };
    }
  }, [mainButton, isEditing, name, trigger]);

  useEffect(() => {
    if (backButton) {
      backHandlerBlocked.current = true;
      backButton.show();
      const handleBack = () => {
        trigger('light');
        onClose();
      };
      backButton.onClick(handleBack);
      return () => {
        backButton.hide();
        backButton.offClick(handleBack);
        backHandlerBlocked.current = false;
      };
    }
  }, [backButton, trigger, onClose]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Введите название поиска');
      trigger('error');
      return;
    }

    setError(null);

    try {
      if (isEditing && initialData) {
        const updateData: SavedSearchUpdate = {
          name: name.trim(),
          filters_json: filtersJson,
          notify_frequency: notifyFrequency,
        };
        await updateSavedSearch(initialData.id, updateData);
      } else {
        const createData: SavedSearchCreate = {
          name: name.trim(),
          filters_json: filtersJson,
          notify_frequency: notifyFrequency,
        };
        await createSavedSearch(createData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка при сохранении';
      setError(message);
      trigger('error');
    }
  };

  const handleClose = () => {
    trigger('light');
    onClose();
  };

  return (
    <div className="p-4 space-y-6 pb-24" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))' }}>
      <h1 className="text-tg-text text-2xl font-bold">{isEditing ? 'Редактировать поиск' : 'Создать сохранённый поиск'}</h1>

      {error && (
        <div
          className="p-4 rounded-xl"
          style={{
            backgroundColor: 'rgba(255, 59, 48, 0.1)',
            border: '1px solid rgba(255, 59, 48, 0.3)',
          }}
          role="alert"
        >
          <p className="text-sm" style={{ color: 'var(--tg-theme-text-color)' }}>{error}</p>
        </div>
      )}

      {/* Name Field */}
      <div className="space-y-2">
        <label className="text-tg-text text-sm font-medium block">Название поиска</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например: «2-к квартира в Минске до $500»"
          className="w-full px-4 py-3 rounded-xl text-tg-text text-base"
          style={{
            backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            border: '1px solid var(--tg-theme-hint-color)',
            color: 'var(--tg-theme-text-color)',
          }}
          maxLength={100}
          autoFocus
        />
        <p className="text-tg-hint text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
          {name.length}/100
        </p>
      </div>

      {/* Frequency Selector */}
      <div className="space-y-2">
        <label className="text-tg-text text-sm font-medium block">Частота уведомлений</label>
        <div className="space-y-2" role="radiogroup" aria-label="Частота уведомлений">
          {FREQUENCY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                trigger('light');
                setNotifyFrequency(option.value);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                notifyFrequency === option.value ? 'ring-2' : ''
              }`}
              style={{
                backgroundColor: notifyFrequency === option.value
                  ? 'var(--tg-theme-button-color)'
                  : 'var(--tg-theme-secondary-bg-color)',
                color: notifyFrequency === option.value
                  ? 'var(--tg-theme-button-text-color)'
                  : 'var(--tg-theme-text-color)',
                border: notifyFrequency === option.value
                  ? 'none'
                  : '1px solid var(--tg-theme-hint-color)',
                borderColor: notifyFrequency === option.value
                  ? 'var(--tg-theme-button-color)'
                  : 'var(--tg-theme-hint-color)',
              }}
              role="radio"
              aria-checked={notifyFrequency === option.value}
            >
              <span className="flex-shrink-0" style={{ fontSize: '20px' }}>
                {option.label.split(' ')[0]}
              </span>
              <div className="flex-1 min-w-0">
                <span className="font-medium block truncate">{option.label.split(' ').slice(1).join(' ')}</span>
                <span className="text-xs block truncate" style={{ color: notifyFrequency === option.value ? 'rgba(255,255,255,0.7)' : 'var(--tg-theme-hint-color)' }}>
                  {option.description}
                </span>
              </div>
              {notifyFrequency === option.value && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="flex-shrink-0" style={{ color: 'var(--tg-theme-button-text-color)' }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Current Filters Preview */}
      <div className="space-y-2">
        <label className="text-tg-text text-sm font-medium block">Текущие фильтры</label>
        <div className="p-3 rounded-xl text-left" style={{ backgroundColor: 'var(--tg-theme-tertiary-bg-color, var(--tg-theme-secondary-bg-color))' }}>
          <pre className="text-xs whitespace-pre-wrap break-all" style={{ color: 'var(--tg-theme-text-color)' }}>
            {filtersJson}
          </pre>
        </div>
        <p className="text-tg-hint text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
          Фильтры берутся из текущих настроек каталога. Измените их на странице поиска перед сохранением.
        </p>
      </div>

      {/* Cancel button */}
      <button
        onClick={handleClose}
        disabled={isLoading}
        className="w-full py-3 px-4 rounded-xl font-medium transition-colors"
        style={{
          backgroundColor: 'transparent',
          color: 'var(--tg-theme-text-color)',
          border: '1px solid var(--tg-theme-hint-color)',
        }}
      >
        Отмена
      </button>
    </div>
  );
}