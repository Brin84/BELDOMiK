export function formatPriceByn(amount: number, options: { showCurrency?: boolean; compact?: boolean } = {}): string {
  const { showCurrency = true, compact = false } = options;

  if (compact) {
    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(1)}M${showCurrency ? ' BYN' : ''}`;
    }
    if (amount >= 1_000) {
      return `${(amount / 1_000).toFixed(1)}K${showCurrency ? ' BYN' : ''}`;
    }
    return `${amount}${showCurrency ? ' BYN' : ''}`;
  }

  const formatted = amount.toLocaleString('ru-RU', { useGrouping: true });
  return showCurrency ? `${formatted} BYN` : formatted;
}

export function formatPriceUsd(amount: number, options: { showCurrency?: boolean } = {}): string {
  const { showCurrency = true } = options;
  const formatted = amount.toLocaleString('ru-RU', { useGrouping: true });
  return showCurrency ? `$${formatted}` : formatted;
}

export function formatPricePerSqm(pricePerSqm: number): string {
  return `${pricePerSqm.toLocaleString('ru-RU')} BYN/м²`;
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

export function formatPriceChange(oldPrice: number, newPrice: number): string {
  const diff = newPrice - oldPrice;
  const sign = diff > 0 ? '+' : '';
  return `${sign}${formatPriceByn(diff, { showCurrency: true })}`;
}