import React, { useEffect, useState } from 'react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/authStore';
import { useComparisonStore } from '@/features/comparison/comparisonStore';
import type { PropertyDetail } from '@/shared/api/types';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/ui/EmptyState';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Черновик', color: '#ff9500', bg: 'rgba(255, 149, 0, 0.1)' },
  PENDING_MODERATION: { label: 'На модерации', color: '#007aff', bg: 'rgba(0, 122, 255, 0.1)' },
  PUBLISHED: { label: 'Опубликовано', color: '#34c759', bg: 'rgba(52, 199, 89, 0.1)' },
  REJECTED: { label: 'Отклонено', color: '#ff3b30', bg: 'rgba(255, 59, 48, 0.1)' },
  ARCHIVED: { label: 'В архиве', color: '#8e8e93', bg: 'rgba(142, 142, 147, 0.1)' },
  SOLD: { label: 'Продано', color: '#5856d6', bg: 'rgba(88, 86, 214, 0.1)' },
  RENTED: { label: 'Сдано', color: '#5856d6', bg: 'rgba(88, 86, 214, 0.1)' },
  BLOCKED: { label: 'Заблокировано', color: '#ff3b30', bg: 'rgba(255, 59, 48, 0.1)' },
};

const OPERATION_LABELS: Record<string, string> = {
  sale: 'Продажа',
  rent: 'Аренда',
  daily_rent: 'Посуточно',
  exchange: 'Обмен',
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Квартира',
  house: 'Дом',
  land: 'Земля',
  commercial: 'Коммерческая',
  garage: 'Гараж',
  dacha: 'Дача',
};

const RENOVATION_LABELS: Record<string, string> = {
  none: 'Без ремонта',
  cosmetic: 'Косметический',
  euro: 'Евроремонт',
  designer: 'Дизайнерский',
};

function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return '—';
  return new Intl.NumberFormat('ru-RU').format(price) + ' BYN';
}

function formatPricePerSqm(price: number | null | undefined): string {
  if (price === null || price === undefined) return '—';
  return new Intl.NumberFormat('ru-RU').format(price) + ' BYN/м²';
}

function formatArea(area: number | null | undefined): string {
  if (area === null || area === undefined) return '—';
  return area + ' м²';
}

function getStatusConfig(status: string) {
  return STATUS_LABELS[status] || { label: status, color: '#8e8e93', bg: 'rgba(142, 142, 147, 0.1)' };
}

interface ComparisonRow {
  label: string;
  key: string;
  render: (property: PropertyDetail) => React.ReactNode;
  category: string;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  // Basic info
  { label: 'Тип недвижимости', key: 'property_type', category: 'basic', render: (p) => PROPERTY_TYPE_LABELS[p.property_type] || p.property_type || '—' },
  { label: 'Тип сделки', key: 'operation', category: 'basic', render: (p) => OPERATION_LABELS[p.operation] || p.operation || '—' },
  { label: 'Статус', key: 'status', category: 'basic', render: (p) => {
    const config = getStatusConfig(p.status || '');
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: config.bg, color: config.color }}>
        {config.label}
      </span>
    );
  }},
  { label: 'Город', key: 'city', category: 'basic', render: (p) => p.city || '—' },
  { label: 'Район', key: 'district', category: 'basic', render: (p) => p.district || '—' },
  { label: 'Микрорайон', key: 'neighborhood', category: 'basic', render: (p) => p.neighborhood || '—' },

  // Price
  { label: 'Цена', key: 'price_byn', category: 'price', render: (p) => <strong>{formatPrice(p.price_byn)}</strong> },
  { label: 'Цена за м²', key: 'price_per_m2_byn', category: 'price', render: (p) => formatPricePerSqm(p.price_per_m2_byn) },

  // Area & Rooms
  { label: 'Общая площадь', key: 'total_area', category: 'area', render: (p) => formatArea(p.total_area) },
  { label: 'Жилая площадь', key: 'living_area', category: 'area', render: (p) => formatArea(p.living_area) },
  { label: 'Площадь кухни', key: 'kitchen_area', category: 'area', render: (p) => formatArea(p.kitchen_area) },
  { label: 'Комнат', key: 'rooms_count', category: 'area', render: (p) => p.rooms_count !== null && p.rooms_count !== undefined ? String(p.rooms_count) : '—' },

  // Building
  { label: 'Этаж', key: 'floor', category: 'building', render: (p) => p.floor !== null && p.floor !== undefined ? String(p.floor) : '—' },
  { label: 'Этажей в доме', key: 'total_floors', category: 'building', render: (p) => p.total_floors !== null && p.total_floors !== undefined ? String(p.total_floors) : '—' },
  { label: 'Год постройки', key: 'build_year', category: 'building', render: (p) => p.build_year !== null && p.build_year !== undefined ? String(p.build_year) : '—' },
  { label: 'Ремонт', key: 'renovation', category: 'building', render: (p) => RENOVATION_LABELS[p.renovation || ''] || p.renovation || '—' },

  // Features
  { label: 'Мебель', key: 'furniture', category: 'features', render: (p) => p.furniture ? '✓ Да' : '✗ Нет' },
  { label: 'Балкон/Лоджия', key: 'balcony', category: 'features', render: (p) => p.balcony ? '✓ Да' : '✗ Нет' },
  { label: 'Парковка', key: 'parking', category: 'features', render: (p) => p.parking ? '✓ Да' : '✗ Нет' },
  { label: 'Лифт', key: 'elevator', category: 'features', render: (p) => p.elevator ? '✓ Да' : '✗ Нет' },

  // Metro
  { label: 'Метро', key: 'metro_station_name', category: 'metro', render: (p) => p.metro_station_name || '—' },
  { label: 'До метро', key: 'metro_distance', category: 'metro', render: (p) => p.metro_distance !== null && p.metro_distance !== undefined ? `${p.metro_distance} м` : '—' },

  // Description
  { label: 'Описание', key: 'description', category: 'description', render: (p) => (
    <div className="max-h-32 overflow-y-auto text-sm" style={{ color: 'var(--tg-theme-text-color)' }}>
      {p.description || <span className="text-tg-hint">—</span>}
    </div>
  )},
];

