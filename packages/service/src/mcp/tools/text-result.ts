/**
 * @packageDocumentation
 * How an MCP tool on this surface answers with a payload.
 *
 * ONE FUNCTION, SHARED BY EVERY WAVE MODULE. Each wave declares
 * its own entries and its own handlers, and all of them answer in
 * one shape — so the shape lives here rather than once per wave,
 * where two copies that agreed today would drift on the first
 * change to either and a client would meet two protocols wearing
 * one name.
 *
 * IT IMPORTS ONE TYPE AND NOTHING ELSE, which is what keeps it out
 * of the cycle `./registry.ts` is careful about: that module takes
 * a VALUE from each wave list, and a wave module taking a value
 * back would close the loop. A type import does not.
 */
import type { McpToolResult } from './registry.js';

/**
 * Wraps an envelope in the single text block a tool answers with.
 *
 * ONE TEXT BLOCK CARRYING THE ENVELOPE THE ROUTE WOULD HAVE SENT,
 * serialised the way `res.json` serialises it — so a `Date` is the
 * same ISO string on both protocols and a client reading a tool
 * result is reading the documented response body. The envelope's
 * `success` member is kept rather than unwrapped: it costs one key
 * and it means the two answers are one shape rather than two that
 * happen to agree about the data.
 *
 * Indented, because the consumer is a model reading text rather
 * than a parser counting bytes.
 *
 * @param payload - The envelope to answer with.
 * @returns The single block a client renders.
 */
export function textResult(payload: unknown): McpToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
  };
}
