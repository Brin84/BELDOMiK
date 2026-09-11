import React from 'react';
import { useCreateListingStore } from '../../createListingStore';
import { useGeographyStore } from '@/features/geography/geographyStore';
import { formatPriceByn } from '@/shared/lib/format';
import { findOperationType } from '@/shared/lib/operationKey';
import { propertyTypeIcon } from '@/shared/lib/propertyTypeIcon';
import type { PromotionTypeName } from '@/shared/api/types';

// Каталог продвижений — статический, идентичен backend promotions_catalog.py.
// Ordered by priority (lowest first).
const PROMOTIONS: {
  type: PromotionTypeName;
  label: string;
  price_byn: number;
  duration_days: number;
  badge_color: string;
  icon: string;
  description: string;
}[] = [
  {
    type: 'bump_up',
    label: 'Поднять',
    price_byn: 15,
    duration_days: 1,
    badge_color: '#34c759',
    icon: '📈',
    description: 'Поднятие в выдаче на 1 день',
  },
  {
    type: 'highlight',
    label: 'Выделить',
    price_byn: 29,
    duration_days: 3,
    badge_color: '#007aff',
    icon: '✨',
    description: 'Подсветка объявления на 3 дня',
  },
  {
    type: 'top',
    label: 'Топ',
    price_byn: 49,
    duration_days: 7,
    badge_color: '#ff9500',
    icon: '🔥',
    description: 'Показ вверху выдачи на 7 дней',
  },
  {
    type: 'vip',
    label: 'VIP',
    price_byn: 99,
    duration_days: 7,
    badge_color: '#af52de',
    icon: '💎',
    description: 'Максимальная заметность на 7 дней',
  },
  {
    type: 'pin',
    label: 'Закрепить',
    price_byn: 129,
    duration_days: 7,
    badge_color: '#ff2d55',
    icon: '📌',
    description: 'Закрепление объявления на 7 дней',
  },
];

function formatPrice(price: number): React.ReactNode {
  return formatPriceByn(price);
}

