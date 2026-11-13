import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'gradient' | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

const base =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-200 select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent-strong text-white hover:bg-accent-hover',
  gradient:
    'bg-linear-to-r from-accent-strong to-accent-2-strong text-white shadow-glow hover:brightness-110',
  secondary: 'border border-border-strong bg-surface-raised text-fg hover:bg-border',
  ghost: 'text-fg-muted hover:bg-surface-raised hover:text-fg',
}

// Heights keep touch targets ≥ 44px for md/lg; sm is for dense desktop UI only.
const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-base [&_svg]:size-5',
}

export interface ButtonStyleProps {
  variant?: ButtonVariant | undefined
  size?: ButtonSize | undefined
  className?: string | undefined
}

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  className,
}: ButtonStyleProps = {}): string {
  return cn(base, variants[variant], sizes[size], className)
}
