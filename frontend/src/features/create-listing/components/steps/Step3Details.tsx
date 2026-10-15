import React, { useEffect, useState, useMemo } from 'react';
import { useHaptics } from '@/shared/lib/haptics';
import { useCreateListingStore } from '../../createListingStore';
import { useGeographyStore } from '@/features/geography/geographyStore';
import { BynSymbol } from '@/shared/ui';
import { ExpandablePicker, type ExpandableOption } from '../ExpandablePicker';

const REPAIR_TYPES = [
  'Без ремонта',
  'Косметический',
  'Евроремонт',
  'Дизайнерский',
  'Требует ремонта',
];

const HOUSE_TYPES = [
  'Кирпичный', 'Панельный', 'Блочный', 'Деревянный',
  'Каркасный', 'Монолитный', 'Щитовой', 'Другое',
];

const LAND_CATEGORIES = [
  'Земли населённых пунктов', 'Земли сельхозназначения',
  'Земли промышленности', 'Земли рекреации',
  'Лесной фонд', 'Водный фонд', 'Другое',
];

const GARAGE_TYPES = [
  'Капитальный', 'Железобетонный', 'Металлический',
  'Ракушка', 'Машиноместо', 'Бокс',
];

const COMMERCIAL_PURPOSES = [
  'Офис', 'Склад', 'Производство', 'Магазин', 'Общепит',
  'Гостиница', 'Автосервис', 'Медицинский центр',
  'Образование', 'Спорт', 'Другое',
];

// Дополнительные особенности (кроме балкона/лоджии — у них счётчики).
const EXTRA_FEATURES: { key: 'is_new_building' | 'has_furniture' | 'has_elevator' | 'has_parking'; label: string; icon: string }[] = [
  { key: 'is_new_building', label: 'Новостройка', icon: '🏗️' },
  { key: 'has_furniture', label: 'Мебель', icon: '🛋️' },
  { key: 'has_elevator', label: 'Лифт', icon: '🛗' },
  { key: 'has_parking', label: 'Парковка', icon: '🅿️' },
];

interface NumberInputProps {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder: string;
  min?: number;
  max?: number;
  unit?: string;
  required?: boolean;
}

