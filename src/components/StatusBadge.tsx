import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'pending' | 'collected';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-full text-base font-semibold',
        status === 'pending' && 'status-badge-pending',
        status === 'collected' && 'status-badge-collected',
        className
      )}
    >
      <span className="text-lg" aria-hidden="true">
        {status === 'pending' ? '🟡' : '🟢'}
      </span>
      <span>{status === 'pending' ? 'Not Collected' : 'Collected'}</span>
    </span>
  );
}
