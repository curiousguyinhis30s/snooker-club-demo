import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/design-tokens';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export function LoadingSpinner({
  size = 'md',
  text,
  fullScreen = false,
  className
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={cn('flex flex-col items-center justify-center space-y-3', className)}>
      <Loader2 className={cn(sizeClasses[size], 'animate-spin text-amber-700')} />
      {text && <p className="text-sm text-gray-600 font-medium">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-[60]">
        {spinner}
      </div>
    );
  }

  return spinner;
}

// Inline spinner for buttons
export function ButtonSpinner() {
  return <Loader2 className="w-4 h-4 animate-spin" />;
}

// Skeleton loader for cards/content
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
        <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
      </div>
      <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-20"></div>
    </div>
  );
}

// Skeleton for list items
export function SkeletonListItem() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
          <div>
            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
        <div className="h-6 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  );
}

// Loading state wrapper with skeleton count
export function LoadingSkeleton({ count = 4, type = 'card' }: { count?: number; type?: 'card' | 'list' }) {
  return (
    <div className={type === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4' : 'space-y-3'}>
      {Array.from({ length: count }).map((_, i) => (
        type === 'card' ? <SkeletonCard key={i} /> : <SkeletonListItem key={i} />
      ))}
    </div>
  );
}