export function Step6Preview() {
  const { formData, selectedPromotion, setSelectedPromotion } = useCreateListingStore();
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
    <div className="flex items-start gap-3 py-3 border-b" style={{ borderColor: '#e2e8f0', borderWidth: '0.5px' }}>
      <div className="w-36 flex-shrink-0 text-sm" style={{ color: '#64748b' }}>{label}</div>
      <div className="flex-1 text-sm font-medium" style={{ color: '#0f172a' }}>{value}</div>
    </div>
  );

  const handlePromoSelect = (type: PromotionTypeName) => {
    setSelectedPromotion(selectedPromotion === type ? null : type);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-6">
        {/* Preview Card */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
          {/* Preview Header */}
          <div className="p-4 border-b" style={{ borderColor: '#e2e8f0', borderWidth: '0.5px' }}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{propertyType ? propertyTypeIcon(propertyType.icon) : '🏠'}</span>
              <div>
                <h3 className="font-semibold" style={{ color: '#0f172a' }}>{formData.title || 'Без названия'}</h3>
                <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
                  {operationType?.name_plural || formData.operation} · {propertyType?.name || 'Недвижимость'}
                </p>
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold" style={{ color: '#0f172a' }}>
              {formData.is_negotiable
                ? <span style={{ color: '#64748b' }}>Договорная</span>
                : formatPrice(formData.price_byn)}
            </div>
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
            <div className="pt-2 border-t" style={{ borderColor: '#e2e8f0', borderWidth: '0.5px' }}>
              <div className="text-sm mb-2" style={{ color: '#64748b' }}>Адрес</div>
              <div className="space-y-1 text-sm" style={{ color: '#0f172a' }}>
                {region && <div>{region.name}</div>}
                {city && <div>{city.name}</div>}
                {district && <div>{district.name}</div>}
                {neighborhood && <div>{neighborhood.name}</div>}
                {street && <div>{street.name}</div>}
                {formData.address && <div>{formData.address}</div>}
              </div>
            </div>

            {/* Features */}
            <div className="pt-2 border-t" style={{ borderColor: '#e2e8f0', borderWidth: '0.5px' }}>
              <div className="text-sm mb-2" style={{ color: '#64748b' }}>Особенности</div>
              <div className="flex flex-wrap gap-2">
                {formData.has_balcony && <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#f1f5f9', color: '#0f172a' }}>🏠 Балкон</span>}
                {formData.has_furniture && <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#f1f5f9', color: '#0f172a' }}>🛋️ Мебель</span>}
                {formData.has_elevator && <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#f1f5f9', color: '#0f172a' }}>🛗 Лифт</span>}
                {formData.has_parking && <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#f1f5f9', color: '#0f172a' }}>🅿️ Парковка</span>}
                {!formData.has_balcony && !formData.has_furniture && !formData.has_elevator && !formData.has_parking && (
                  <span className="text-xs" style={{ color: '#64748b' }}>Не указано</span>
                )}
              </div>
            </div>

            {/* Contact */}
            {formData.contact_name && (
              <div className="pt-2 border-t" style={{ borderColor: '#e2e8f0', borderWidth: '0.5px' }}>
                <div className="text-sm" style={{ color: '#64748b' }}>Контакт</div>
                <div className="text-sm font-medium mt-1" style={{ color: '#0f172a' }}>{formData.contact_name}</div>
              </div>
            )}

            {/* Description */}
            {formData.description && (
              <div className="pt-2 border-t" style={{ borderColor: '#e2e8f0', borderWidth: '0.5px' }}>
                <div className="text-sm mb-2" style={{ color: '#64748b' }}>Описание</div>
                <div className="text-sm whitespace-pre-wrap" style={{ color: '#0f172a' }}>{formData.description}</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Блок продвижения (Kufar-стиль) ───────────────────────────── */}
        <div>
          <h3 className="font-semibold text-lg mb-1" style={{ color: '#0f172a' }}>
            Поднимите объявление в поиске
          </h3>
          <p className="text-sm mb-3" style={{ color: '#64748b' }}>
            Выберите продвижение и оплатите после публикации
          </p>

          {/* Горизонтальный скролл с карточками продвижений */}
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {PROMOTIONS.map((promo) => {
              const isSelected = selectedPromotion === promo.type;
              return (
                <button
                  key={promo.type}
                  onClick={() => handlePromoSelect(promo.type)}
                  className="flex-shrink-0 w-[140px] rounded-2xl p-3 text-left transition-all active:scale-[0.97]"
                  style={{
                    backgroundColor: isSelected ? '#ffffff' : '#f8fafc',
                    border: isSelected
                      ? `2px solid ${promo.badge_color}`
                      : '1px solid #e2e8f0',
                    boxShadow: isSelected ? `0 4px 14px ${promo.badge_color}22` : 'none',
                  }}
                >
                  {/* Иконка + название */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                      style={{ backgroundColor: `${promo.badge_color}18`, color: promo.badge_color }}
                    >
                      {promo.icon}
                    </span>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: '#0f172a' }}>{promo.label}</div>
                      <div className="text-[11px]" style={{ color: '#64748b' }}>{promo.duration_days} дн.</div>
                    </div>
                  </div>

                  {/* Цена */}
                  <div className="text-lg font-bold" style={{ color: promo.badge_color }}>
                    {formatPriceByn(promo.price_byn)}
                  </div>

                  {/* Описание */}
                  <p className="text-[11px] mt-1 leading-snug" style={{ color: '#64748b' }}>
                    {promo.description}
                  </p>

                  {/* Выбрано */}
                  {isSelected && (
                    <div
                      className="mt-2 text-[11px] font-medium text-center py-1 rounded-full"
                      style={{ backgroundColor: `${promo.badge_color}14`, color: promo.badge_color }}
                    >
                      ✓ Выбрано
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Notice */}
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(255, 149, 0, 0.08)', border: '1px solid rgba(255, 149, 0, 0.25)' }}>
          <div className="flex items-start gap-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0 mt-0.5" style={{ color: '#ff9500' }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <p className="font-medium" style={{ color: '#0f172a' }}>Объявление отправится на модерацию</p>
              <p className="text-sm mt-1" style={{ color: '#64748b' }}>
                Автоматическая проверка обычно занимает до нескольких минут.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}