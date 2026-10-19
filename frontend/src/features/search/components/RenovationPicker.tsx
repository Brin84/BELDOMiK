import { useEffect, useState } from 'react';
import { PaintRoller } from 'lucide-react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { pickerOverlayOpen } from '@/shared/lib/backButton';
import { PickerScreen, PickerRow } from '@/shared/ui/picker/PickerScreen';

interface RenovationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Выбранный вид ремонта (undefined — «любой ремонт»). */
  selected: string | undefined;
  renovationTypes: string[];
  onSelect: (renovation: string | undefined) => void;
}

/**
 * Полноэкранный выбор вида ремонта в стиле «Вся Беларусь»:
 * шапка, поиск, строки-карточки с галочкой. Открывается поверх шторки
 * «Все фильтры».
 */
export function RenovationPicker({
  isOpen,
  onClose,
  selected,
  renovationTypes,
  onSelect,
}: RenovationPickerProps) {
  const { trigger } = useHaptics();
  const { backButton } = useTelegram();
  const [query, setQuery] = useState('');

  // Telegram-кнопка «Назад» закрывает выбор, а не шторку под ним.
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
  const filtered = trimmedQuery
    ? renovationTypes.filter((r) => r.toLowerCase().includes(trimmedQuery))
    : renovationTypes;

  const handleSelect = (renovation: string | undefined) => {
    trigger('selection');
    onSelect(renovation);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <PickerScreen
      title="Ремонт"
      subtitle="Выберите состояние отделки"
      searchPlaceholder="Поиск вида ремонта"
      query={query}
      onQueryChange={setQuery}
      onClose={onClose}
    >
      {/* «Любой ремонт» — снять фильтр */}
      <PickerRow
        label="Любой ремонт"
        icon={PaintRoller}
        active={selected === undefined}
        onClick={() => handleSelect(undefined)}
      />

      <h3 className="picker-section__title">Виды ремонта</h3>
      {filtered.length === 0 ? (
        <p className="picker-empty">«{query.trim()}» ничего не найдено</p>
      ) : (
        filtered.map((renovation) => (
          <PickerRow
            key={renovation}
            label={renovation}
            active={selected === renovation}
            onClick={() => handleSelect(renovation)}
          />
        ))
      )}
    </PickerScreen>
  );
}
