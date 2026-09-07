import React, { useEffect, useState } from 'react';
import { useHaptics } from '@/shared/lib/haptics';
import { useCreateListingStore } from '../../createListingStore';
import { BynSymbol } from '@/shared/ui';
import { SelectListRowView, type SelectListRow } from '../SelectList';

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

export function Step3Details() {
  const { trigger } = useHaptics();
  const { updateFormData, formData, clearError, errors } = useCreateListingStore();

  const repairRows: SelectListRow<string>[] = REPAIR_TYPES.map((r) => ({
    value: r,
    label: r,
  }));

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

      {/* Price */}
      <section>
        <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
          Цена <span style={{ color: '#94a3b8', fontWeight: 400 }}>*</span>
        </h2>
        <div className="grid grid-cols-2 gap-3">
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

      {/* Repair Type — вертикальный список */}
      <section>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}
        >
          {/* «Не указан» — строка для сброса (аналог clearLabel, но вручную) */}
          <SelectListRowView<string>
            row={{ value: '', label: 'Не указан' }}
            isSelected={!formData.repair_type}
            onSelect={() => {
              trigger('selection');
              updateFormData({ repair_type: '' });
            }}
            showDivider={true}
          />
          {repairRows.map((row, index) => (
            <SelectListRowView<string>
              key={row.value}
              row={row}
              isSelected={formData.repair_type === row.value}
              onSelect={() => {
                trigger('selection');
                updateFormData({ repair_type: row.value });
              }}
              showDivider={index < repairRows.length - 1}
            />
          ))}
        </div>
      </section>

      {/* Features — вертикальный список с чекбоксами */}
      <section>
        <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Особенности</h2>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}
        >
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
      </section>
    </div>
  );
}
