/**
 * @khairold/xml-render - Core XML Parsing Library
 *
 * A type-safe XML-like tag parser and renderer framework.
 * Supports both complete text parsing and streaming for real-time content.
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * import { createRegistry, createParser } from '@khairold/xml-render';
 *
 * // Define your tags with Zod schemas
 * const registry = createRegistry({
 *   callout: {
 *     schema: z.object({ type: z.enum(['info', 'warning', 'error']) }),
 *     hasContent: true,
 *   },
 * });
 *
 * // Create a parser and parse content
 * const parser = createParser(registry);
 * const segments = parser.parse('Hello <callout type="info">Important!</callout>');
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// Core Functions
// ============================================================================

// Registry - Define your XML tags
export { createRegistry } from "./registry";

// Parser - Parse text into segments
export { createParser } from "./parser";

// ============================================================================
// Type Exports - Import from here for best DX
// ============================================================================

// Consolidated types file - preferred import location for types
export * from "./types";

// Re-export type guard helper
export { isSegmentType } from "./types";

// ============================================================================
// Legacy Type Exports (for backwards compatibility)
// These are also exported from ./types for convenience
// ============================================================================

export type {
  TagDefinition,
  TagDefinitions,
  Registry,
  InferAttributes,
  SafeParseResult,
} from "./registry";

export type {
  Parser,
  ParsedSegment,
  SegmentType,
  Segments,
  ParserState,
  StreamingParseResult,
} from "./parser";
