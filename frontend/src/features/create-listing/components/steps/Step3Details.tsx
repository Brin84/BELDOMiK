import React, { useEffect, useState } from 'react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { useCreateListingStore } from '../../createListingStore';

interface Step3DetailsProps {
  onNext: () => void;
  onPrev: () => void;
  canProceed: boolean;
}

const REPAIR_TYPES = [
  'Без ремонта',
  'Косметический',
  'Евроремонт',
  'Дизайнерский',
  'Требует ремонта',
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
      <label className="block text-tg-hint text-sm mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="number"
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        min={min}
        max={max}
        className="w-full px-4 py-3 rounded-xl text-tg-text text-base"
        style={{
          backgroundColor: 'var(--tg-theme-secondary-bg-color)',
          border: '1px solid var(--tg-theme-hint-color)',
          color: 'var(--tg-theme-text-color)',
        }}
        inputMode="numeric"
      />
      {unit && (
        <p className="text-tg-hint text-xs mt-1">{unit}</p>
      )}
    </div>
  );
}

export function Step3Details({ onNext, onPrev, canProceed }: Step3DetailsProps) {
  const { trigger } = useHaptics();
  const { mainButton, backButton } = useTelegram();
  const { updateFormData, formData, currentStep, clearError, errors } = useCreateListingStore();

  // Setup Telegram buttons
  useEffect(() => {
    if (mainButton && currentStep === 3) {
      mainButton.setParams({
        text: 'Далее',
        is_visible: true,
        is_active: canProceed,
      });
      mainButton.show();

      const handleClick = () => {
        if (canProceed) {
          trigger('medium');
          onNext();
        } else {
          trigger('error');
        }
      };
      mainButton.onClick(handleClick);

      return () => {
        mainButton.hide();
        mainButton.offClick(handleClick);
      };
    }
  }, [mainButton, currentStep, canProceed, onNext, trigger]);

  useEffect(() => {
    if (backButton && currentStep === 3) {
      backButton.show();
      const handleBack = () => {
        trigger('light');
        onPrev();
      };
      backButton.onClick(handleBack);
      return () => {
        backButton.hide();
        backButton.offClick(handleBack);
      };
    }
  }, [backButton, currentStep, onPrev, trigger]);

  return (
    <div className="p-4 space-y-6 pb-24" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))' }}>
      {/* Progress Indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((step) => (
          <React.Fragment key={step}>
            <div
              className="h-2 flex-1 rounded-full transition-colors"
              style={{
                backgroundColor: step < 3
                  ? 'var(--tg-theme-button-color)'
                  : step === 3
                  ? 'var(--tg-theme-button-color)'
                  : 'var(--tg-theme-hint-color)',
                opacity: step <= 3 ? 1 : 0.3,
              }}
            />
            {step < 5 && <div className="w-1" />}
          </React.Fragment>
        ))}
      </div>

      <div className="space-y-6">
        {/* Title */}
        <section>
          <h2 className="text-tg-text text-xl font-bold mb-4">Название объявления <span className="text-tg-hint font-normal">*</span></h2>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => {
              trigger('selection');
              updateFormData({ title: e.target.value });
              clearError('title');
            }}
            placeholder="Например: 2-к квартира, 55 м², 5/9 этаж"
            className={`w-full px-4 py-3 rounded-xl text-tg-text text-base ${errors.title ? 'border-red-500' : ''}`}
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
              border: errors.title ? '2px solid #ff3b30' : '1px solid var(--tg-theme-hint-color)',
              color: 'var(--tg-theme-text-color)',
            }}
            maxLength={100}
          />
          {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
          <p className="text-tg-hint text-xs mt-1 text-right">{formData.title.length}/100</p>
        </section>

        {/* Description */}
        <section>
          <h2 className="text-tg-text text-xl font-bold mb-4">Описание</h2>
          <textarea
            value={formData.description}
            onChange={(e) => {
              trigger('selection');
              updateFormData({ description: e.target.value });
              clearError('description');
            }}
            placeholder="Опишите преимущества недвижимости, район, инфраструктуру, состояние..."
            rows={5}
            className={`w-full px-4 py-3 rounded-xl text-tg-text text-base resize-none ${errors.description ? 'border-red-500' : ''}`}
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
              border: errors.description ? '2px solid #ff3b30' : '1px solid var(--tg-theme-hint-color)',
              color: 'var(--tg-theme-text-color)',
            }}
            maxLength={5000}
          />
          {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
          <p className="text-tg-hint text-xs mt-1 text-right">{(formData.description || '').length}/5000</p>
        </section>

        {/* Price */}
        <section>
          <h2 className="text-tg-text text-xl font-bold mb-4">Цена <span className="text-tg-hint font-normal">*</span></h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex-1">
              <label className="block text-tg-hint text-sm mb-1">Цена в BYN *</label>
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
                className={`w-full px-4 py-3 rounded-xl text-tg-text text-base ${errors.price_byn ? 'border-red-500' : ''}`}
                style={{
                  backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                  border: errors.price_byn ? '2px solid #ff3b30' : '1px solid var(--tg-theme-hint-color)',
                  color: 'var(--tg-theme-text-color)',
                }}
                inputMode="numeric"
                min="1"
                max="100000000"
              />
              {errors.price_byn && <p className="text-red-500 text-sm mt-1">{errors.price_byn}</p>}
            </div>
            <div className="flex-1">
              <label className="block text-tg-hint text-sm mb-1">Цена в USD (опционально)</label>
              <input
                type="number"
                value={formData.price_usd || ''}
                onChange={(e) => {
                  trigger('selection');
                  const val = e.target.value;
                  updateFormData({ price_usd: val === '' ? undefined : parseInt(val, 10) });
                }}
                placeholder="45000"
                className="w-full px-4 py-3 rounded-xl text-tg-text text-base"
                style={{
                  backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                  border: '1px solid var(--tg-theme-hint-color)',
                  color: 'var(--tg-theme-text-color)',
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
          <h2 className="text-tg-text text-xl font-bold mb-4">Параметры</h2>
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
              required={false}
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
              required={false}
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
              required={false}
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
              required={false}
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
              required={false}
            />
          </div>
          {(errors.area || errors.rooms || errors.floor || errors.floors_total || errors.build_year) && (
            <p className="text-red-500 text-sm mt-1">Проверьте корректность числовых полей</p>
          )}
        </section>

        {/* Repair Type */}
        <section>
          <h2 className="text-tg-text text-xl font-bold mb-4">Тип ремонта</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                trigger('selection');
                updateFormData({ repair_type: '' });
              }}
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                !formData.repair_type ? 'shadow-sm' : ''
              }`}
              style={{
                backgroundColor: !formData.repair_type
                  ? 'var(--tg-theme-button-color)'
                  : 'var(--tg-theme-secondary-bg-color)',
                color: !formData.repair_type
                  ? 'var(--tg-theme-button-text-color)'
                  : 'var(--tg-theme-text-color)',
                border: formData.repair_type ? '1px solid var(--tg-theme-hint-color)' : 'none',
              }}
              aria-pressed={!formData.repair_type}
            >
              Не указан
            </button>
            {REPAIR_TYPES.map((repair) => (
              <button
                key={repair}
                onClick={() => {
                  trigger('selection');
                  updateFormData({ repair_type: repair });
                }}
                className={`px-4 py-2 rounded-xl font-medium transition-colors whitespace-nowrap ${
                  formData.repair_type === repair ? 'shadow-sm' : ''
                }`}
                style={{
                  backgroundColor: formData.repair_type === repair
                    ? 'var(--tg-theme-button-color)'
                    : 'var(--tg-theme-secondary-bg-color)',
                  color: formData.repair_type === repair
                    ? 'var(--tg-theme-button-text-color)'
                    : 'var(--tg-theme-text-color)',
                  border: formData.repair_type !== repair ? '1px solid var(--tg-theme-hint-color)' : 'none',
                }}
                aria-pressed={formData.repair_type === repair}
              >
                {repair}
              </button>
            ))}
          </div>
        </section>

        {/* Boolean Features */}
        <section>
          <h2 className="text-tg-text text-xl font-bold mb-4">Особенности</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'has_balcony' as const, label: 'Балкон / Лоджия', icon: '🏠' },
              { key: 'has_furniture' as const, label: 'Мебель', icon: '🛋️' },
              { key: 'has_elevator' as const, label: 'Лифт', icon: '🛗' },
              { key: 'has_parking' as const, label: 'Парковка', icon: '🅿️' },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => {
                  trigger('selection');
                  updateFormData({ [key]: !formData[key] });
                }}
                className={`flex flex-col items-center gap-2 px-4 py-4 rounded-2xl transition-colors ${
                  formData[key] ? 'shadow-sm' : ''
                }`}
                style={{
                  backgroundColor: formData[key]
                    ? 'var(--tg-theme-button-color)'
                    : 'var(--tg-theme-secondary-bg-color)',
                  color: formData[key]
                    ? 'var(--tg-theme-button-text-color)'
                    : 'var(--tg-theme-text-color)',
                  border: formData[key] ? 'none' : '1px solid var(--tg-theme-hint-color)',
                  borderWidth: '0.5px',
                }}
                aria-pressed={formData[key] === true}
              >
                <span style={{ fontSize: '28px' }}>{icon}</span>
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}