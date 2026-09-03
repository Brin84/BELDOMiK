/** Static promotion label + color lookup (mirrors backend catalog). */
const PROMOTION_META: Record<string, { label: string; color: string; emoji: string }> = {
  pin: { label: 'Закреплено', color: '#ff2d55', emoji: '📌' },
  vip: { label: 'VIP', color: '#af52de', emoji: '⭐' },
  top: { label: 'Топ', color: '#ff9500', emoji: '🔥' },
  highlight: { label: 'Выделено', color: '#007aff', emoji: '💡' },
  bump_up: { label: 'Поднято', color: '#34c759', emoji: '⬆️' },
};

interface PromotionBadgeProps {
  type: string | null | undefined;
}

export function PromotionBadge({ type }: PromotionBadgeProps) {
  if (!type) return null;
  const meta = PROMOTION_META[type];
  if (!meta) return null;
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{
        backgroundColor: `${meta.color}1f`,
        color: meta.color,
        border: `1px solid ${meta.color}55`,
      }}
    >
      {meta.emoji} {meta.label}
    </span>
  );
}
