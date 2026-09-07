import React from 'react';
import { useCreateListingStore } from '../../createListingStore';
import { useGeographyStore } from '@/features/geography/geographyStore';
import { formatPriceByn } from '@/shared/lib/format';
import { findOperationType } from '@/shared/lib/operationKey';
import { propertyTypeIcon } from '@/shared/lib/propertyTypeIcon';

function formatPrice(price: number): React.ReactNode {
  return formatPriceByn(price);
}

export function Step5Preview() {
  const { formData } = useCreateListingStore();
  const { propertyTypes, operationTypes, getRegionById, getCityById, getDistrictById, getNeighborhoodById, getStreetById } = useGeographyStore();

  // Find display names
  const propertyType = propertyTypes.find((t) => t.id === formData.property_type_id);
  const operationType = findOperationType(operationTypes, formData.operation);
  const region = formData.region_id ? getRegionById(formData.region_id) : null;
  const city = formData.city_id ? getCityById(formData.city_id) : null;
  const district = formData.district_id ? getDistrictById(formData.district_id) : null;
  const neighborhood = formData.neighborhood_id ? getNeighborhoodById(formData.neighborhood_id) : null;
  const street = formData.street_id ? getStreetById(formData.street_id) : null;

  const renderPreviewRow = (label: string, value: React.ReactNode) => (
    <div className="flex items-start gap-3 py-3 border-b" style={{ borderColor: 'var(--tg-theme-hint-color)', borderWidth: '0.5px' }}>
      <div className="w-36 flex-shrink-0 text-tg-hint text-sm">{label}</div>
      <div className="flex-1 text-tg-text text-sm">{value}</div>
    </div>
  );

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-6">
        {/* Preview Card */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', border: '1px solid var(--tg-theme-hint-color)' }}>
          {/* Preview Header */}
          <div className="p-4 border-b" style={{ borderColor: 'var(--tg-theme-hint-color)', borderWidth: '0.5px' }}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{propertyType ? propertyTypeIcon(propertyType.icon) : '🏠'}</span>
              <div>
                <h3 className="text-tg-text font-semibold">{formData.title || 'Без названия'}</h3>
                <p className="text-tg-hint text-sm">
                  {operationType?.name_plural || formData.operation} · {propertyType?.name || 'Недвижимость'}
                </p>
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-tg-text">{formatPrice(formData.price_byn)}</div>
          </div>

          {/* Preview Details */}
          <div className="p-4 space-y-3">
            {renderPreviewRow('Тип сделки', operationType?.name_plural || formData.operation)}
            {renderPreviewRow('Тип недвижимости', propertyType?.name || '—')}

            {formData.area && renderPreviewRow('Площадь', `${formData.area} м²`)}
            {formData.rooms !== undefined && renderPreviewRow('Комнат', formData.rooms === 0 ? 'Студия' : String(formData.rooms))}
            {formData.floor && formData.floors_total && renderPreviewRow('Этаж', `${formData.floor}/${formData.floors_total}`)}
            {formData.build_year && renderPreviewRow('Год постройки', String(formData.build_year))}
            {formData.repair_type && renderPreviewRow('Ремонт', formData.repair_type)}

            {/* Location */}
            <div className="pt-2 border-t" style={{ borderColor: 'var(--tg-theme-hint-color)', borderWidth: '0.5px' }}>
              <div className="text-tg-hint text-sm mb-2">Адрес</div>
              <div className="space-y-1 text-tg-text text-sm">
                {region && <div>{region.name}</div>}
                {city && <div>{city.name}</div>}
                {district && <div>{district.name}</div>}
                {neighborhood && <div>{neighborhood.name}</div>}
                {street && <div>{street.name}</div>}
                {formData.address && <div>{formData.address}</div>}
              </div>
            </div>

            {/* Features */}
            <div className="pt-2 border-t" style={{ borderColor: 'var(--tg-theme-hint-color)', borderWidth: '0.5px' }}>
              <div className="text-tg-hint text-sm mb-2">Особенности</div>
              <div className="flex flex-wrap gap-2">
                {formData.has_balcony && <span className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}>🏠 Балкон</span>}
                {formData.has_furniture && <span className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}>🛋️ Мебель</span>}
                {formData.has_elevator && <span className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}>🛗 Лифт</span>}
                {formData.has_parking && <span className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}>🅿️ Парковка</span>}
                {!formData.has_balcony && !formData.has_furniture && !formData.has_elevator && !formData.has_parking && (
                  <span className="text-tg-hint text-xs">Не указано</span>
                )}
              </div>
            </div>

            {/* Description */}
            {formData.description && (
              <div className="pt-2 border-t" style={{ borderColor: 'var(--tg-theme-hint-color)', borderWidth: '0.5px' }}>
                <div className="text-tg-hint text-sm mb-2">Описание</div>
                <div className="text-tg-text text-sm whitespace-pre-wrap">{formData.description}</div>
              </div>
            )}
          </div>
        </div>

        {/* Status Notice */}
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(255, 149, 0, 0.1)', border: '1px solid rgba(255, 149, 0, 0.3)' }}>
          <div className="flex items-start gap-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0 mt-0.5" style={{ color: '#ff9500' }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <p className="text-tg-text font-medium">Объявление отправится на модерацию</p>
              <p className="text-tg-hint text-sm mt-1">
                После проверки модератором объявление появится в каталоге. Вы получите уведомление о результате.
                Обычно модерация занимает до 24 часов.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}