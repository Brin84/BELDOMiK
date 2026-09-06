import React from 'react';

import { BynSymbol } from '@/shared/ui/BynSymbol';

/**
 * Форматирование цены в BYN с новым знаком белорусского рубля.
 *
 * showCurrency: true → рядом с числом рендерится <BynSymbol/> (ReactNode);
 * showCurrency: false → возвращается чистая строка с числом (для aria-labels,
 * строковых контекстов), т.к. знак — это SVG и в строку не вставляется.
 */
export function formatPriceByn(
  amount: number,
  options: { showCurrency?: boolean; compact?: boolean } = {},
): React.ReactNode {
  const { showCurrency = true, compact = false } = options;

  let text: string;
  if (compact) {
    if (amount >= 1_000_000) {
      text = `${(amount / 1_000_000).toFixed(1)}M`;
    } else if (amount >= 1_000) {
      text = `${(amount / 1_000).toFixed(1)}K`;
    } else {
      text = `${amount}`;
    }
  } else {
    text = amount.toLocaleString('ru-RU', { useGrouping: true });
  }

  if (!showCurrency) return text;
  return (
    <>
      {text} <BynSymbol />
    </>
  );
}

export function formatPriceUsd(amount: number, options: { showCurrency?: boolean } = {}): string {
  const { showCurrency = true } = options;
  const formatted = amount.toLocaleString('ru-RU', { useGrouping: true });
  return showCurrency ? `$${formatted}` : formatted;
}

export function formatPricePerSqm(pricePerSqm: number): React.ReactNode {
  return (
    <>
      {pricePerSqm.toLocaleString('ru-RU')} <BynSymbol />/м²
    </>
  );
}

export function formatArea(area: number): string {
  return `${area} м²`;
}

export function formatRooms(rooms: number): string {
  return `${rooms}-комн.`;
}

export function formatFloor(floor: number, floorsTotal: number): string {
  return `${floor}/${floorsTotal} эт.`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'только что';
  if (diffMinutes < 60) return `${diffMinutes} мин. назад`;
  if (diffHours < 24) return `${diffHours} ч. назад`;
  if (diffDays < 7) return `${diffDays} дн. назад`;
  return formatDateShort(dateString);
}

export function formatPercentChange(oldValue: number, newValue: number): string {
  if (oldValue === 0) return '0%';
  const change = ((newValue - oldValue) / oldValue) * 100;
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

export function formatPriceChange(oldPrice: number, newPrice: number): React.ReactNode {
  const diff = newPrice - oldPrice;
  const sign = diff > 0 ? '+' : '';
  return (
    <>
      {sign}
      {formatPriceByn(diff, { showCurrency: true })}
    </>
  );
}
