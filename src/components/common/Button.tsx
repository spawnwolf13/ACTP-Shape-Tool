import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'active'
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  default: 'bg-neutral-800 hover:bg-neutral-700',
  primary: 'bg-indigo-700 hover:bg-indigo-600',
  danger: 'bg-red-900 hover:bg-red-800',
  active: 'bg-indigo-700',
}

export function Button({ variant = 'default', className = '', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`rounded px-2 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  )
}
