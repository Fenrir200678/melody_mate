/**
 * Common Type Definitions
 * Utility types used across the application for consistency and type safety
 */

/**
 * Result type for robust error handling
 * Eliminates throwing exceptions and provides explicit error handling
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E }

/**
 * Type guard to check if a Result is successful
 */
export function isSuccess<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success
}

/**
 * Type guard to check if a Result is an error
 */
export function isError<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success
}

/**
 * Create a successful Result
 */
export function success<T>(data: T): Result<T, never> {
  return { success: true, data }
}

/**
 * Create an error Result
 */
export function error<E>(error: E): Result<never, E> {
  return { success: false, error }
}

/**
 * Async Result type for asynchronous operations
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>

/**
 * Helper to wrap Promise operations in Result pattern
 */
export async function resultFrom<T>(promise: Promise<T>): AsyncResult<T> {
  try {
    const data = await promise
    return success(data)
  } catch (err) {
    return error(err instanceof Error ? err : new Error(String(err)))
  }
}

/**
 * Helper to execute a function and wrap the result
 */
export function tryExecute<T>(fn: () => T): Result<T> {
  try {
    const data = fn()
    return success(data)
  } catch (err) {
    return error(err instanceof Error ? err : new Error(String(err)))
  }
}

/**
 * Helper to execute an async function and wrap the result
 */
export async function tryExecuteAsync<T>(fn: () => Promise<T>): AsyncResult<T> {
  try {
    const data = await fn()
    return success(data)
  } catch (err) {
    return error(err instanceof Error ? err : new Error(String(err)))
  }
}

/**
 * Optional type that can be null or undefined
 */
export type Optional<T> = T | null | undefined

/**
 * Type guard to check if an optional value exists
 */
export function isDefined<T>(value: Optional<T>): value is T {
  return value !== null && value !== undefined
}

/**
 * Type guard to check if an optional value is null or undefined
 */
export function isNullish<T>(value: Optional<T>): value is null | undefined {
  return value === null || value === undefined
}

/**
 * Deep readonly type for immutable objects
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}

/**
 * Partial deep type for optional nested properties
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Non-empty array type
 */
export type NonEmptyArray<T> = [T, ...T[]]

/**
 * Type guard to check if an array is non-empty
 */
export function isNonEmptyArray<T>(array: T[]): array is NonEmptyArray<T> {
  return array.length > 0
}

/**
 * Type to extract the type of array elements
 */
export type ArrayElement<T> = T extends (infer U)[] ? U : never

/**
 * Type to make specific properties required
 */
export type RequireProps<T, K extends keyof T> = T & Required<Pick<T, K>>

/**
 * Type to make specific properties optional
 */
export type OptionalProps<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Type for constructor functions
 */
export type Constructor<T = object> = new (...args: unknown[]) => T

/**
 * Type for abstract constructor functions
 */
export type AbstractConstructor<T = object> = abstract new (...args: unknown[]) => T

/**
 * Union to string literal type helper
 */
export type Stringify<T> = T extends string | number | bigint | boolean | null | undefined ? `${T}` : never

/**
 * Key-value pair type
 */
export interface KeyValuePair<K = string, V = unknown> {
  key: K
  value: V
}

/**
 * Event type for application events
 */
export interface AppEvent<TType extends string = string, TPayload = unknown> {
  type: TType
  payload: TPayload
  timestamp: Date
  id: string
}

/**
 * Type for event handlers
 */
export type EventHandler<TEvent extends AppEvent> = (event: TEvent) => void | Promise<void>

/**
 * Disposable interface for cleanup
 */
export interface Disposable {
  dispose(): void | Promise<void>
}

/**
 * Type guard to check if an object is disposable
 */
export function isDisposable(obj: unknown): obj is Disposable {
  return typeof obj === 'object' && obj !== null && typeof (obj as Disposable).dispose === 'function'
}
