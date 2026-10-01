/**
 * Types and helper functions for DawIconButton.
 * Follows the DAW control height scale and theme tokens defined in DESIGN.md.
 */

export type DawIconButtonSize = 'xs' | 'sm' | 'md'
export type DawIconButtonAppearance = 'ghost' | 'panel' | 'surface'
export type DawIconButtonVariant = 'default' | 'danger' | 'signal' | 'pulse' | 'chord'

export interface IconButtonClasses {
  button: string[]
  icon: string
}

/**
 * Resolves the appropriate tooltip title for an icon button.
 * Prioritizes disabledReason when disabled, then explicit title, then ariaLabel.
 */
export function resolveIconButtonTitle(
  title?: string,
  ariaLabel?: string,
  disabled?: boolean,
  disabledReason?: string
): string | undefined {
  if (disabled && disabledReason) return disabledReason
  return title || ariaLabel
}

/**
 * Resolves the accessible ARIA label for an icon button.
 * Ensures icon-only buttons always have an accessible name for screen readers.
 */
export function resolveIconButtonAriaLabel(title?: string, ariaLabel?: string): string | undefined {
  return ariaLabel || title
}

/**
 * Maps the size token to canonical DAW dimension and radius classes.
 * - xs: 20px chip (h-5 w-5, rounded-chip) - dense racks, takes, header chips
 * - sm: 24px control (h-6 w-6, rounded-control) - standard editor lists, inspector
 * - md: 28px button (h-7 w-7, rounded-control) - toolbars, prominent actions
 */
export function getIconButtonSizeClasses(size: DawIconButtonSize): { button: string; icon: string } {
  switch (size) {
    case 'xs':
      return {
        button: 'h-5 w-5 rounded-chip',
        icon: 'h-3 w-3'
      }
    case 'md':
      return {
        button: 'h-7 w-7 rounded-control',
        icon: 'h-4 w-4'
      }
    case 'sm':
    default:
      return {
        button: 'h-6 w-6 rounded-control',
        icon: 'h-3.5 w-3.5'
      }
  }
}

/**
 * Computes canonical Tailwind CSS v4 classes for appearance and variant styling.
 */
export function getIconButtonVariantClasses(
  appearance: DawIconButtonAppearance,
  variant: DawIconButtonVariant,
  active = false
): string[] {
  const classes: string[] = []

  // Active state styling overrides standard idle appearances
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

  // Appearance base (idle)
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

  // Variant text, hover and focus ring colors
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
        'text-daw-text-muted',
        'hover:text-daw-text',
        'hover:bg-daw-surface',
        'hover:border-daw-border',
        'focus-visible:ring-daw-signal'
      )
      break
  }

  return classes
}
