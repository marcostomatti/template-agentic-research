/**
 * @packageDocumentation
 * Singleton registry that maps channel kinds to their module definitions.
 */
import type { ChannelDefinition } from './types.js';

/**
 * Central registry for notification channel definitions.
 *
 * Each channel module calls `registry.register(definition)` during service
 * startup. {@link dispatch} uses `registry.get(kind)` to look up the schema
 * for payload validation and the optional `deliver()` hook.
 *
 * This is intentionally a simple synchronous registry — no async resolution,
 * no lazy loading. All channels register before the HTTP server accepts
 * requests.
 */
export class ChannelRegistry {
  private readonly entries = new Map<string, ChannelDefinition>();

  /**
   * Registers a channel module definition.
   *
   * @param definition - The channel definition to register.
   * @throws {Error} If the channel kind is already registered.
   */
  register(definition: ChannelDefinition): void {
    if (this.entries.has(definition.kind)) {
      throw new Error(
        `[ChannelRegistry] Channel kind "${definition.kind}" is already registered`,
      );
    }
    this.entries.set(definition.kind, definition);
  }

  /**
   * Looks up a registered channel by kind.
   *
   * @param kind - The channel kind to look up.
   * @returns The channel definition, or `undefined` if not registered.
   */
  get(kind: string): ChannelDefinition | undefined {
    return this.entries.get(kind);
  }

  /**
   * Returns all registered channel kinds — useful for `/status`-style output.
   */
  kinds(): string[] {
    return [...this.entries.keys()];
  }
}

export const channelRegistry = new ChannelRegistry();