export function ComparisonPage() {
  const { trigger } = useHaptics();
  const { mainButton } = useTelegram();
  const { user, status } = useAuthStore();
  const navigate = useNavigate();
  const {
    selectedIds,
    properties,
    isLoading,
    error,
    loadComparisonDetails,
    removeFromComparison,
    clearComparison,
    getSelectedCount,
  } = useComparisonStore();

  const isAuthenticated = status === 'authenticated' && user;
  const [displayProperties, setDisplayProperties] = useState<PropertyDetail[]>([]);

  // Load comparison details when selectedIds change
  useEffect(() => {
    loadComparisonDetails();
  }, [loadComparisonDetails, selectedIds.join(',')]);

  // Update display properties when store properties change
  useEffect(() => {
    setDisplayProperties(properties);
  }, [properties]);


  // Telegram MainButton - clear all
  useEffect(() => {
    if (mainButton && selectedIds.length > 0) {
      mainButton.setParams({
        text: 'Очистить всё',
        is_visible: true,
        // Telegram MainButton accepts only hex color strings, not CSS var()
        color: '#ff3b30',
        text_color: '#ffffff',
      });
      const handleClick = () => {
        trigger('medium');
        clearComparison();
      };
      mainButton.onClick(handleClick);
      mainButton.show();
      return () => {
        mainButton.hide();
        mainButton.offClick(handleClick);
      };
    } else if (mainButton) {
      mainButton.hide();
    }
  }, [mainButton, selectedIds.length, trigger, clearComparison]);

  if (!isAuthenticated) {
    return (
      <div className="p-4 space-y-6 pb-20">
        <EmptyState
          title="Требуется авторизация"
          description="Войдите в профиль, чтобы сравнивать объявления"
          action={{
            label: 'Войти',
            onClick: () => navigate('/profile'),
          }}
        />
      </div>
    );
  }

  if (selectedIds.length === 0) {
    return (
      <div className="p-4 space-y-6 pb-20">
        <EmptyState
          icon={
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-tg-hint" style={{ opacity: 0.5 }}>
              <polyline points="4 14 10 20 20 4" />
              <line x1="14" y1="4" x2="14" y2="20" />
              <line x1="4" y1="10" x2="4" y2="20" />
            </svg>
          }
          title="Нет объявлений для сравнения"
          description="Добавьте до 4 объявлений из каталога или карточки, чтобы сравнить их характеристики"
          action={{
            label: 'Перейти в каталог',
            onClick: () => {
              clearComparison();
              navigate('/catalog');
            },
          }}
        />
      </div>
    );
  }

  if (isLoading && displayProperties.length === 0) {
    return (
      <div className="p-4 space-y-4 pb-20">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-tg-text text-xl font-bold">Сравнение</h1>
          <span className="text-tg-hint text-sm">{getSelectedCount()} из 4</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]" role="table">
            <thead>
              <tr>
                <th className="p-3 text-left text-tg-hint text-sm font-medium w-48 sticky left-0" style={{ backgroundColor: 'var(--tg-theme-bg-color)', zIndex: 1 }}>Параметр</th>
                {[1, 2, 3, 4].slice(0, selectedIds.length).map((_, i) => (
                  <th key={i} className="p-3 text-center">
                    <Skeleton className="h-32 w-full rounded-xl" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.key}>
                  <td className="p-3 text-tg-hint text-sm font-medium w-48 sticky left-0" style={{ backgroundColor: 'var(--tg-theme-bg-color)', zIndex: 1 }}>{row.label}</td>
                  {[1, 2, 3, 4].slice(0, selectedIds.length).map((_, i) => (
                    <td key={i} className="p-3 text-center">
                      <Skeleton className="h-12 w-full rounded-lg" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (error && displayProperties.length === 0) {
    return (
      <div className="p-4 space-y-6 pb-20">
        <EmptyState
          title="Ошибка загрузки"
          description={error}
          action={{ label: 'Повторить', onClick: loadComparisonDetails }}
        />
      </div>
    );
  }

  const handleRemove = (propertyId: number) => {
    trigger('light');
    removeFromComparison(propertyId);
  };

  const handleViewProperty = (propertyId: number) => {
    trigger('light');
    navigate(`/property/${propertyId}`);
  };

  // Group rows by category
  const categories = [...new Set(COMPARISON_ROWS.map(r => r.category))];

  return (
    <div className="p-4 space-y-6 pb-28" style={{ paddingBottom: 'max(28px, env(safe-area-inset-bottom, 0px))' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-tg-text text-xl font-bold">Сравнение</h1>
        <span className="text-tg-hint text-sm">{getSelectedCount()} из 4</span>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.3)', color: '#ff3b30' }}>
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]" role="table">
          <thead>
            <tr>
              <th className="p-3 text-left text-tg-hint text-sm font-medium w-48 sticky left-0" style={{ backgroundColor: 'var(--tg-theme-bg-color)', zIndex: 1, borderBottom: '1px solid var(--tg-theme-hint-color)', borderWidth: '0.5px' }}>
                Параметр
              </th>
              {displayProperties.map((property) => (
                <th key={property.id} className="p-3 text-center relative">
                  {/* Photo + Remove button */}
                  <div className="relative">
                    <button
                      onClick={() => handleViewProperty(property.id)}
                      className="w-full h-32 rounded-xl overflow-hidden block"
                      style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
                    >
                      {property.photos?.[0]?.url ? (
                        <img src={property.photos[0].url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} className="text-tg-hint" style={{ opacity: 0.3 }}>
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                          </svg>
                        </div>
                      )}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemove(property.id); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(255, 59, 48, 0.9)', color: 'white' }}
                      aria-label="Удалить из сравнения"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => {
              const rows = COMPARISON_ROWS.filter(r => r.category === category);
              return (
                <React.Fragment key={category}>
                  {/* Category header */}
                  <tr>
                    <td colSpan={displayProperties.length + 1} className="px-3 py-2 text-tg-hint text-xs font-medium uppercase tracking-wider" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', borderTop: '1px solid var(--tg-theme-hint-color)', borderWidth: '0.5px' }}>
                      {category === 'basic' && 'Основное'}
                      {category === 'price' && 'Цена'}
                      {category === 'area' && 'Площади и комнаты'}
                      {category === 'building' && 'Здание'}
                      {category === 'features' && 'Особенности'}
                      {category === 'metro' && 'Метро'}
                      {category === 'description' && 'Описание'}
                    </td>
                  </tr>
                  {/* Data rows */}
                  {rows.map((row) => (
                    <tr key={row.key}>
                      <td className="p-3 text-tg-hint text-sm font-medium w-48 sticky left-0" style={{ backgroundColor: 'var(--tg-theme-bg-color)', zIndex: 1, borderBottom: '1px solid var(--tg-theme-hint-color)', borderWidth: '0.5px' }}>
                        {row.label}
                      </td>
                      {displayProperties.map((property) => (
                        <td key={property.id} className="p-3 text-center" style={{ borderBottom: '1px solid var(--tg-theme-hint-color)', borderWidth: '0.5px' }}>
                          {row.render(property)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add more button if less than 4 */}
      {displayProperties.length < 4 && (
        <div className="pt-4">
          <button
            onClick={() => {
              trigger('light');
              clearComparison();
              navigate('/catalog');
            }}
            className="w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            style={{
              backgroundColor: 'var(--tg-theme-button-color)',
              color: 'var(--tg-theme-button-text-color)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Добавить объявление для сравнения
          </button>
        </div>
      )}

      {displayProperties.length > 0 && (
        <p className="text-center text-tg-hint text-sm pt-4" style={{ color: 'var(--tg-theme-hint-color)' }}>
          Свайп влево/вправо для просмотра всех колонок
        </p>
      )}
    </div>
  );
}