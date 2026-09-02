import { useEffect, useState } from 'react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/authStore';
import { api, API_ENDPOINTS } from '@/shared/api';
import type { PropertyShort } from '@/shared/api/types';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/ui/EmptyState';

interface MyListingsState {
  properties: PropertyShort[];
  isLoading: boolean;
  error: string | null;
}

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
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU').format(price) + ' BYN';
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getStatusConfig(status: string) {
  return STATUS_LABELS[status] || { label: status, color: '#8e8e93', bg: 'rgba(142, 142, 147, 0.1)' };
}

function StatusBadge({ status }: { status: string }) {
  const config = getStatusConfig(status);
  return (
    <span
      className="px-2 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}

function PropertyCard({ property, onClick, onEdit, onDelete }: {
  property: PropertyShort;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { trigger } = useHaptics();
  const mainPhoto = property.photo_url;

  return (
    <button
      onClick={onClick}
      className="w-full p-3 rounded-2xl transition-colors text-left flex gap-3"
      style={{
        backgroundColor: 'var(--tg-theme-secondary-bg-color)',
        border: '1px solid var(--tg-theme-hint-color)',
        borderWidth: '0.5px',
      }}
    >
      {/* Photo */}
      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0" style={{ backgroundColor: 'var(--tg-theme-tertiary-bg-color)' }}>
        {mainPhoto ? (
          <img src={mainPhoto} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--tg-theme-hint-color)' }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-tg-text font-medium truncate">{property.title}</h3>
          <StatusBadge status={property.status} />
        </div>
        <div className="flex items-center gap-2 text-tg-hint text-xs mt-1">
          <span>{OPERATION_LABELS[property.operation] || property.operation}</span>
          <span>·</span>
          <span>{property.property_type}</span>
          {property.city_name && <>· {property.city_name}</>}
        </div>
        <div className="text-tg-text font-bold mt-1">{formatPrice(property.price_byn ?? 0)}</div>
        <div className="text-tg-hint text-xs mt-1">
          Создано: {formatDate(property.created_at)}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); trigger('light'); onEdit(); }}
          className="px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0"
          style={{
            backgroundColor: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
          }}
        >
          Редактировать
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); trigger('error'); onDelete(); }}
          className="px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0"
          style={{
            backgroundColor: 'rgba(255, 59, 48, 0.1)',
            color: '#ff3b30',
            border: '1px solid rgba(255, 59, 48, 0.3)',
          }}
        >
          Удалить
        </button>
      </div>
    </button>
  );
}

function LoadingCard() {
  return (
    <div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', border: '1px solid var(--tg-theme-hint-color)', borderWidth: '0.5px' }}>
      <div className="flex gap-3">
        <Skeleton className="w-20 h-20 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function MyListingsPage() {
  const { trigger } = useHaptics();
  const { mainButton } = useTelegram();
  const { user, status, logout } = useAuthStore();
  const navigate = useNavigate();
  const [state, setState] = useState<MyListingsState>({
    properties: [],
    isLoading: true,
    error: null,
  });

  const isAuthenticated = status === 'authenticated' && user;

  // Load user properties on mount
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadProperties = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const properties = await api.get<PropertyShort[]>(API_ENDPOINTS.properties.myProperties);
        setState({ properties, isLoading: false, error: null });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Ошибка загрузки объявлений';
        setState(prev => ({ ...prev, isLoading: false, error: message }));
      }
    };

    loadProperties();
  }, [isAuthenticated, user?.id]);


  // Telegram MainButton - logout
  useEffect(() => {
    if (mainButton && isAuthenticated) {
      mainButton.setParams({
        text: 'Выйти',
        is_visible: true,
        // Telegram MainButton accepts only hex color strings, not CSS var()
        color: '#ff3b30',
        text_color: '#ffffff',
      });
      const handleClick = () => {
        trigger('medium');
        logout();
      };
      mainButton.onClick(handleClick);
      mainButton.show();
      return () => {
        mainButton.hide();
        mainButton.offClick(handleClick);
      };
    }
  }, [mainButton, isAuthenticated, logout, trigger]);

  if (!isAuthenticated) {
    return (
      <div className="p-4 space-y-6 pb-20">
        <EmptyState
          title="Войдите в профиль"
          description="Авторизуйтесь через Telegram, чтобы управлять своими объявлениями"
          action={{
            label: 'Войти',
            onClick: () => {
              // Auth is handled by TelegramProvider
            },
          }}
        />
      </div>
    );
  }

  const handleEdit = (propertyId: number) => {
    // Navigate to create-listing with draft ID
    navigate(`/create-listing?draft=${propertyId}`);
  };

  const handleDelete = async (propertyId: number) => {
    const confirmed = window.confirm('Удалить это объявление? Это действие нельзя отменить.');
    if (!confirmed) return;

    trigger('success');
    try {
      await api.delete(API_ENDPOINTS.properties.delete(propertyId));
      setState(prev => ({
        ...prev,
        properties: prev.properties.filter(p => p.id !== propertyId),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка при удалении';
      alert(message);
    }
  };

  const handleView = (propertyId: number) => {
    navigate(`/property/${propertyId}`);
  };

  return (
    <div className="p-4 space-y-6 pb-28" style={{ paddingBottom: 'max(28px, env(safe-area-inset-bottom, 0px))' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-tg-text text-xl font-bold">Мои объявления</h1>
        <button
          onClick={() => {
            trigger('medium');
            navigate('/create-listing');
          }}
          className="px-4 py-2 rounded-xl font-medium flex-shrink-0"
          style={{
            backgroundColor: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
          }}
        >
          Создать
        </button>
      </div>

      {state.error && (
        <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.3)', color: '#ff3b30' }}>
          {state.error}
        </div>
      )}

      {state.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <LoadingCard key={i} />)}
        </div>
      ) : state.properties.length === 0 ? (
        <EmptyState
          title="Пока нет объявлений"
          description="Создайте своё первое объявление — это быстро и бесплатно"
          action={{
            label: 'Создать объявление',
            onClick: () => {
              trigger('medium');
              navigate('/create-listing');
            },
          }}
        />
      ) : (
        <div className="space-y-3">
          {state.properties.map(property => (
            <PropertyCard
              key={property.id}
              property={property}
              onClick={() => handleView(property.id)}
              onEdit={() => handleEdit(property.id)}
              onDelete={() => handleDelete(property.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

