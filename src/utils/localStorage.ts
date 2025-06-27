/**
 * Saves a state object to localStorage.
 * @param key - The key under which to store the state.
 * @param state - The state object to store.
 */
export function saveState(key: string, state: unknown): void {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(key, serializedState);
  } catch (error) {
    console.error("Error saving state to localStorage:", error);
  }
}

/**
 * Loads a state object from localStorage.
 * @param key - The key from which to load the state.
 * @returns The loaded state object, or undefined if not found or an error occurs.
 */
export function loadState(key: string): unknown | undefined {
  try {
    const serializedState = localStorage.getItem(key);
    if (serializedState === null) {
      return undefined;
    }
    return JSON.parse(serializedState);
  } catch (error) {
    console.error("Error loading state from localStorage:", error);
    return undefined;
  }
}
