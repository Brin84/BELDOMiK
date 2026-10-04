import { ReactNode } from 'react';

interface NeuTableCellProps {
  label: string;
  value: ReactNode;
  muted?: boolean;
}

export function NeuTableCell({ label, value, muted = false }: NeuTableCellProps) {
  return (
    <div
      className="flex items-baseline justify-between gap-4 py-3 border-b"
      style={{
        borderColor: '#d1d9e6',
      }}
    >
      <span
        className="text-sm flex-shrink-0"
        style={{
          color: 'var(--bd-text-secondary, #718096)',
        }}
      >
        {label}
      </span>
      <span
        className="text-sm font-medium truncate"
        style={{
          color: muted ? 'var(--bd-text-secondary, #718096)' : 'var(--bd-text-primary, #2d3748)',
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </div>
  );
}
