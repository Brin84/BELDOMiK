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
  const lineClamp = 6;

  useEffect(() => {
    if (textRef.current) {
      const lineHeight = parseInt(getComputedStyle(textRef.current).lineHeight, 10) || 22;
      const maxHeight = lineHeight * lineClamp;
      setIsTruncated(textRef.current.scrollHeight > maxHeight);
    }
  }, [description, lineClamp]);

  if (!description || !description.trim()) {
    return null;
  }

  return (
    <section className="property-section">
      <h2 className="property-section__title">Описание</h2>
      <p
        ref={textRef}
        className="property-description__text"
        style={{
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
          type="button"
          onClick={() => {
            trigger('light');
            setIsExpanded(!isExpanded);
          }}
          className="property-description__toggle"
        >
          {isExpanded ? 'Скрыть' : 'Показать всё'}
        </button>
      )}
    </section>
  );
}
