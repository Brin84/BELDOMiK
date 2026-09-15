import { Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { PropertyDetail } from '@/shared/api/types';
import { formatDateShort } from '@/shared/lib/format';

interface PropertyOwnerProps {
  property: PropertyDetail;
  /** Совершить попытку подписки/отписки (вызывается из detail-страницы). */
  onToggleFollow: () => void;
  /** Подписка активна (признак приходит из summary бэкенда). */
  following: boolean;
  /** Актуальное число подписчиков (для оптимистичного UI). */
  followersCount: number;
  /** Своё объявление — подписку на себя прячем (бэкенд отклоняет 400). */
  isOwn: boolean;
}

/** Русская плюрализация: plural(1, 'отзыв', 'отзыва', 'отзывов'). */
function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

/** Карточка продавца в стиле «Барахолка Apple Беларусь»: аватар из Telegram,
 * рейтинг из отзывов, кнопка «Подписаться». Номер убран — звонок только из
 * нижнего бара «Написать / Позвонить». */
export function PropertyOwner({
  property,
  onToggleFollow,
  following,
  followersCount,
  isOwn,
}: PropertyOwnerProps) {
  const navigate = useNavigate();
  const displayName =
    property.contact_name || property.owner_name || 'Частное лицо';
  const displayAgency = property.agency_name;

  const avatarUrl = property.owner_avatar_url || property.agency_logo_url || null;
  const rating = property.owner_rating ?? 0;
  const reviewsCount = property.owner_reviews_count ?? 0;
  const dealsCount = property.owner_deals_count ?? 0;
  const memberSince = property.owner_created_at ? formatDateShort(property.owner_created_at) : null;
  const stars = Math.round(rating);

  // Рейтинг+счётчики: одна строка фактов под именем.
  const facts: string[] = [];
  if (reviewsCount > 0) {
    facts.push(`${rating.toFixed(1)} · ${reviewsCount} ${plural(reviewsCount, 'отзыв', 'отзыва', 'отзывов')}`);
  } else {
    facts.push('Нет отзывов');
  }
  if (dealsCount > 0) {
    facts.push(`${dealsCount} ${plural(dealsCount, 'сделка', 'сделки', 'сделок')}`);
  }
  if (followersCount > 0) {
    facts.push(`${followersCount} ${plural(followersCount, 'подписчик', 'подписчика', 'подписчиков')}`);
  }

  const showFollowButton = !isOwn;

  return (
    <section className="property-section">
      <h2 className="property-section__title">Продавец</h2>

      <div className="seller-card">
        <div className="seller-card__avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" referrerPolicy="no-referrer" />
          ) : (
            initialsOf(displayName)
          )}
        </div>

        <div className="seller-card__body">
          <div className="seller-card__name">{displayName}</div>
          {displayAgency && <div className="seller-card__company">{displayAgency}</div>}
          {memberSince && <div className="seller-card__since">На BELDOMiK с {memberSince}</div>}
        </div>
      </div>

      {/* Рейтинг звёздами (телячья шкала 1–5) */}
      <div className="seller-card__rating">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            size={15}
            strokeWidth={i < stars ? 0 : 1.6}
            fill={i < stars ? '#f59e0b' : 'none'}
            className={i < stars ? 'seller-card__star--filled' : 'seller-card__star--empty'}
          />
        ))}
        <span className="seller-card__rating-text">{facts.join(' · ') || 'Нет отзывов'}</span>
      </div>

      {/* Ссылка на профиль отзывов продавца → /reviews?user=<owner_id>,
          где можно посмотреть отзывы и оставить свой (свой профиль — нельзя). */}
      {property.owner_id ? (
        <button
          type="button"
          className="seller-card__reviews"
          onClick={() => navigate(`/reviews?user=${property.owner_id}`)}
        >
          Отзывы
          {reviewsCount > 0 && ` (${reviewsCount})`}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      ) : null}

      {/* Кнопка подписки — как в Барахолке: голубая «Подписаться» /
          серая «Подписан» (повторный тап — отписка). */}
      {showFollowButton && (
        <button
          type="button"
          className={`seller-card__follow${following ? ' seller-card__follow--active' : ''}`}
          onClick={onToggleFollow}
        >
          {following ? 'Подписан' : 'Подписаться'}
        </button>
      )}
    </section>
  );
}