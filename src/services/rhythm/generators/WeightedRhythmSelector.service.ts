import type { WeightedRhythm, RhythmCategory } from '@/ts/types/rhythm.types'
import { WEIGHTED_RHYTHMS } from '@/data/weighted_rhythms'

/**
 * Service responsible for selecting rhythms from the weighted rhythm collection
 */
export class WeightedRhythmSelector {
  private rhythms: WeightedRhythm[]

  constructor() {
    this.rhythms = WEIGHTED_RHYTHMS
  }

  /**
   * Selects a rhythm from the specified category
   * @param category - The rhythm category to select from
   * @param useRandom - Whether to select randomly or use the first rhythm
   * @returns The selected rhythm or null if none found
   */
  select(category: RhythmCategory, useRandom: boolean = false): WeightedRhythm | null {
    const rhythmsInCategory = this.getRhythmsInCategory(category)

    if (rhythmsInCategory.length === 0) {
      console.warn(`No rhythms found in category: ${category}`)
      return null
    }

    if (useRandom) {
      return this.selectRandomRhythm(rhythmsInCategory)
    }

    return rhythmsInCategory[0]
  }

  /**
   * Gets all rhythms in a specific category
   * @param category - The rhythm category
   * @returns Array of rhythms in the category
   */
  getRhythmsInCategory(category: RhythmCategory): WeightedRhythm[] {
    return this.rhythms.filter((rhythm) => rhythm.category === category)
  }

  /**
   * Gets all available rhythm categories
   * @returns Array of unique categories
   */
  getAvailableCategories(): RhythmCategory[] {
    const categories = new Set(this.rhythms.map((rhythm) => rhythm.category))
    return Array.from(categories)
  }

  /**
   * Selects a random rhythm from the given array
   * @param rhythms - Array of rhythms to choose from
   * @returns Randomly selected rhythm
   */
  private selectRandomRhythm(rhythms: WeightedRhythm[]): WeightedRhythm {
    const randomIndex = Math.floor(Math.random() * rhythms.length)
    return rhythms[randomIndex]
  }

  /**
   * Gets the default rhythm for a category
   * @param category - The rhythm category
   * @returns The first rhythm in the category or null if none found
   */
  getDefaultRhythm(category: RhythmCategory): WeightedRhythm | null {
    return this.select(category, false)
  }

  /**
   * Searches for rhythms by name (case-insensitive)
   * @param name - The name to search for
   * @returns Array of matching rhythms
   */
  searchByName(name: string): WeightedRhythm[] {
    const searchTerm = name.toLowerCase()
    return this.rhythms.filter((rhythm) => rhythm.name.toLowerCase().includes(searchTerm))
  }

  /**
   * Gets a specific rhythm by name
   * @param name - The exact rhythm name
   * @returns The rhythm or null if not found
   */
  getRhythmByName(name: string): WeightedRhythm | null {
    return this.rhythms.find((rhythm) => rhythm.name === name) || null
  }

  /**
   * Gets the total number of rhythms available
   * @returns Total count of rhythms
   */
  getTotalCount(): number {
    return this.rhythms.length
  }

  /**
   * Gets the count of rhythms in a specific category
   * @param category - The rhythm category
   * @returns Count of rhythms in the category
   */
  getCategoryCount(category: RhythmCategory): number {
    return this.getRhythmsInCategory(category).length
  }
}
