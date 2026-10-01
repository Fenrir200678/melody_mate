/**
 * Types and helper functions for DawButton.
 * Follows the DAW control height scale and theme tokens defined in DESIGN.md.
 */

export type DawButtonSize = 'xs' | 'sm' | 'md' | 'lg'
export type DawButtonAppearance = 'ghost' | 'panel' | 'surface' | 'primary'
export type DawButtonVariant = 'default' | 'danger' | 'signal' | 'pulse' | 'chord'
export type DawButtonAlign = 'start' | 'center' | 'between'

export interface ButtonClasses {
  button: string
  icon: string
}

/**
 * Resolves the appropriate tooltip title for a button.
 */
export function resolveButtonTitle(
  title?: string,
  ariaLabel?: string,
  disabled?: boolean,
  disabledReason?: string
): string | undefined {
  if (disabled && disabledReason) return disabledReason
  return title || ariaLabel
}

/**
 * Maps block and alignment settings to canonical layout and flex classes.
 */
export function getButtonLayoutClasses(block = false, align?: DawButtonAlign): string {
  const resolvedAlign = align ?? (block ? 'start' : 'center')
  const displayClass = block ? 'flex w-full' : 'inline-flex'

  switch (resolvedAlign) {
    case 'start':
      return `${displayClass} justify-start`
    case 'between':
      return `${displayClass} justify-between`
    case 'center':
    default:
      return `${displayClass} justify-center`
  }
}

/**
 * Maps the size token to canonical DAW dimension and radius classes.
 * - xs: 20px chip (h-5 px-2, rounded-chip) - dense racks, takes, header chips
 * - sm: 24px control (h-6 px-2.5, rounded-control) - standard editor lists, inspector
 * - md: 28px button (h-7 px-3, rounded-control) - toolbars, prominent actions
 * - lg: 32px button (h-8 px-4, rounded-control) - primary generative actions
 */
export function getButtonSizeClasses(size: DawButtonSize, autoHeight = false): ButtonClasses {
  const heightClass = (h: string, p: string) => (autoHeight ? `h-auto ${p}`.trim() : h)

  switch (size) {
    case 'xs':
      return {
        button: `${heightClass('h-5', 'py-0.5')} px-2 text-micro rounded-chip gap-1`,
        icon: 'h-3 w-3 shrink-0'
      }
    case 'md':
      return {
        button: `${heightClass('h-7', 'py-1.5')} px-3 text-xs rounded-control gap-1.5`,
        icon: 'h-3.5 w-3.5 shrink-0'
      }
    case 'lg':
      return {
        button: `${heightClass('h-8', 'py-2')} px-4 text-xs font-semibold rounded-control gap-2`,
        icon: 'h-4 w-4 shrink-0'
      }
    case 'sm':
    default:
      return {
        button: `${heightClass('h-6', 'py-1')} px-2.5 text-micro rounded-control gap-1.5`,
        icon: 'h-3 w-3 shrink-0'
      }
  }
}

/**
 * Computes canonical Tailwind CSS v4 classes for appearance and variant styling.
 */
export function getButtonVariantClasses(
  appearance: DawButtonAppearance,
  variant: DawButtonVariant,
  active = false
): string[] {
  if (active) {
    switch (variant) {
      case 'danger':
        return ['bg-daw-danger/20', 'border-daw-danger', 'text-daw-danger', 'shadow-xs']
      case 'signal':
        return ['bg-daw-signal/20', 'border-daw-signal', 'text-daw-signal', 'shadow-xs']
      case 'pulse':
        return ['bg-daw-pulse/20', 'border-daw-pulse', 'text-daw-pulse', 'shadow-xs']
      case 'chord':
        return ['bg-daw-chord/20', 'border-daw-chord', 'text-daw-chord', 'shadow-xs']
      case 'default':
      default:
        return ['bg-daw-surface', 'border-daw-border', 'text-daw-text', 'shadow-xs']
    }
  }

  if (appearance === 'primary') {
    switch (variant) {
      case 'danger':
        return [
          'bg-daw-danger',
          'border',
          'border-daw-danger',
          'text-daw-bg',
          'hover:bg-daw-danger/90',
          'focus-visible:ring-daw-danger'
        ]
      case 'pulse':
        return [
          'bg-daw-pulse',
          'border',
          'border-daw-pulse',
          'text-daw-bg',
          'hover:bg-daw-pulse/90',
          'focus-visible:ring-daw-pulse'
        ]
      case 'chord':
        return [
          'bg-daw-chord',
          'border',
          'border-daw-chord',
          'text-daw-bg',
          'hover:bg-daw-chord/90',
          'focus-visible:ring-daw-chord'
        ]
      case 'signal':
      default:
        return [
          'bg-daw-signal',
          'border',
          'border-daw-signal',
          'text-daw-bg',
          'hover:bg-daw-signal/90',
          'focus-visible:ring-daw-signal'
        ]
    }
  }

  const classes: string[] = []

  switch (appearance) {
    case 'panel':
      classes.push('bg-daw-panel', 'border', 'border-daw-border')
      break
    case 'surface':
      classes.push('bg-daw-surface', 'border', 'border-daw-border')
      break
    case 'ghost':
    default:
      classes.push('bg-transparent', 'border', 'border-transparent')
      break
  }

  switch (variant) {
    case 'danger':
      classes.push(
        'text-daw-danger',
        'hover:bg-daw-danger/15',
        'hover:border-daw-danger/40',
        'hover:text-daw-danger',
        'focus-visible:ring-daw-danger'
      )
      break
    case 'signal':
      classes.push(
        'text-daw-signal',
        'hover:bg-daw-signal/15',
        'hover:border-daw-signal/40',
        'hover:text-daw-signal',
        'focus-visible:ring-daw-signal'
      )
      break
    case 'pulse':
      classes.push(
        'text-daw-pulse',
        'hover:bg-daw-pulse/15',
        'hover:border-daw-pulse/40',
        'hover:text-daw-pulse',
        'focus-visible:ring-daw-pulse'
      )
      break
    case 'chord':
      classes.push(
        'text-daw-chord',
        'hover:bg-daw-chord/15',
        'hover:border-daw-chord/40',
        'hover:text-daw-chord',
        'focus-visible:ring-daw-chord'
      )
      break
    case 'default':
    default:
      classes.push(
        'text-daw-text',
        'hover:text-daw-signal',
        'hover:bg-daw-surface-elevated',
        'hover:border-daw-border',
        'focus-visible:ring-daw-signal'
      )
      break
  }

  return classes
}
