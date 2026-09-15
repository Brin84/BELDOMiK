import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Star } from 'lucide-react';
import { useAuthStore } from '@/features/auth';
import { useHaptics } from '@/shared/lib/haptics';
import { useToast } from '@/shared/ui/Toast';
import { api, API_ENDPOINTS, ApiError } from '@/shared/api';
import type { ReviewListResponse } from '@/shared/api/types';
import { EmptyState, InlineError, ListSkeleton } from '@/shared/ui';
import { formatDateShort } from '@/shared/lib/format';

const STARS = [1, 2, 3, 4, 5];

/** Инициалы из имени: «Иван Петров» → «ИП», «Продавец» → «П». */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
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

/** Звёзды 1–5: заполненные ≤ округлённой оценки, пустые — полупрозрачные. */
function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  const filled = Math.round(rating);
  return (
    <div className="flex gap-0.5">
      {STARS.map((s) => (
        <Star
          key={s}
          size={size}
          strokeWidth={s <= filled ? 0 : 1.6}
          fill={s <= filled ? '#f59e0b' : 'none'}
          className={s <= filled ? '' : 'opacity-40'}
        />
      ))}
    </div>
  );
}

/**
 * Рейтинг и отзывы — по образцу Барахолки.
 *
 * Работает для любого пользователя: ?user=<id> показывает профиль продавца
 * (со своими рейтингом и отзывами) и даёт кнопку «Оставить отзыв». Без параметра
 * — СВОЙ профиль (как из меню профиля), где отзыв оставить нельзя (не о себе).
 *
 * Данные одним запросом: GET /users/{id}/reviews → { items, total, summary }.
 * Отзыв — POST /reviews {user_id, rating, text} (1 на пару, апсерт).
 */
