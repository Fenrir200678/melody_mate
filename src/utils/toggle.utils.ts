export type DawToggleAppearance = 'switch' | 'button' | 'checkbox'
export type DawToggleVariant = 'signal' | 'pulse' | 'chord' | 'danger'
export type DawToggleSize = 'xs' | 'sm' | 'md'

export interface ToggleStatusLabels {
  on?: string
  off?: string
}

/**
 * Resolves the appropriate tooltip title for a toggle control.
 * Prioritizes disabledReason when disabled, then explicit title, then label.
 */
export function resolveToggleTitle(
  label?: string,
  title?: string,
  disabled?: boolean,
  disabledReason?: string
): string | undefined {
  if (disabled && disabledReason) return disabledReason
  if (title) return title
  return label
}

/**
 * Resolves the accessible ARIA label for a toggle control.
 */
export function resolveToggleAriaLabel(label?: string, ariaLabel?: string): string | undefined {
  return ariaLabel || label
}

/**
 * Resolves the textual status for a toggle (e.g. On / Off or Active / Off).
 */
export function resolveToggleStatus(active: boolean, labels?: ToggleStatusLabels): string {
  if (active) {
    return labels?.on ?? 'On'
  }
  return labels?.off ?? 'Off'
}
