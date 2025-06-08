export interface AIConfig {
  model: string
  steps: number
  temperature: number
}

export interface Config {
  bars: number
  bpm: number
  aiConfig: AIConfig
}
