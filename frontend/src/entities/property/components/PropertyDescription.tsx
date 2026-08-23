import { useState, useRef, useEffect } from 'react';
import { useHaptics } from '@/shared/lib/haptics';

interface PropertyDescriptionProps {
  description: string | undefined | null;
}

export function PropertyDescription({ description }: PropertyDescriptionProps) {
  const { trigger } = useHaptics();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const lineClamp = 5;

  useEffect(() => {
    if (textRef.current) {
      const lineHeight = parseInt(getComputedStyle(textRef.current).lineHeight, 10) || 24;
      const maxHeight = lineHeight * lineClamp;
      setIsTruncated(textRef.current.scrollHeight > maxHeight);
    }
  }, [description, lineClamp]);

  if (!description || !description.trim()) {
    return null;
  }

  return (
    <section className="bg-tg-bg rounded-2xl p-4">
      <h2 className="text-tg-text text-lg font-semibold mb-2">Описание</h2>
      <p
        ref={textRef}
        className="text-tg-text text-sm leading-relaxed"
        style={{
          color: 'var(--tg-theme-text-color)',
          WebkitLineClamp: isExpanded ? 'unset' : lineClamp,
          display: isExpanded ? 'block' : '-webkit-box',
          WebkitBoxOrient: isExpanded ? 'unset' : 'vertical',
          overflow: isExpanded ? 'visible' : 'hidden',
        }}
      >
        {description}
      </p>
      {isTruncated && (
        <button
          onClick={() => {
            trigger('light');
            setIsExpanded(!isExpanded);
          }}
          className="mt-3 text-sm font-medium transition-colors"
          style={{ color: 'var(--tg-theme-button-color)' }}
        >
          {isExpanded ? 'Скрыть' : 'Показать полностью'}
        </button>
      )}
    </section>
  );
}