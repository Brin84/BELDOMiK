import React, { useEffect } from 'react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { useCreateListingStore } from '../../createListingStore';
import { useGeographyStore } from '@/features/geography/geographyStore';
import type { OperationTypeData, PropertyType } from '@/shared/api/types';

interface Step1OperationTypeProps {
  onNext: () => void;
  canProceed: boolean;
}

export function Step1OperationType({ onNext, canProceed }: Step1OperationTypeProps) {
  const { trigger } = useHaptics();
  const { mainButton } = useTelegram();
  const { updateFormData, formData, currentStep } = useCreateListingStore();
  const { operationTypes, propertyTypes, fetchOperationTypes, fetchPropertyTypes } = useGeographyStore();

  // Load operation types and property types on mount
  useEffect(() => {
    fetchOperationTypes();
    fetchPropertyTypes();
  }, [fetchOperationTypes, fetchPropertyTypes]);

  // Setup Telegram main button
  useEffect(() => {
    if (mainButton && currentStep === 1) {
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

  const handleOperationChange = (operation: OperationTypeData) => {
    trigger('selection');
    updateFormData({ operation: operation.name as 'sale' | 'rent' | 'daily_rent' | 'exchange' });
  };

  const handlePropertyTypeChange = (propertyType: PropertyType) => {
    trigger('selection');
    updateFormData({ property_type_id: propertyType.id });
  };

  return (
    <div className="p-4 space-y-6 pb-24" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))' }}>
      {/* Progress Indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((step) => (
          <React.Fragment key={step}>
            <div
              className={`h-2 flex-1 rounded-full transition-colors ${
                step < 1 ? 'bg-tg-button' : step === 1 ? 'bg-tg-button' : 'bg-tg-hint'
              }`}
              style={{
                backgroundColor: step <= 1
                  ? 'var(--tg-theme-button-color)'
                  : 'var(--tg-theme-hint-color)',
                opacity: step <= 1 ? 1 : 0.3,
              }}
            />
            {step < 5 && <div className="w-1" />}
          </React.Fragment>
        ))}
      </div>

      <div className="space-y-6">
        {/* Operation Type */}
        <section>
          <h2 className="text-tg-text text-xl font-bold mb-4">Тип сделки</h2>
          <p className="text-tg-hint text-sm mb-4">Выберите, что вы хотите сделать с недвижимостью</p>
          <div className="grid grid-cols-2 gap-3">
            {operationTypes.map((op) => (
              <button
                key={op.id}
                onClick={() => handleOperationChange(op)}
                className={`p-4 rounded-2xl transition-all text-center ${
                  formData.operation === op.name ? 'ring-2 shadow-sm' : ''
                }`}
                style={{
                  backgroundColor: formData.operation === op.name
                    ? 'var(--tg-theme-button-color)'
                    : 'var(--tg-theme-secondary-bg-color)',
                  color: formData.operation === op.name
                    ? 'var(--tg-theme-button-text-color)'
                    : 'var(--tg-theme-text-color)',
                  border: formData.operation !== op.name ? '1px solid var(--tg-theme-hint-color)' : 'none',
                }}
                aria-pressed={formData.operation === op.name}
              >
                <div className="text-3xl mb-2">
                  {op.name === 'sale' && '💰'}
                  {op.name === 'rent' && '🏠'}
                  {op.name === 'daily_rent' && '🏨'}
                  {op.name === 'exchange' && '🔄'}
                </div>
                <div className="font-medium">{op.name_plural || op.name}</div>
                <div className="text-xs opacity-75 mt-1">
                  {op.name === 'sale' && 'Продажа недвижимости'}
                  {op.name === 'rent' && 'Долгосрочная аренда'}
                  {op.name === 'daily_rent' && 'Посуточная аренда'}
                  {op.name === 'exchange' && 'Обмен недвижимости'}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Property Type */}
        <section>
          <h2 className="text-tg-text text-xl font-bold mb-4">Тип недвижимости</h2>
          <p className="text-tg-hint text-sm mb-4">Выберите категорию недвижимости</p>
          {propertyTypes.length > 0 ? (
            <div className="space-y-2">
              {propertyTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handlePropertyTypeChange(type)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                    formData.property_type_id === type.id ? 'ring-2 shadow-sm' : ''
                  }`}
                  style={{
                    backgroundColor: formData.property_type_id === type.id
                      ? 'var(--tg-theme-button-color)'
                      : 'var(--tg-theme-secondary-bg-color)',
                    color: formData.property_type_id === type.id
                      ? 'var(--tg-theme-button-text-color)'
                      : 'var(--tg-theme-text-color)',
                    border: formData.property_type_id !== type.id ? '1px solid var(--tg-theme-hint-color)' : 'none',
                  }}
                  aria-pressed={formData.property_type_id === type.id}
                >
                  <span className="text-2xl flex-shrink-0">{type.icon || '🏠'}</span>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{type.name}</div>
                    <div className="text-xs opacity-75">{type.category}</div>
                  </div>
                  {formData.property_type_id === type.id && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="flex-shrink-0" style={{ color: 'var(--tg-theme-button-text-color)' }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-tg-hint">Загрузка типов недвижимости...</div>
          )}
        </section>
      </div>
    </div>
  );
}