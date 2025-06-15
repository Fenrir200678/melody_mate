type DynamicType = 'static' | 'ramp-up' | 'ramp-down'
export type Dynamic = {
  label: string
  name: string
  range: [number, number]
  type?: DynamicType
}