export function ProfileReviewsPage() {
  const { user, status } = useAuthStore();
  const isAuthenticated = status === 'authenticated' && user;
  const { trigger } = useHaptics();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  // ?user=<id> — просмотр профиля продавца; без параметра — свой профиль.
  const userIdParam = searchParams.get('user');
  const targetId = isAuthenticated && user
    ? (userIdParam ? parseInt(userIdParam, 10) : user.id)
    : null;

  const [data, setData] = useState<ReviewListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!targetId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    api
      .get<ReviewListResponse>(API_ENDPOINTS.users.reviews(targetId))
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError && err.status === 404
            ? 'Профиль не найден'
            : 'Не удалось загрузить отзывы'
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [targetId, reloadKey]);

  const openReview = useCallback(() => {
    trigger('light');
    setReviewOpen(true);
  }, [trigger]);

  const closeReview = () => {
    if (submitting) return;
    setReviewOpen(false);
    setReviewText('');
    setReviewRating(5);
  };

  const submitReview = async () => {
    if (!targetId || submitting) return;
    trigger('light');
    setSubmitting(true);
    try {
      await api.post(API_ENDPOINTS.reviews.create, {
        user_id: targetId,
        rating: reviewRating,
        text: reviewText.trim() || null,
      });
      showToast('Отзыв оставлен', 'success');
      setReviewOpen(false);
      setReviewText('');
      setReviewRating(5);
      setReloadKey((k) => k + 1);
    } catch (e) {
      trigger('error');
      showToast(
        e instanceof Error && e.message ? e.message : 'Не удалось оставить отзыв',
        'warning'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4 space-y-6 pb-20">
        <EmptyState
          title="Войдите, чтобы видеть отзывы"
          description="Авторизуйтесь через Telegram, чтобы видеть рейтинг и отзывы, а также оставлять их"
          action={{ label: 'Войти', onClick: () => {} }}
        />
      </div>
    );
  }

  const summary = data?.summary;
  const reviews = data?.items ?? [];
  // Есть ли уже мой отзыв об этом пользователе → кнопка «Изменить отзыв» (апсерт).
  const hasMyReview = Boolean(
    user && summary && !summary.is_self && reviews.some((r) => r.author.id === user.id)
  );

  const badges: string[] = [];
  if (summary) {
    if (summary.reviews_count > 0) {
      badges.push(`${summary.reviews_count} ${plural(summary.reviews_count, 'отзыв', 'отзыва', 'отзывов')}`);
    }
    if (summary.deals_count > 0) {
      badges.push(`${summary.deals_count} ${plural(summary.deals_count, 'сделка', 'сделки', 'сделок')}`);
    }
    if (summary.followers_count > 0) {
      badges.push(`${summary.followers_count} ${plural(summary.followers_count, 'подписчик', 'подписчика', 'подписчиков')}`);
    }
  }

  return (
    <div className="p-4 space-y-5 pb-24">
      <h1 className="text-tg-text text-2xl font-bold">⭐ Рейтинг и отзывы</h1>

      {error && <InlineError message={error} onDismiss={() => setError(null)} />}

      {isLoading && !data ? (
        <ListSkeleton count={4} />
      ) : (
        <>
          {/* Сводка рейтинга — приходит в том же ответе (summary), без лишнего запроса */}
          {summary && (
            <section
              className="p-4 rounded-2xl space-y-3"
              style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}
                >
                  {summary.avatar_url ? (
                    <img src={summary.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    initialsOf(summary.name || '')
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-tg-text font-semibold truncate">{summary.name}</div>
                  {summary.created_at && (
                    <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                      На BELDOMiK с {formatDateShort(summary.created_at)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Stars rating={summary.rating} size={16} />
                <span className="text-tg-text text-base font-bold">{summary.rating.toFixed(1)}</span>
              </div>

              {badges.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {badges.map((b) => (
                    <span
                      key={b}
                      className="px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              )}

              {/* Кнопка «Оставить отзыв» — только на чужом профиле (себе нельзя) */}
              {!summary.is_self && (
                <button
                  type="button"
                  onClick={openReview}
                  className="w-full h-11 rounded-xl text-sm font-bold active:opacity-80 transition-opacity"
                  style={{ backgroundColor: '#f59e0b', color: '#fff' }}
                >
                  {hasMyReview ? 'Изменить отзыв' : '⭐ Оставить отзыв'}
                </button>
              )}
            </section>
          )}

          {/* Список отзывов */}
          {reviews.length === 0 ? (
            <EmptyState
              icon={<span className="text-5xl mb-2">⭐</span>}
              title="Пока нет отзывов"
              description="Отзывы появляются после сделок — как только кто-то оставит отзыв, он появится здесь"
            />
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => {
                const authorName = review.author.name || 'Пользователь';
                return (
                  <article
                    key={review.id}
                    className="p-4 rounded-2xl space-y-2"
                    style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden"
                        style={{ backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}
                      >
                        {review.author.avatar_url ? (
                          <img src={review.author.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          initialsOf(authorName)
                        )}
                      </div>
                      <span className="text-tg-text text-sm font-medium flex-1 truncate">{authorName}</span>
                      <Stars rating={review.rating} size={13} />
                      <span className="text-xs" style={{ color: '#94a3b8' }}>
                        {review.rating.toFixed(1)}
                      </span>
                    </div>
                    {review.text && (
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--tg-theme-text-color)' }}>
                        {review.text}
                      </p>
                    )}
                    <p className="text-xs" style={{ color: '#94a3b8' }}>
                      {formatDateShort(review.created_at)}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Модалка «Оставить отзыв» (стиль Барахолки: звёзды + комментарий) */}
      {reviewOpen && summary && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label="Закрыть" className="absolute inset-0 w-full h-full cursor-pointer border-none bg-transparent" onClick={closeReview} />
            <div className="relative m-4 p-5 rounded-2xl space-y-4" style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}>
              <h3 className="text-lg font-bold text-tg-text">Оставить отзыв</h3>
              <p className="text-xs" style={{ color: '#94a3b8' }}>
                Оцените продавца {summary.name}
              </p>

              {/* Выбор оценки */}
              <div className="flex items-center justify-center gap-2">
                {STARS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { trigger('light'); setReviewRating(s); }}
                    className="w-10 h-10 flex items-center justify-center active:scale-90 transition-transform"
                    aria-label={`Оценка ${s}`}
                  >
                    <Star
                      size={34}
                      strokeWidth={s <= reviewRating ? 0 : 1.4}
                      fill={s <= reviewRating ? '#f59e0b' : 'none'}
                      className={s <= reviewRating ? '' : 'opacity-40'}
                    />
                  </button>
                ))}
              </div>

              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Комментарий (необязательно)"
                rows={3}
                maxLength={1000}
                className="w-full p-3 rounded-xl text-sm resize-none outline-none"
                style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', color: 'var(--tg-theme-text-color)' }}
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeReview}
                  className="flex-1 h-11 rounded-xl text-sm font-semibold"
                  style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', color: 'var(--tg-theme-text-color)' }}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={submitReview}
                  disabled={submitting}
                  className="flex-1 h-11 rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{ backgroundColor: '#f59e0b', color: '#fff' }}
                >
                  {submitting ? 'Отправка…' : 'Отправить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}