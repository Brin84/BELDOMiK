import { useEffect, useMemo, useState } from 'react';
import { Layers } from 'lucide-react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { pickerOverlayOpen } from '@/shared/lib/backButton';
import { PickerScreen, PickerRow } from '@/shared/ui/picker/PickerScreen';
import { getCategoryIcon } from '@/shared/lib/propertyCategories';
import type { PropertyType } from '@/shared/api/types';

interface PropertyTypePickerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Выбранный type_id (undefined — «любой тип»). */
  selectedTypeId: number | undefined;
  propertyTypes: PropertyType[];
  onSelect: (typeId: number | undefined) => void;
}

/**
 * Полноэкранный выбор типа недвижимости в стиле «Вся Беларусь»:
 * шапка, поиск, строки-карточки с иконкой категории и галочкой.
 * Открывается поверх шторки «Все фильтры».
 */
export function PropertyTypePicker({
  isOpen,
  onClose,
  selectedTypeId,
  propertyTypes,
  onSelect,
}: PropertyTypePickerProps) {
  const { trigger } = useHaptics();
  const { backButton } = useTelegram();
  const [query, setQuery] = useState('');

  // Пока открыт выбор — Telegram-кнопка «Назад» закрывает его, а не шторку
  // под ним. Флаг общий, чтобы обработчик шторки тоже знал, что его не
  // трогать (см. FilterBottomSheet).
  useEffect(() => {
    if (!isOpen) return;

    pickerOverlayOpen.current = true;
    const handleBack = () => {
      trigger('light');
      onClose();
    };
    backButton.show();
    backButton.onClick(handleBack);
    return () => {
      backButton.offClick(handleBack);
      pickerOverlayOpen.current = false;
    };
  }, [isOpen, onClose, trigger, backButton]);

  // Сброс поиска при открытии, чтобы каждый заход начинался чисто.
  useEffect(() => {
    if (isOpen) setQuery('');
  }, [isOpen]);

  const trimmedQuery = query.trim().toLowerCase();

  const filteredTypes = useMemo(() => {
    const sorted = [...propertyTypes].sort((a, b) => a.sort_order - b.sort_order);
    if (!trimmedQuery) return sorted;
    return sorted.filter(
      (t) =>
        t.name.toLowerCase().includes(trimmedQuery) ||
        t.name_plural.toLowerCase().includes(trimmedQuery),
    );
  }, [propertyTypes, trimmedQuery]);

  const handleSelect = (typeId: number | undefined) => {
    trigger('selection');
    onSelect(typeId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <PickerScreen
      title="Тип недвижимости"
      subtitle="Выберите тип объявления"
      searchPlaceholder="Поиск типа недвижимости"
      query={query}
      onQueryChange={setQuery}
      onClose={onClose}
    >
      {/* «Любой тип» — снять фильтр по типу */}
      <PickerRow
        label="Любой тип"
        icon={Layers}
        active={selectedTypeId === undefined}
        onClick={() => handleSelect(undefined)}
      />

      <h3 className="picker-section__title">Типы недвижимости</h3>
      {filteredTypes.length === 0 ? (
        <p className="picker-empty">«{query.trim()}» ничего не найдено</p>
      ) : (
        filteredTypes.map((type) => {
          const Icon = getCategoryIcon(type.category);
          return (
            <PickerRow
              key={type.id}
              label={type.name}
              icon={Icon}
              active={selectedTypeId === type.id}
              onClick={() => handleSelect(type.id)}
            />
          );
        })
      )}
    </PickerScreen>
  );
}
