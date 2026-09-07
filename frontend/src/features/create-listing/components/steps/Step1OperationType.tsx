import { useEffect, useState } from 'react';
import { useHaptics } from '@/shared/lib/haptics';
import { useCreateListingStore } from '../../createListingStore';
import { useGeographyStore } from '@/features/geography/geographyStore';
import { ExpandablePicker, type ExpandableOption } from '../ExpandablePicker';
import type { OperationTypeData } from '@/shared/api/types';

type OperationKey = 'sale' | 'rent' | 'daily_rent' | 'exchange';

const OPERATION_META: Record<OperationKey, { icon: string; subtitle: string }> = {
  sale: { icon: '💰', subtitle: 'Продажа недвижимости' },
  rent: { icon: '🏠', subtitle: 'Долгосрочная аренда' },
  daily_rent: { icon: '🏨', subtitle: 'Посуточная аренда' },
  exchange: { icon: '🔄', subtitle: 'Обмен недвижимости' },
};

function toOperationKey(name: string): OperationKey | null {
  return name === 'sale' || name === 'rent' || name === 'daily_rent' || name === 'exchange' ? name : null;
}

type PickerName = 'operation' | 'property';

export function Step1OperationType() {
  const { trigger } = useHaptics();
  const { updateFormData, formData } = useCreateListingStore();
  const { operationTypes, propertyTypes, fetchOperationTypes, fetchPropertyTypes } = useGeographyStore();
  const [openPicker, setOpenPicker] = useState<PickerName | null>(null);

  // Load operation types and property types on mount
  useEffect(() => {
    fetchOperationTypes();
    fetchPropertyTypes();
  }, [fetchOperationTypes, fetchPropertyTypes]);

  const operationOptions: ExpandableOption<OperationKey>[] = operationTypes
    .map((op: OperationTypeData) => ({ op, key: toOperationKey(op.name) }))
    .filter((x): x is { op: OperationTypeData; key: OperationKey } => x.key !== null)
    .map(({ op, key }) => ({
      value: key,
      icon: OPERATION_META[key].icon,
      title: op.name_plural || op.name,
      subtitle: OPERATION_META[key].subtitle,
    }));

  const propertyOptions: ExpandableOption<number>[] = propertyTypes.map((type) => ({
    value: type.id,
    icon: type.icon || '🏠',
    title: type.name,
  }));

  const selectedOperation: OperationKey | null = toOperationKey(formData.operation);
  const selectedProperty: number | null = formData.property_type_id > 0 ? formData.property_type_id : null;

  const handleOperationChange = (value: OperationKey) => {
    trigger('selection');
    updateFormData({ operation: value });
    setOpenPicker(null);
  };

  const handlePropertyTypeChange = (value: number) => {
    trigger('selection');
    updateFormData({ property_type_id: value });
    setOpenPicker(null);
  };

  const handleToggle = (picker: PickerName) => {
    trigger('light');
    setOpenPicker((prev) => (prev === picker ? null : picker));
  };

  return (
    <div className="p-4 space-y-3">
      <ExpandablePicker<OperationKey>
        label="Тип сделки"
        placeholder="Выберите тип сделки"
        selected={selectedOperation}
        options={operationOptions}
        onSelect={handleOperationChange}
        open={openPicker === 'operation'}
        onToggle={() => handleToggle('operation')}
      />

      <ExpandablePicker<number>
        label="Тип недвижимости"
        placeholder="Выберите тип недвижимости"
        selected={selectedProperty}
        options={propertyOptions}
        onSelect={handlePropertyTypeChange}
        open={openPicker === 'property'}
        onToggle={() => handleToggle('property')}
      />
    </div>
  );
}