function NumberInput({ label, value, onChange, placeholder, min, max, unit, required }: NumberInputProps) {
  const [inputValue, setInputValue] = useState(value?.toString() || '');

  useEffect(() => {
    setInputValue(value?.toString() || '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (val === '') {
      onChange(undefined);
    } else {
      const num = parseInt(val, 10);
      if (!isNaN(num) && (min === undefined || num >= min) && (max === undefined || num <= max)) {
        onChange(num);
      }
    }
  };

  return (
    <div className="flex-1">
      <label className="block text-sm mb-1" style={{ color: 'var(--bd-text-secondary)' }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <input
        type="number"
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        min={min}
        max={max}
        className="w-full px-4 py-3 rounded-xl text-base outline-none"
        style={{
          backgroundColor: 'var(--bd-bg-base)',
          border: '1px solid rgba(255,255,255,0.6)',
          color: 'var(--bd-text-primary)',
          boxShadow: 'inset 2px 2px 5px var(--bd-raise-dark), inset -2px -2px 5px var(--bd-raise-light)',
        }}
        inputMode="numeric"
      />
      {unit && (
        <p className="text-xs mt-1" style={{ color: 'var(--bd-text-secondary)' }}>{unit}</p>
      )}
    </div>
  );
}

/** Счётчик количества (балкон/лоджия): −  N  +  */
interface StepperProps {
  label: string;
  icon: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

function Stepper({ label, icon, value, onChange }: StepperProps) {
  const { trigger } = useHaptics();
  const count = value ?? 0;
  const setCount = (next: number) => {
    if (next < 0) next = 0;
    if (next > 10) next = 10;
    trigger('light');
    onChange(next === 0 ? undefined : next);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="text-2xl leading-none flex-shrink-0">{icon}</span>
      <span className="min-w-0 flex-1 text-[16px] font-medium" style={{ color: 'var(--bd-text-primary)' }}>{label}</span>
      <button
        type="button"
        onClick={() => setCount(count - 1)}
        className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-semibold transition-colors active:opacity-80"
        style={{
          backgroundColor: count > 0 ? 'rgba(37, 99, 235, 0.12)' : 'var(--bd-bg-base)',
          color: count > 0 ? 'var(--bd-accent-primary)' : 'var(--bd-text-secondary)',
          boxShadow: count > 0 ? 'var(--bd-shadow-raised)' : '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)'
        }}
        aria-label={`Уменьшить: ${label}`}
      >
        −
      </button>
      <span className="w-6 text-center text-base font-semibold tabular-nums" style={{ color: count > 0 ? 'var(--bd-text-primary)' : 'var(--bd-text-secondary)' }}>
        {count}
      </span>
      <button
        type="button"
        onClick={() => setCount(count + 1)}
        className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-semibold transition-colors active:opacity-80"
        style={{
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
          color: 'var(--bd-accent-primary)',
          boxShadow: 'var(--bd-shadow-raised)'
        }}
        aria-label={`Увеличить: ${label}`}
      >
        +
      </button>
    </div>
  );
}

type SectionName = 'repair' | 'metro' | 'features' | 'house_type' | 'land_cat' | 'garage_type' | 'comm_purpose';

export function Step3Details() {
  const { trigger } = useHaptics();
  const { updateFormData, formData, clearError, errors } = useCreateListingStore();
  const [openSection, setOpenSection] = useState<SectionName | null>(null);

  const {
    metroStations,
    fetchMetroLines,
    fetchMetroStations,
    getMetroLineById,
    propertyTypes,
  } = useGeographyStore();

  // Определяем категорию по выбранному типу недвижимости
  const propertyCategory = useMemo(() => {
    const type = propertyTypes.find(t => t.id === formData.property_type_id);
    return type?.category ?? 'apartment';
  }, [formData.property_type_id, propertyTypes]);

  // Категории, где показываем поля квартиры
  const isApartmentLike = propertyCategory === 'apartment';
  // Категории, где показываем метро
  const hasMetro = isApartmentLike || propertyCategory === 'house';
  // Категории с балконами/лоджиями
  const hasBalkon = isApartmentLike || propertyCategory === 'house' || propertyCategory === 'dacha';
  // Показывать ремонт (нет для land, garage)
  const hasRepair = propertyCategory !== 'land' && propertyCategory !== 'garage';
  // Показывать доп. особенности (квартира, дом, дача)
  const hasFeatures = isApartmentLike || propertyCategory === 'house' || propertyCategory === 'dacha';

  // Грузим линии и станции метро выбранного города — без них пикер пуст.
  useEffect(() => {
    if (formData.city_id > 0) {
      fetchMetroLines(formData.city_id);
      fetchMetroStations(formData.city_id);
    }
  }, [formData.city_id, fetchMetroLines, fetchMetroStations]);

  const repairOptions: ExpandableOption<string>[] = REPAIR_TYPES.map((r) => ({
    value: r,
    title: r,
  }));

  const houseTypeOptions: ExpandableOption<string>[] = HOUSE_TYPES.map((t) => ({
    value: t,
    title: t,
  }));

  const landCategoryOptions: ExpandableOption<string>[] = LAND_CATEGORIES.map((c) => ({
    value: c,
    title: c,
  }));

  const garageTypeOptions: ExpandableOption<string>[] = GARAGE_TYPES.map((t) => ({
    value: t,
    title: t,
  }));

  const commercialPurposeOptions: ExpandableOption<string>[] = COMMERCIAL_PURPOSES.map((p) => ({
    value: p,
    title: p,
  }));

  // Станции метро выбранного города с подписью линии.
  const metroOptions: ExpandableOption<number>[] = metroStations.map((station) => {
    const line = getMetroLineById(station.line_id);
    return {
      value: station.id,
      title: station.name,
      subtitle: line ? line.name : undefined,
      icon: line ? '🚇' : undefined,
    };
  });

  const selectedFeaturesCount = EXTRA_FEATURES.filter((f) => !!formData[f.key]).length;
  const selectedExtrasCount =
    (formData.balcony_count && formData.balcony_count > 0 ? 1 : 0) +
    (formData.loggia_count && formData.loggia_count > 0 ? 1 : 0) +
    selectedFeaturesCount +
    (formData.metro_station_id ? 1 : 0);

  const handleToggle = (section: SectionName) => {
    trigger('light');
    setOpenSection((prev) => (prev === section ? null : section));
  };

  const handleMetroChange = (stationId: number) => {
    trigger('selection');
    updateFormData({ metro_station_id: stationId });
    setOpenSection(null);
  };

  const handleMetroClear = () => {
    trigger('selection');
    updateFormData({ metro_station_id: undefined, metro_distance: undefined });
  };

  const setBalconyCount = (count: number | undefined) => {
    // «Есть балкон» (properties.balcony) синхронизируем со счётчиком: count > 0 ⇒ true —
    // фильтры каталога ищут по этому флагу, а количество хранится отдельно.
    updateFormData({ balcony_count: count, has_balcony: !!count && count > 0 });
  };

  return (
    <div className="p-4 space-y-6" style={{ backgroundColor: 'var(--bd-bg-base)' }}>
      {/* Description */}
      <section>
        <h2 style={{ color: 'var(--bd-text-primary)', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Описание</h2>
        <textarea
          value={formData.description}
          onChange={(e) => {
            trigger('selection');
            updateFormData({ description: e.target.value });
            clearError('description');
          }}
          placeholder="Опишите преимущества недвижимости, район, инфраструктуру, состояние..."
          rows={5}
          className="w-full px-4 py-3 rounded-xl text-base resize-none outline-none"
          style={{
            backgroundColor: 'var(--bd-bg-base)',
            border: errors.description ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.6)',
            color: 'var(--bd-text-primary)',
            boxShadow: 'inset 2px 2px 5px var(--bd-raise-dark), inset -2px -2px 5px var(--bd-raise-light)',
          }}
          maxLength={5000}
        />
        {errors.description && <p className="text-sm mt-1" style={{ color: '#ef4444' }}>{errors.description}</p>}
        <p className="text-xs mt-1 text-right" style={{ color: 'var(--bd-text-secondary)' }}>{(formData.description || '').length}/5000</p>
      </section>

      {/* Price (Kufar-модель: фикс. цена или «Договорная») */}
      <section>
        <h2 style={{ color: 'var(--bd-text-primary)', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
          Цена {!formData.is_negotiable && <span style={{ color: 'var(--bd-text-secondary)', fontWeight: 400 }}>*</span>}
        </h2>

        {/* Переключатель «Договорная цена» */}
        <div
          className="rounded-2xl p-4"
          style={{
            backgroundColor: 'var(--bd-bg-base)',
            border: formData.is_negotiable ? '1px solid var(--bd-accent-primary)' : '1px solid rgba(255,255,255,0.6)',
            boxShadow: '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[16px] font-semibold" style={{ color: 'var(--bd-text-primary)' }}>Договорная цена</div>
              <div className="text-[13px] mt-1 leading-snug" style={{ color: 'var(--bd-text-secondary)' }}>
                {formData.is_negotiable
                  ? 'Цена не публикуется — покупатели предложат свою'
                  : 'Укажите цену, или включите переключатель и цена будет скрыта'}
              </div>
            </div>
            <button
              role="switch"
              aria-checked={formData.is_negotiable}
              onClick={() => {
                trigger('selection');
                updateFormData({
                  is_negotiable: !formData.is_negotiable,
                  // При включении «Договорной» — обнуляем цену (Kufar: price=0)
                  price_byn: !formData.is_negotiable ? 0 : formData.price_byn,
                });
                clearError('price_byn');
              }}
              className="relative w-[52px] h-8 rounded-full transition-colors flex-shrink-0"
              style={{
                backgroundColor: formData.is_negotiable ? 'var(--bd-accent-primary)' : 'var(--bd-bg-base)',
                boxShadow: formData.is_negotiable
                  ? 'var(--bd-shadow-raised)'
                  : 'inset 2px 2px 4px var(--bd-raise-dark), inset -2px -2px 4px var(--bd-raise-light)'
              }}
            >
              <span
                className="absolute top-1 w-6 h-6 rounded-full shadow transition-all"
                style={{
                  backgroundColor: '#ffffff',
                  left: formData.is_negotiable ? '24px' : '4px',
                  boxShadow: '3px 3px 6px var(--bd-raise-dark), -3px -3px 6px var(--bd-raise-light)'
                }}
              />
            </button>
          </div>
        </div>

        {/* Поля цены — скрыты при «Договорной» */}
        {!formData.is_negotiable && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="flex-1">
              <label className="block text-sm mb-1" style={{ color: 'var(--bd-text-secondary)' }}>Цена в <BynSymbol /> *</label>
              <input
                type="number"
                value={formData.price_byn || ''}
                onChange={(e) => {
                  trigger('selection');
                  const val = e.target.value;
                  updateFormData({ price_byn: val === '' ? 0 : parseInt(val, 10) });
                  clearError('price_byn');
                }}
                placeholder="150000"
                className="w-full px-4 py-3 rounded-xl text-base outline-none"
                style={{
                  backgroundColor: 'var(--bd-bg-base)',
                  border: errors.price_byn ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.6)',
                  color: 'var(--bd-text-primary)',
                  boxShadow: 'inset 2px 2px 5px var(--bd-raise-dark), inset -2px -2px 5px var(--bd-raise-light)',
                }}
                inputMode="numeric"
                min="1"
                max="100000000"
              />
              {errors.price_byn && <p className="text-sm mt-1" style={{ color: '#ef4444' }}>{errors.price_byn}</p>}
            </div>
            <div className="flex-1">
              <label className="block text-sm mb-1" style={{ color: 'var(--bd-text-secondary)' }}>Цена в USD (опционально)</label>
              <input
                type="number"
                value={formData.price_usd || ''}
                onChange={(e) => {
                  trigger('selection');
                  const val = e.target.value;
                  updateFormData({ price_usd: val === '' ? undefined : parseInt(val, 10) });
                }}
                placeholder="45000"
                className="w-full px-4 py-3 rounded-xl text-base outline-none"
                style={{
                  backgroundColor: 'var(--bd-bg-base)',
                  border: '1px solid rgba(255,255,255,0.6)',
                  color: 'var(--bd-text-primary)',
                  boxShadow: 'inset 2px 2px 5px var(--bd-raise-dark), inset -2px -2px 5px var(--bd-raise-light)',
                }}
                inputMode="numeric"
                min="1"
                max="10000000"
              />
            </div>
          </div>
        )}
      </section>

      {/* Area, Rooms, Floor — единая секция, поля меняются по категории */}
      <section>
        <h2 style={{ color: 'var(--bd-text-primary)', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Параметры</h2>
        <div className="grid grid-cols-2 gap-3">

          {/* ── Квартира / дача ── */}
          {isApartmentLike && (
            <>
              <NumberInput
                label="Общая площадь (м²)"
                value={formData.area}
                onChange={(v) => { trigger('selection'); updateFormData({ area: v }); clearError('area'); }}
                placeholder="55"
                min={1}
                max={10000}
                unit="м²"
              />
              <NumberInput
                label="Комнат"
                value={formData.rooms}
                onChange={(v) => { trigger('selection'); updateFormData({ rooms: v }); clearError('rooms'); }}
                placeholder="2"
                min={0}
                max={50}
              />
              <NumberInput
                label="Этаж"
                value={formData.floor}
                onChange={(v) => { trigger('selection'); updateFormData({ floor: v }); clearError('floor'); }}
                placeholder="5"
                min={1}
                max={100}
              />
              <NumberInput
                label="Этажность"
                value={formData.floors_total}
                onChange={(v) => { trigger('selection'); updateFormData({ floors_total: v }); clearError('floors_total'); }}
                placeholder="9"
                min={1}
                max={100}
              />
            </>
          )}

          {/* ── Дом / дача ── */}
          {(propertyCategory === 'house' || propertyCategory === 'dacha') && (
            <>
              <NumberInput
                label="Площадь дома (м²)"
                value={formData.house_area}
                onChange={(v) => { trigger('selection'); updateFormData({ house_area: v }); }}
                placeholder="120"
                min={1}
                max={10000}
                unit="м²"
              />
              <NumberInput
                label="Площадь участка (соток)"
                value={formData.land_area}
                onChange={(v) => { trigger('selection'); updateFormData({ land_area: v }); }}
                placeholder="10"
                min={1}
                max={10000}
                unit="соток"
              />
              <NumberInput
                label="Год постройки"
                value={formData.build_year}
                onChange={(v) => { trigger('selection'); updateFormData({ build_year: v }); clearError('build_year'); }}
                placeholder="2005"
                min={1800}
                max={new Date().getFullYear() + 5}
              />
              <NumberInput
                label="Этажность дома"
                value={formData.floors_total}
                onChange={(v) => { trigger('selection'); updateFormData({ floors_total: v }); }}
                placeholder="2"
                min={1}
                max={10}
              />
            </>
          )}

          {/* ── Участок ── */}
          {propertyCategory === 'land' && (
            <>
              <NumberInput
                label="Площадь участка (соток)"
                value={formData.land_area}
                onChange={(v) => { trigger('selection'); updateFormData({ land_area: v }); }}
                placeholder="10"
                min={1}
                max={100000}
                unit="соток"
              />
              <NumberInput
                label="Общая площадь (м²)"
                value={formData.area}
                onChange={(v) => { trigger('selection'); updateFormData({ area: v }); }}
                placeholder="1000"
                min={1}
                max={1000000}
                unit="м²"
              />
            </>
          )}

          {/* ── Гараж / машиноместо ── */}
          {propertyCategory === 'garage' && (
            <>
              <NumberInput
                label="Площадь (м²)"
                value={formData.garage_area}
                onChange={(v) => { trigger('selection'); updateFormData({ garage_area: v }); }}
                placeholder="20"
                min={1}
                max={10000}
                unit="м²"
              />
              <NumberInput
                label="Год постройки"
                value={formData.build_year}
                onChange={(v) => { trigger('selection'); updateFormData({ build_year: v }); }}
                placeholder="2010"
                min={1800}
                max={new Date().getFullYear() + 5}
              />
            </>
          )}

          {/* ── Коммерческая недвижимость ── */}
          {propertyCategory === 'commercial' && (
            <>
              <NumberInput
                label="Общая площадь (м²)"
                value={formData.area}
                onChange={(v) => { trigger('selection'); updateFormData({ area: v }); }}
                placeholder="200"
                min={1}
                max={100000}
                unit="м²"
              />
              <NumberInput
                label="Этажность"
                value={formData.floors_total}
                onChange={(v) => { trigger('selection'); updateFormData({ floors_total: v }); }}
                placeholder="3"
                min={1}
                max={100}
              />
              <NumberInput
                label="Год постройки"
                value={formData.build_year}
                onChange={(v) => { trigger('selection'); updateFormData({ build_year: v }); }}
                placeholder="2000"
                min={1800}
                max={new Date().getFullYear() + 5}
              />
              <NumberInput
                label="Подсобные помещения (м²)"
                value={formData.utility_area}
                onChange={(v) => { trigger('selection'); updateFormData({ utility_area: v }); }}
                placeholder="50"
                min={0}
                max={100000}
                unit="м²"
              />
            </>
          )}

          {/* ── Общие для всех: жилая и кухня (квартира/дача) ── */}
          {isApartmentLike && (
            <>
              <NumberInput
                label="Жилая площадь (м²)"
                value={formData.living_area}
                onChange={(v) => { trigger('selection'); updateFormData({ living_area: v }); }}
                placeholder="38"
                min={1}
                max={10000}
                unit="м²"
              />
              <NumberInput
                label="Площадь кухни (м²)"
                value={formData.kitchen_area}
                onChange={(v) => { trigger('selection'); updateFormData({ kitchen_area: v }); }}
                placeholder="9"
                min={1}
                max={10000}
                unit="м²"
              />
            </>
          )}

        </div>
      </section>

      {/* Ремонт — компактный раскрывающийся пикер (квартира, дом, дача, коммерция) */}
      {hasRepair && (
        <section>
          <ExpandablePicker<string>
            label="Ремонт"
            placeholder="Не указан"
            selected={formData.repair_type ? formData.repair_type : null}
            options={repairOptions}
            onSelect={(value) => {
              trigger('selection');
              updateFormData({ repair_type: value });
              setOpenSection(null);
            }}
            open={openSection === 'repair'}
            onToggle={() => handleToggle('repair')}
          />
        </section>
      )}

      {/* ── ДОПОЛНИТЕЛЬНЫЕ ПОЛЯ ПО КАТЕГОРИЯМ ── */}

      {/* Дом / дача: тип дома */}
      {(propertyCategory === 'house' || propertyCategory === 'dacha') && (
        <section>
          <ExpandablePicker<string>
            label="Тип дома"
            placeholder="Не указан"
            selected={formData.house_type ?? null}
            options={houseTypeOptions}
            onSelect={(value) => {
              trigger('selection');
              updateFormData({ house_type: value });
              setOpenSection(null);
            }}
            open={openSection === 'house_type'}
            onToggle={() => handleToggle('house_type')}
          />
        </section>
      )}

      {/* Участок: категория земли */}
      {propertyCategory === 'land' && (
        <section>
          <ExpandablePicker<string>
            label="Категория земли"
            placeholder="Не указана"
            selected={formData.land_category ?? null}
            options={landCategoryOptions}
            onSelect={(value) => {
              trigger('selection');
              updateFormData({ land_category: value });
              setOpenSection(null);
            }}
            open={openSection === 'land_cat'}
            onToggle={() => handleToggle('land_cat')}
          />
          <div className="mt-3">
            <label className="block text-sm mb-1" style={{ color: 'var(--bd-text-secondary)' }}>
              Кадастровый номер (опционально)
            </label>
            <input
              type="text"
              value={formData.cadastral_number ?? ''}
              onChange={(e) => {
                trigger('selection');
                updateFormData({ cadastral_number: e.target.value || undefined });
              }}
              placeholder="1234567890123456789"
              className="w-full px-4 py-3 rounded-xl text-base outline-none"
              style={{
                backgroundColor: 'var(--bd-bg-base)',
                border: '1px solid rgba(255,255,255,0.6)',
                color: 'var(--bd-text-primary)',
                boxShadow: 'inset 2px 2px 5px var(--bd-raise-dark), inset -2px -2px 5px var(--bd-raise-light)',
              }}
            />
          </div>
        </section>
      )}

      {/* Гараж: тип */}
      {propertyCategory === 'garage' && (
        <section>
          <ExpandablePicker<string>
            label="Тип гаража / места"
            placeholder="Не указан"
            selected={formData.garage_type ?? null}
            options={garageTypeOptions}
            onSelect={(value) => {
              trigger('selection');
              updateFormData({ garage_type: value });
              setOpenSection(null);
            }}
            open={openSection === 'garage_type'}
            onToggle={() => handleToggle('garage_type')}
          />
          <div className="mt-3">
            <div
              className="rounded-2xl p-4"
              style={{
                backgroundColor: 'var(--bd-bg-base)',
                border: formData.is_heated ? '1px solid var(--bd-accent-primary)' : '1px solid rgba(255,255,255,0.6)',
                boxShadow: '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)',
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔥</span>
                <div className="flex-1">
                  <div className="text-[16px] font-semibold" style={{ color: 'var(--bd-text-primary)' }}>Отапливаемый</div>
                  <div className="text-[13px] mt-1" style={{ color: 'var(--bd-text-secondary)' }}>Тёплый гараж</div>
                </div>
                <button
                  role="switch"
                  aria-checked={formData.is_heated}
                  onClick={() => { trigger('selection'); updateFormData({ is_heated: !formData.is_heated }); }}
                  className="relative w-[52px] h-8 rounded-full transition-colors flex-shrink-0"
                  style={{
                    backgroundColor: formData.is_heated ? 'var(--bd-accent-primary)' : 'var(--bd-bg-base)',
                    boxShadow: formData.is_heated ? 'var(--bd-shadow-raised)' : 'inset 2px 2px 4px var(--bd-raise-dark), inset -2px -2px 4px var(--bd-raise-light)',
                  }}
                >
                  <span className="absolute top-1 w-6 h-6 rounded-full shadow transition-all" style={{
                    backgroundColor: '#ffffff',
                    left: formData.is_heated ? '24px' : '4px',
                    boxShadow: '3px 3px 6px var(--bd-raise-dark), -3px -3px 6px var(--bd-raise-light)',
                  }} />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Коммерческая: назначение */}
      {propertyCategory === 'commercial' && (
        <section>
          <ExpandablePicker<string>
            label="Назначение"
            placeholder="Не указано"
            selected={formData.commercial_purpose ?? null}
            options={commercialPurposeOptions}
            onSelect={(value) => {
              trigger('selection');
              updateFormData({ commercial_purpose: value });
              setOpenSection(null);
            }}
            open={openSection === 'comm_purpose'}
            onToggle={() => handleToggle('comm_purpose')}
          />
          {/* Склад и офис */}
          <div className="mt-3 grid grid-cols-1 gap-2">
            {[
              { key: 'has_warehouse' as const, label: 'Склад', icon: '📦' },
              { key: 'has_office' as const, label: 'Офисные помещения', icon: '🏢' },
            ].map(({ key, label, icon }) => {
              const checked = !!formData[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => { trigger('selection'); updateFormData({ [key]: !formData[key] }); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-colors active:opacity-80"
                  style={{
                    backgroundColor: checked ? 'rgba(37, 99, 235, 0.12)' : 'var(--bd-bg-base)',
                    border: '1px solid rgba(255,255,255,0.6)',
                    boxShadow: checked ? 'var(--bd-shadow-raised)' : '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)',
                  }}
                >
                  <span className="text-2xl">{icon}</span>
                  <span className="flex-1 text-[16px] font-medium" style={{ color: checked ? 'var(--bd-accent-primary)' : 'var(--bd-text-primary)' }}>{label}</span>
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-md transition-colors" style={{
                    backgroundColor: checked ? 'var(--bd-accent-primary)' : 'var(--bd-bg-base)',
                    border: checked ? 'none' : '1.5px solid rgba(255,255,255,0.6)',
                    boxShadow: checked ? 'var(--bd-shadow-raised)' : '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)',
                  }}>
                    {checked && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Метро — станция выбранного города + расстояние до неё */}
      {hasMetro && formData.city_id > 0 && (
        <section className="space-y-3">
          <ExpandablePicker<number>
            label="Метро"
            placeholder="Не указано"
            selected={formData.metro_station_id ?? null}
            options={metroOptions}
            onSelect={handleMetroChange}
            open={openSection === 'metro'}
            onToggle={() => handleToggle('metro')}
            searchable
            searchPlaceholder="Станция метро"
          />
          {formData.metro_station_id && (
            <div
              className="rounded-2xl p-3"
              style={{
                backgroundColor: 'var(--bd-bg-base)',
                border: '1px solid rgba(255,255,255,0.6)',
                boxShadow: '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)',
              }}
            >
              <NumberInput
                label="До метро, м"
                value={formData.metro_distance}
                onChange={(v) => {
                  trigger('selection');
                  updateFormData({ metro_distance: v });
                }}
                placeholder="400"
                min={0}
                max={50000}
                unit="м"
              />
              <button
                type="button"
                onClick={handleMetroClear}
                className="mt-2 text-sm font-medium transition-opacity active:opacity-80"
                style={{ color: '#ef4444' }}
              >
                Сбросить метро
              </button>
            </div>
          )}
        </section>
      )}

      {/* Дополнительно — счётчики балконов/лоджий и особенности (квартира, дом, дача) */}
      {hasFeatures && (
        <section>
          <div
            className="rounded-2xl overflow-hidden transition-shadow"
            style={{
              backgroundColor: 'var(--bd-bg-base)',
              border: openSection === 'features' ? '1px solid rgba(255,255,255,0.6)' : '1px solid rgba(255,255,255,0.6)',
              boxShadow: openSection === 'features' ? 'var(--bd-shadow-raised)' : '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)',
            }}
          >
            {/* Триггер-строка */}
            <button
              type="button"
              onClick={() => handleToggle('features')}
              aria-expanded={openSection === 'features'}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-opacity active:opacity-80"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[13px] leading-tight" style={{ color: 'var(--bd-text-secondary)' }}>Дополнительно</div>
                <div
                  className="text-[17px] font-semibold truncate mt-0.5"
                  style={{ color: selectedExtrasCount > 0 ? 'var(--bd-text-primary)' : 'var(--bd-text-secondary)' }}
                >
                  {selectedExtrasCount > 0 ? `${selectedExtrasCount} выбрано` : 'Балкон, лоджия, новостройка'}
                </div>
              </div>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className={`flex-shrink-0 transition-transform duration-200 ${openSection === 'features' ? 'rotate-180' : ''}`}
                style={{ color: 'var(--bd-text-secondary)' }}
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Раскрывающийся столбик */}
            <div
              className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                openSection === 'features' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden min-h-0">
                <div className="pt-1 pb-2" style={{ borderTop: '1px solid rgba(255,255,255,0.6)' }}>
                  {/* Счётчики балкона и лоджии */}
                  {hasBalkon && (
                    <>
                      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.6)' }}>
                        <Stepper
                          label="Балкон"
                          icon="🏠"
                          value={formData.balcony_count}
                          onChange={setBalconyCount}
                        />
                      </div>
                      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.6)' }}>
                        <Stepper
                          label="Лоджия"
                          icon="🪟"
                          value={formData.loggia_count}
                          onChange={(count) => updateFormData({ loggia_count: count })}
                        />
                      </div>
                    </>
                  )}

                  {/* Остальные особенности — чекбоксы */}
                  {EXTRA_FEATURES.map(({ key, label, icon }, index) => {
                    const checked = !!formData[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          trigger('selection');
                          updateFormData({ [key]: !formData[key] });
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors active:opacity-80"
                        style={{
                          backgroundColor: checked ? 'rgba(37, 99, 235, 0.12)' : 'var(--bd-bg-base)',
                          borderBottom: index < EXTRA_FEATURES.length - 1 ? '1px solid rgba(255,255,255,0.6)' : 'none',
                          boxShadow: checked ? 'var(--bd-shadow-raised)' : '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)',
                        }}
                        aria-pressed={checked}
                      >
                        <span className="text-2xl leading-none flex-shrink-0">{icon}</span>
                        <span className="min-w-0 flex-1">
                          <span
                            className="block text-[16px] font-medium leading-tight"
                            style={{ color: checked ? 'var(--bd-accent-primary)' : 'var(--bd-text-primary)' }}
                          >
                            {label}
                          </span>
                        </span>
                        {/* Чекбокс-кружок */}
                        <span
                          className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-md transition-colors"
                          style={{
                            backgroundColor: checked ? 'var(--bd-accent-primary)' : 'var(--bd-bg-base)',
                            border: checked ? 'none' : '1.5px solid rgba(255,255,255,0.6)',
                            boxShadow: checked ? 'var(--bd-shadow-raised)' : '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)',
                          }}
                          aria-hidden="true"
                        >
                          {checked && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={3}>
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Гараж: всегда показываем парковку */}
      {propertyCategory === 'garage' && (
        <section>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: 'var(--bd-bg-base)',
              border: '1px solid rgba(255,255,255,0.6)',
              boxShadow: '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)',
            }}
          >
            <button
              type="button"
              onClick={() => { trigger('selection'); updateFormData({ has_parking: !formData.has_parking }); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors active:opacity-80"
              style={{
                backgroundColor: formData.has_parking ? 'rgba(37, 99, 235, 0.12)' : 'var(--bd-bg-base)',
              }}
              aria-pressed={formData.has_parking}
            >
              <span className="text-2xl">🅿️</span>
              <span className="flex-1 text-[16px] font-medium" style={{ color: formData.has_parking ? 'var(--bd-accent-primary)' : 'var(--bd-text-primary)' }}>
                Охраняемая территория / Парковка
              </span>
              <span
                className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-md"
                style={{
                  backgroundColor: formData.has_parking ? 'var(--bd-accent-primary)' : 'var(--bd-bg-base)',
                  border: formData.has_parking ? 'none' : '1.5px solid rgba(255,255,255,0.6)',
                  boxShadow: formData.has_parking ? 'var(--bd-shadow-raised)' : '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)',
                }}
              >
                {formData.has_parking && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>}
              </span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
