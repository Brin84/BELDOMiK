import React, { useEffect, useState } from 'react';
import { useHaptics } from '@/shared/lib/haptics';
import { useCreateListingStore } from '../../createListingStore';
import { BynSymbol } from '@/shared/ui';
import { ExpandablePicker, type ExpandableOption } from '../ExpandablePicker';

const REPAIR_TYPES = [
  'Без ремонта',
  'Косметический',
  'Евроремонт',
  'Дизайнерский',
  'Требует ремонта',
];

const FEATURES: { key: 'has_balcony' | 'has_furniture' | 'has_elevator' | 'has_parking'; label: string; icon: string }[] = [
  { key: 'has_balcony', label: 'Балкон / Лоджия', icon: '🏠' },
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
      <label className="block text-sm mb-1" style={{ color: '#64748b' }}>
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
          backgroundColor: '#f1f5f9',
          border: '1px solid #e2e8f0',
          color: '#0f172a',
        }}
        inputMode="numeric"
      />
      {unit && (
        <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>{unit}</p>
      )}
    </div>
  );
}

type SectionName = 'repair' | 'features';

export function Step3Details() {
  const { trigger } = useHaptics();
  const { updateFormData, formData, clearError, errors } = useCreateListingStore();
  const [openSection, setOpenSection] = useState<SectionName | null>(null);

  const repairOptions: ExpandableOption<string>[] = REPAIR_TYPES.map((r) => ({
    value: r,
    title: r,
  }));

  const selectedFeaturesCount = FEATURES.filter((f) => !!formData[f.key]).length;

  const handleToggle = (section: SectionName) => {
    trigger('light');
    setOpenSection((prev) => (prev === section ? null : section));
  };

  return (
    <div className="p-4 space-y-6">
      {/* Title */}
      <section>
        <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
          Название объявления <span style={{ color: '#94a3b8', fontWeight: 400 }}>*</span>
        </h2>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => {
            trigger('selection');
            updateFormData({ title: e.target.value });
            clearError('title');
          }}
          placeholder="Например: 2-к квартира, 55 м², 5/9 этаж"
          className="w-full px-4 py-3 rounded-xl text-base outline-none"
          style={{
            backgroundColor: '#f1f5f9',
            border: errors.title ? '2px solid #ef4444' : '1px solid #e2e8f0',
            color: '#0f172a',
          }}
          maxLength={100}
        />
        {errors.title && <p className="text-sm mt-1" style={{ color: '#ef4444' }}>{errors.title}</p>}
        <p className="text-xs mt-1 text-right" style={{ color: '#94a3b8' }}>{formData.title.length}/100</p>
      </section>

      {/* Description */}
      <section>
        <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Описание</h2>
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
            backgroundColor: '#f1f5f9',
            border: errors.description ? '2px solid #ef4444' : '1px solid #e2e8f0',
            color: '#0f172a',
          }}
          maxLength={5000}
        />
        {errors.description && <p className="text-sm mt-1" style={{ color: '#ef4444' }}>{errors.description}</p>}
        <p className="text-xs mt-1 text-right" style={{ color: '#94a3b8' }}>{(formData.description || '').length}/5000</p>
      </section>

      {/* Price (Kufar-модель: фикс. цена или «Договорная») */}
      <section>
        <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
          Цена {!formData.is_negotiable && <span style={{ color: '#94a3b8', fontWeight: 400 }}>*</span>}
        </h2>

        {/* Переключатель «Договорная цена» */}
        <div
          className="rounded-2xl p-4"
          style={{
            backgroundColor: '#ffffff',
            border: formData.is_negotiable ? '1px solid #2171ee' : '1px solid #e2e8f0',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[16px] font-semibold" style={{ color: '#0f172a' }}>Договорная цена</div>
              <div className="text-[13px] mt-1 leading-snug" style={{ color: '#64748b' }}>
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
              style={{ backgroundColor: formData.is_negotiable ? '#2171ee' : '#e2e8f0' }}
            >
              <span
                className="absolute top-1 w-6 h-6 rounded-full shadow transition-all"
                style={{ backgroundColor: '#ffffff', left: formData.is_negotiable ? '24px' : '4px' }}
              />
            </button>
          </div>
        </div>

        {/* Поля цены — скрыты при «Договорной» */}
        {!formData.is_negotiable && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="flex-1">
              <label className="block text-sm mb-1" style={{ color: '#64748b' }}>Цена в <BynSymbol /> *</label>
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
                  backgroundColor: '#f1f5f9',
                  border: errors.price_byn ? '2px solid #ef4444' : '1px solid #e2e8f0',
                  color: '#0f172a',
                }}
                inputMode="numeric"
                min="1"
                max="100000000"
              />
              {errors.price_byn && <p className="text-sm mt-1" style={{ color: '#ef4444' }}>{errors.price_byn}</p>}
            </div>
            <div className="flex-1">
              <label className="block text-sm mb-1" style={{ color: '#64748b' }}>Цена в USD (опционально)</label>
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
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  color: '#0f172a',
                }}
                inputMode="numeric"
                min="1"
                max="10000000"
              />
            </div>
          </div>
        )}
      </section>

      {/* Area, Rooms, Floor */}
      <section>
        <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Параметры</h2>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label="Общая площадь (м²)"
            value={formData.area}
            onChange={(v) => {
              trigger('selection');
              updateFormData({ area: v });
              clearError('area');
            }}
            placeholder="55"
            min={1}
            max={10000}
            unit="м²"
          />
          <NumberInput
            label="Комнат"
            value={formData.rooms}
            onChange={(v) => {
              trigger('selection');
              updateFormData({ rooms: v });
              clearError('rooms');
            }}
            placeholder="2"
            min={0}
            max={50}
          />
          <NumberInput
            label="Этаж"
            value={formData.floor}
            onChange={(v) => {
              trigger('selection');
              updateFormData({ floor: v });
              clearError('floor');
            }}
            placeholder="5"
            min={1}
            max={100}
          />
          <NumberInput
            label="Этажность"
            value={formData.floors_total}
            onChange={(v) => {
              trigger('selection');
              updateFormData({ floors_total: v });
              clearError('floors_total');
            }}
            placeholder="9"
            min={1}
            max={100}
          />
          <NumberInput
            label="Год постройки"
            value={formData.build_year}
            onChange={(v) => {
              trigger('selection');
              updateFormData({ build_year: v });
              clearError('build_year');
            }}
            placeholder="2005"
            min={1800}
            max={new Date().getFullYear() + 5}
          />
        </div>
        {(errors.area || errors.rooms || errors.floor || errors.floors_total || errors.build_year) && (
          <p className="text-sm mt-1" style={{ color: '#ef4444' }}>Проверьте корректность числовых полей</p>
        )}
      </section>

      {/* Ремонт — компактный раскрывающийся пикер (как «Тип сделки» в шаге 1) */}
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

      {/* Особенности — сворачиваемая секция с чекбоксами */}
      <section>
        <div
          className="rounded-2xl overflow-hidden transition-shadow"
          style={{
            backgroundColor: '#ffffff',
            border: openSection === 'features' ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
            boxShadow: openSection === 'features' ? '0 8px 24px rgba(2, 6, 23, 0.06)' : 'none',
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
              <div className="text-[13px] leading-tight" style={{ color: '#94a3b8' }}>Особенности</div>
              <div
                className="text-[17px] font-semibold truncate mt-0.5"
                style={{ color: selectedFeaturesCount > 0 ? '#0f172a' : '#94a3b8' }}
              >
                {selectedFeaturesCount > 0 ? `${selectedFeaturesCount} выбрано` : 'Не выбраны'}
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
              style={{ color: '#94a3b8' }}
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Раскрывающийся столбик чекбоксов */}
          <div
            className={`grid transition-[grid-template-rows] duration-200 ease-out ${
              openSection === 'features' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}
          >
            <div className="overflow-hidden min-h-0">
              <div className="pt-1 pb-2" style={{ borderTop: '1px solid #f1f5f9' }}>
                {FEATURES.map(({ key, label, icon }, index) => {
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
                        backgroundColor: checked ? '#e8f0fe' : '#ffffff',
                        borderBottom: index < FEATURES.length - 1 ? '1px solid #f1f5f9' : 'none',
                      }}
                      aria-pressed={checked}
                    >
                      <span className="text-2xl leading-none flex-shrink-0">{icon}</span>
                      <span className="min-w-0 flex-1">
                        <span
                          className="block text-[16px] font-medium leading-tight"
                          style={{ color: checked ? '#2171ee' : '#0f172a' }}
                        >
                          {label}
                        </span>
                      </span>
                      {/* Чекбокс-кружок */}
                      <span
                        className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-md transition-colors"
                        style={{
                          backgroundColor: checked ? '#2171ee' : '#f1f5f9',
                          border: checked ? 'none' : '1.5px solid #cbd5e1',
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
    </div>
  );
}