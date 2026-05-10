import { cn } from '@/lib/utils';

interface Props {
  children: React.ReactNode;
  className?: string;
}

export function ErrorMessage({ children, className }: Props) {
  return <p className={cn('text-sm text-destructive', className)}>{children}</p>;
}
