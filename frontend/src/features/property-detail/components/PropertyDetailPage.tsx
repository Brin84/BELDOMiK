import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHaptics } from '@/shared/lib/haptics';
import { usePropertiesStore } from '@/features/properties/propertiesStore';
import { useFavoritesStore } from '@/features/favorites';
import { useChatStore } from '@/features/chat';
import { useToast } from '@/shared/ui/Toast';
import { Skeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/ui/ErrorState';
import { PropertyHeroGallery } from './PropertyHeroGallery';
import { PropertyInfoSection } from '@/entities/property/components/PropertyInfoSection';
import { PropertyDescription } from '@/entities/property/components/PropertyDescription';
import { PropertyCharacteristics } from '@/entities/property/components/PropertyCharacteristics';
import { PropertyLocation } from '@/entities/property/components/PropertyLocation';
import { PropertyOwner } from '@/entities/property/components/PropertyOwner';

import './PropertyDetail.css';

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { trigger } = useHaptics();
  const { showToast } = useToast();
  const { fetchPropertyDetail, propertyDetail, isLoadingDetail, errorDetail, clearPropertyDetail, setLocalFavorite } = usePropertiesStore();
  const { toggleFavorite } = useFavoritesStore();
  const { startChat } = useChatStore();

  const propertyId = id ? parseInt(id, 10) : null;

  // Load property detail on mount
  useEffect(() => {
    if (propertyId) {
      fetchPropertyDetail(propertyId);
    }
    return () => {
      clearPropertyDetail();
    };
  }, [propertyId, fetchPropertyDetail, clearPropertyDetail]);

  // Handle loading state
  if (isLoadingDetail) {
    return (
      <div className="property-page">
        <div className="property-page__content">
          <Skeleton className="aspect-[16/10] w-full rounded-none" />
          <Skeleton className="h-40 w-full rounded-none" />
          <Skeleton className="h-48 w-full rounded-none" />
          <Skeleton className="h-64 w-full rounded-none" />
        </div>
      </div>
    );
  }

  // Handle error state
  if (errorDetail) {
    return (
      <ErrorState
        message={errorDetail}
        onRetry={() => propertyId && fetchPropertyDetail(propertyId)}
      />
    );
  }

  // Handle not found
  if (!propertyDetail) {
    return (
      <ErrorState
        message="Объявление не найдено"
        onRetry={() => navigate(-1)}
      />
    );
  }

  const property = propertyDetail;

  // Krisha-style headline for share/copy; backend has no title on Property.
  const titleParts = [
    property.type_name,
    property.rooms_count ? `${property.rooms_count}-комн.` : null,
    property.total_area ? `${property.total_area} м²` : null,
    property.address || property.city_name,
  ].filter(Boolean);
  const propertyTitle = titleParts.join(', ') || `Объявление #${property.id}`;

  // Kufar-модель: звонок идёт на контактный номер из подачи (contact_phone),
  // если владелец разрешил показ (show_phone). Стрые объявления без contact_*
  // фолбэчат на телефон аккаунта владельца.
  const contactPhone = property.contact_phone || property.owner_phone || null;
  const canCall = property.show_phone !== false && !!contactPhone;
  // Требование продакта: «Написать»+«Позвонить» видны на любой карточке, когда
  // есть телефон. Чат с самим собой бэкенд отклоняет (get_or_create → 404) —
  // тогда вместо входа в чат показываем тост с причиной и НЕ уводим из
  // приложения во внешний Telegram.
  const canWrite = true;

  // Звонок — реальный <a href="tel:">, БЕЗ JS-навигации: WebView Telegram
  // молча глотает window.location.href на tel:, а SDK openLink принимает только
  // http/https (иначе WebAppTgUrlInvalid). Нативный клик по анкору позволяет
  // клиенту Telegram передать номер системной звонилке.
  const callHref = `tel:${contactPhone!.replace(/[^\d+]/g, '')}`;
  const handleCall = () => {
    trigger('success');
  };

  const handleWrite = async () => {
    trigger('light');
    try {
      // Встроенный чат (Kufar-модель): переписка сохраняется, пока не удалишь.
      const conversationId = await startChat(propertyId!, undefined);
      navigate(`/messages/${conversationId}`);
    } catch (error) {
      // Переписка ТОЛЬКО во встроенном чате — никакого перехода во внешний
      // Telegram. Чат недоступен (своё объявление, снято/заблокировано) →
      // тост с причиной от бэкенда, остаёмся в приложении.
      trigger('error');
      showToast(
        error instanceof Error && error.message ? error.message : 'Не удалось открыть чат',
        'warning'
      );
    }
  };

  return (
    <div className="property-page">
      {/* Kufar-галерея: ключевое фото + сетка */}
      <PropertyHeroGallery photos={property.photos || []} />

      <div className="property-page__content">
        {/* Цена (BYN + USD + $/м²) + адрес + чипсы + действия */}
        <PropertyInfoSection
          property={property}
          propertyTitle={propertyTitle}
          propertyUrl={typeof window !== 'undefined' ? window.location.href : undefined}
          onFavoriteToggle={async (propertyId, isCurrentlyFavorite) => {
            trigger('light');
            try {
              await toggleFavorite(propertyId);
            } catch (e) {
              // Error already handled in store; пробрасываем, чтобы
              // PropertyInfoSection откатил локальное сердце.
              throw e;
            }
            // Синхронизируем флаг в списках точечно, БЕЗ ре-фетча детальной
            // страницы: fetchPropertyDetail ставил isLoadingDetail:true и
            // обнулял propertyDetail → вся страница мигала скелетоном на
            // каждом клике по сердцу («объявление обновляется»).
            setLocalFavorite(propertyId, !isCurrentlyFavorite);
          }}
        />

        {/* «О квартире/доме» + «Общие характеристики» */}
        <PropertyCharacteristics property={property} />

        {/* Расположение (карта-превью + адрес) */}
        <PropertyLocation property={property} />

        {/* Описание */}
        <PropertyDescription description={property.description} />

        {/* Продавец */}
        <PropertyOwner owner={null} property={property} />

        {/* Мои телефоны (Kufar: контактные номера продавца) */}
        {canCall && (
          <section className="property-phone-section">
            <div className="property-phone-section__title">Мои телефоны</div>
            <a
              href={callHref}
              onClick={handleCall}
              className="property-phone-section__number"
            >
              {contactPhone}
            </a>
          </section>
        )}
      </div>

      {/* Липкий нижний бар «Написать / Позвонить».
          «Написать» открывает встроенный чат с продавцом (при недоступном чате —
          тост в handleWrite, во внешний Telegram не уходит). Позвонить — только
          если контактный номер задан и разрешён к показу. */}
      {(canWrite || canCall) && (
        <div className="property-bottom-bar">
          {canWrite && (
            <button
              type="button"
              onClick={handleWrite}
              className="property-bottom-bar__btn property-bottom-bar__btn--telegram"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              Написать
            </button>
          )}
          {canCall && (
            <a
              href={callHref}
              onClick={handleCall}
              className="property-bottom-bar__btn property-bottom-bar__btn--call"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Позвонить
            </a>
          )}
        </div>
      )}
    </div>
  );
}
