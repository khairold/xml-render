/**
 * @khairold/xml-render - TypeScript Type Definitions
 *
 * This file consolidates all public TypeScript types for the xml-render library.
 * Import types from here for the best developer experience and autocomplete support.
 *
 * @packageDocumentation
 */

import type { ZodType, infer as ZodInfer } from "zod";
import type { ComponentType, ReactNode } from "react";

// ============================================================================
// Registry Types
// ============================================================================

/**
 * Definition for a single XML tag in the registry.
 *
 * @typeParam TSchema - The Zod schema type for attribute validation
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * import type { TagDefinition } from '@khairold/xml-render';
 *
 * const chartDefinition: TagDefinition<typeof chartSchema> = {
 *   schema: z.object({ type: z.enum(['bar', 'line', 'pie']) }),
 *   hasContent: true,
 *   selfClosing: false,
 * };
 * ```
 */
export interface TagDefinition<TSchema extends ZodType = ZodType> {
  /** Zod schema for validating and typing tag attributes */
  schema: TSchema;
  /** Whether the tag contains inner content (default: true) */
  hasContent?: boolean;
  /** Whether the tag is self-closing like `<image />` (default: false) */
  selfClosing?: boolean;
}

/**
 * Input type for createRegistry - a record of tag names to their definitions.
 *
 * @example
 * ```ts
 * import type { TagDefinitions } from '@khairold/xml-render';
 *
 * const definitions: TagDefinitions = {
 *   chart: { schema: chartSchema, hasContent: true },
 *   image: { schema: imageSchema, selfClosing: true },
 * };
 * ```
 */
export type TagDefinitions = Record<string, TagDefinition>;

/**
 * Infer the TypeScript type of tag attributes from a TagDefinition's Zod schema.
 *
 * This is a key utility type that allows you to extract the attribute types
 * that TypeScript will use for a given tag definition.
 *
 * @typeParam T - The TagDefinition to infer attributes from
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * import type { TagDefinition, InferAttributes } from '@khairold/xml-render';
 *
 * const chartDef = {
 *   schema: z.object({
 *     type: z.enum(['bar', 'line', 'pie']),
 *     title: z.string().optional(),
 *   }),
 * } satisfies TagDefinition;
 *
 * // ChartAttrs = { type: 'bar' | 'line' | 'pie'; title?: string }
 * type ChartAttrs = InferAttributes<typeof chartDef>;
 * ```
 */
export type InferAttributes<T extends TagDefinition> = ZodInfer<T["schema"]>;

/**
 * Safe parse result type for attribute validation.
 *
 * This is a normalized result type that doesn't depend on specific Zod versions,
 * ensuring compatibility across Zod v3 and v4.
 *
 * @typeParam T - The expected data type on success
 */
export type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: unknown };

/**
 * The immutable registry interface returned by createRegistry.
 *
 * The registry provides type-safe access to tag definitions and their
 * Zod schemas for attribute validation. All methods preserve type inference.
 *
 * @typeParam TDefs - The tag definitions record type
 */
export interface Registry<TDefs extends TagDefinitions> {
  /** Get all registered tag names as a readonly array */
  readonly tagNames: ReadonlyArray<keyof TDefs & string>;

  /** Get the definition for a specific tag */
  getTag<K extends keyof TDefs>(name: K): Readonly<TDefs[K]> | undefined;

  /** Check if a tag name is registered (acts as type guard) */
  hasTag(name: string): name is keyof TDefs & string;

  /** Get the Zod schema for a tag's attributes */
  getSchema<K extends keyof TDefs>(name: K): TDefs[K]["schema"] | undefined;

  /** Validate attributes for a tag using its Zod schema */
  validateAttributes<K extends keyof TDefs>(
    name: K,
    attributes: unknown
  ): SafeParseResult<InferAttributes<TDefs[K]>>;

  /** Check if a tag is self-closing (e.g., `<image />`) */
  isSelfClosing<K extends keyof TDefs>(name: K): boolean;

  /** Check if a tag has content (can contain inner text/elements) */
  hasContent<K extends keyof TDefs>(name: K): boolean;

  /** The raw definitions (frozen for immutability) */
  readonly definitions: Readonly<TDefs>;
}

// ============================================================================
// Parser Types
// ============================================================================

/**
 * A parsed segment representing either plain text or a recognized tag.
 *
 * This is the core output type from the parser. Each segment contains:
 * - `type`: Either 'text' for plain content or a registered tag name
 * - `content`: The inner content of the tag or the text content
 * - `attributes`: Typed attributes (only for tag segments, undefined for text)
 *
 * @typeParam TDefs - The tag definitions from the registry
 * @typeParam TType - The specific segment type (defaults to union of all types)
 *
 * @example
 * ```ts
 * // After parsing "<callout type="info">Hello</callout>"
 * const segment: ParsedSegment<MyRegistry, 'callout'> = {
 *   type: 'callout',
 *   content: 'Hello',
 *   attributes: { type: 'info' }, // TypeScript knows the exact shape!
 * };
 * ```
 */
export interface ParsedSegment<
  TDefs extends TagDefinitions = TagDefinitions,
  TType extends keyof TDefs | "text" = keyof TDefs | "text",
> {
  /** The segment type: 'text' or a registered tag name */
  type: TType;
  /** The content inside the tag, or the text content for 'text' segments */
  content: string;
  /** Attributes parsed from the tag (undefined for 'text' segments) */
  attributes?: TType extends keyof TDefs
    ? InferAttributes<TDefs[TType]>
    : undefined;
}

/**
 * A partial segment representing an in-progress tag during streaming.
 *
 * This type surfaces the content of a tag that is still being received,
 * allowing consumers to render progressive/streaming UI for in-progress tags.
 *
 * @typeParam TDefs - The tag definitions from the registry
 * @typeParam TType - The specific tag type (defaults to union of all tag types)
 *
 * @example
 * ```ts
 * if (result.partialSegment) {
 *   console.log(`Streaming <${result.partialSegment.type}>: ${result.partialSegment.content}`);
 * }
 * ```
 */
export interface PartialSegment<
  TDefs extends TagDefinitions = TagDefinitions,
  TType extends keyof TDefs = keyof TDefs,
> {
  /** The tag type being streamed */
  type: TType;
  /** The partial content received so far */
  content: string;
  /** Attributes parsed from the opening tag */
  attributes?: InferAttributes<TDefs[TType]>;
  /** Literal discriminant indicating this segment is still streaming */
  streaming: true;
}

/**
 * Union type of all valid segment types for a given registry.
 *
 * This includes all registered tag names plus the 'text' type for plain content.
 *
 * @typeParam TDefs - The tag definitions from the registry
 *
 * @example
 * ```ts
 * type MyTypes = SegmentType<typeof registry.definitions>;
 * // 'text' | 'callout' | 'chart' | 'image' | ...
 * ```
 */
export type SegmentType<TDefs extends TagDefinitions> = keyof TDefs | "text";

/**
 * An array of parsed segments that can contain any valid segment type.
 *
 * This is the return type of `parser.parse()` and represents the complete
 * parsed output of an XML-containing text string.
 *
 * @typeParam TDefs - The tag definitions from the registry
 */
export type Segments<TDefs extends TagDefinitions> = Array<
  ParsedSegment<TDefs, keyof TDefs | "text">
>;

/**
 * Parser state for handling incomplete/streaming content.
 *
 * This state object is passed between `parseChunk` calls to track:
 * - Buffered content that might be part of an incomplete tag
 * - Whether we're currently inside an opened component tag
 * - The tag being processed and its attributes
 *
 * Create initial state with `parser.createState()`.
 */
export interface ParserState {
  /** Accumulated text buffer */
  buffer: string;
  /** Whether we're currently inside an unclosed component tag */
  inComponent: boolean;
  /** The tag name being processed, if any */
  currentTag: string | null;
  /** Attributes string for the current tag */
  currentAttrs: string;
  /** Index in buffer where current tag started */
  tagStartIndex: number;
}

/**
 * Result of parsing a streaming chunk.
 *
 * Contains the segments that are complete and ready to render,
 * plus the updated state for the next chunk.
 *
 * @typeParam TDefs - The tag definitions from the registry
 */
export interface StreamingParseResult<TDefs extends TagDefinitions> {
  /** Segments that are complete and can be rendered */
  segments: Segments<TDefs>;
  /** Updated parser state for next chunk */
  state: ParserState;
  /** Whether we're currently buffering (waiting for more data) */
  isBuffering: boolean;
  /** The type of tag being buffered, if any (useful for showing loading states) */
  bufferingTag: keyof TDefs | null;
  /** The in-progress segment being streamed, if any */
  partialSegment?: PartialSegment<TDefs>;
}

/**
 * The parser interface returned by createParser.
 *
 * Provides methods for both complete text parsing and streaming parsing.
 *
 * @typeParam TDefs - The tag definitions from the registry
 */
export interface Parser<TDefs extends TagDefinitions> {
  /**
   * Parse a complete text string into segments.
   * This is the main entry point for non-streaming use cases.
   *
   * @param text - The complete text to parse
   * @returns Array of parsed segments in order
   */
  parse(text: string): Segments<TDefs>;

  /**
   * Create initial parser state for streaming parsing.
   *
   * @returns Fresh parser state
   */
  createState(): ParserState;

  /**
   * Parse a chunk of streaming text.
   * Handles incomplete tags by buffering until complete.
   *
   * @param chunk - New text chunk to process
   * @param state - Current parser state
   * @returns Parse result with complete segments and updated state
   */
  parseChunk(chunk: string, state: ParserState): StreamingParseResult<TDefs>;

  /**
   * Finalize parsing, returning any remaining buffered content as text.
   * Call this when streaming is complete.
   *
   * @param state - Current parser state
   * @returns Final segments including any buffered content
   */
  finalize(state: ParserState): Segments<TDefs>;

  /** The registry used by this parser */
  readonly registry: Registry<TDefs>;
}

// ============================================================================
// Renderer Types (Shared between React and React Native)
// ============================================================================

/**
 * Props passed to segment renderer components.
 *
 * Your custom renderer components receive these props to render each segment.
 *
 * @typeParam TDefs - The tag definitions from the registry
 * @typeParam TType - The specific segment type this component renders
 *
 * @example
 * ```tsx
 * import type { SegmentProps } from '@khairold/xml-render/react';
 *
 * function CalloutRenderer({ segment, index }: SegmentProps<MyRegistry, 'callout'>) {
 *   // segment.attributes is fully typed: { type: 'info' | 'warning' | 'error' }
 *   return <div className={`callout-${segment.attributes?.type}`}>{segment.content}</div>;
 * }
 * ```
 */
export interface SegmentProps<
  TDefs extends TagDefinitions,
  TType extends keyof TDefs | "text",
> {
  /** The segment being rendered */
  segment: ParsedSegment<TDefs, TType>;
  /** Index of this segment in the segments array */
  index: number;
  /** Whether this segment is still streaming (true for partial segments) */
  streaming?: boolean;
}

/**
 * Props for the text segment renderer.
 *
 * @typeParam TDefs - The tag definitions from the registry
 */
export interface TextSegmentProps<TDefs extends TagDefinitions> {
  /** The text segment to render */
  segment: ParsedSegment<TDefs, "text">;
  /** Index of this segment in the segments array */
  index: number;
  /** Whether this segment is still streaming (true for partial segments) */
  streaming?: boolean;
}

/**
 * A React component that renders a specific segment type.
 *
 * @typeParam TDefs - The tag definitions from the registry
 * @typeParam TType - The segment type this renderer handles
 */
export type SegmentRenderer<
  TDefs extends TagDefinitions,
  TType extends keyof TDefs,
> = ComponentType<SegmentProps<TDefs, TType>>;

/**
 * A React component that renders text segments.
 *
 * @typeParam TDefs - The tag definitions from the registry
 */
export type TextRenderer<TDefs extends TagDefinitions> = ComponentType<
  TextSegmentProps<TDefs>
>;

/**
 * Component definitions for the catalog - maps tag names to renderer components.
 *
 * @typeParam TDefs - The tag definitions from the registry
 */
export type CatalogComponents<TDefs extends TagDefinitions> = {
  [K in keyof TDefs]: SegmentRenderer<TDefs, K>;
};

/**
 * Options for creating a component catalog.
 *
 * @typeParam TDefs - The tag definitions from the registry
 */
export interface CatalogOptions<TDefs extends TagDefinitions> {
  /** Component renderers for each tag type (can be partial) */
  components: Partial<CatalogComponents<TDefs>>;
  /** Optional text segment renderer (default renders plain text) */
  textRenderer?: TextRenderer<TDefs>;
}

/**
 * The catalog interface returned by createCatalog.
 *
 * Maps segment types to their renderer components with full type safety.
 *
 * @typeParam TDefs - The tag definitions from the registry
 */
export interface Catalog<TDefs extends TagDefinitions> {
  /** Get the renderer component for a specific segment type */
  getRenderer<K extends keyof TDefs>(
    type: K
  ): SegmentRenderer<TDefs, K> | undefined;

  /** Get the text segment renderer */
  getTextRenderer(): TextRenderer<TDefs> | undefined;

  /** Check if a renderer exists for a segment type */
  hasRenderer(type: keyof TDefs | "text"): boolean;

  /** The registry this catalog is based on */
  readonly registry: Registry<TDefs>;

  /** All registered component renderers */
  readonly components: Readonly<Partial<CatalogComponents<TDefs>>>;
}

/**
 * Props for the XmlRenderProvider component.
 *
 * @typeParam TDefs - The tag definitions from the registry
 */
export interface XmlRenderProviderProps<TDefs extends TagDefinitions> {
  /** The component catalog to provide to the tree */
  catalog: Catalog<TDefs>;
  /** Child components that can use XmlRender */
  children: ReactNode;
}

/**
 * Props for the XmlRender component.
 *
 * @typeParam TDefs - The tag definitions from the registry
 */
export interface XmlRenderProps<TDefs extends TagDefinitions> {
  /** Array of parsed segments to render */
  segments: Segments<TDefs>;
  /** Optional fallback renderer for unknown segment types */
  fallback?: (segment: ParsedSegment<TDefs>, index: number) => ReactNode;
  /** Optional catalog override (uses context catalog if not provided) */
  catalog?: Catalog<TDefs>;
  /** Optional custom error fallback renderer */
  errorFallback?: (error: Error, segmentType: string) => ReactNode;
}

/**
 * Props for the ErrorBoundary component.
 */
export interface ErrorBoundaryProps {
  /** The child components to render */
  children: ReactNode;
  /** The segment type being rendered (for error messages) */
  segmentType: string;
  /** Optional custom fallback renderer for errors */
  fallback?: (error: Error, segmentType: string) => ReactNode;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract the tag definitions type from a Registry instance.
 *
 * Useful when you have a registry and need to reference its definitions type.
 *
 * @typeParam R - The Registry type
 *
 * @example
 * ```ts
 * const registry = createRegistry({ ... });
 * type MyDefs = ExtractRegistryDefs<typeof registry>;
 * ```
 */
export type ExtractRegistryDefs<R> = R extends Registry<infer TDefs>
  ? TDefs
  : never;

/**
 * Extract the parser's tag definitions type from a Parser instance.
 *
 * @typeParam P - The Parser type
 */
export type ExtractParserDefs<P> = P extends Parser<infer TDefs>
  ? TDefs
  : never;

/**
 * Extract the catalog's tag definitions type from a Catalog instance.
 *
 * @typeParam C - The Catalog type
 */
export type ExtractCatalogDefs<C> = C extends Catalog<infer TDefs>
  ? TDefs
  : never;

/**
 * Get the attribute type for a specific tag from a registry's definitions.
 *
 * @typeParam TDefs - The tag definitions type
 * @typeParam K - The tag name
 *
 * @example
 * ```ts
 * type ChartAttrs = TagAttributes<MyDefs, 'chart'>;
 * // { type: 'bar' | 'line' | 'pie'; title?: string }
 * ```
 */
export type TagAttributes<
  TDefs extends TagDefinitions,
  K extends keyof TDefs,
> = InferAttributes<TDefs[K]>;

/**
 * Get a typed ParsedSegment for a specific tag from a registry.
 *
 * @typeParam TDefs - The tag definitions type
 * @typeParam K - The tag name
 */
export type TypedSegment<
  TDefs extends TagDefinitions,
  K extends keyof TDefs | "text",
> = ParsedSegment<TDefs, K>;

/**
 * Type guard helper to check if a segment is of a specific type.
 *
 * @param segment - The segment to check
 * @param type - The type to check for
 * @returns Type predicate indicating if segment is of the specified type
 *
 * @example
 * ```ts
 * const segment: ParsedSegment<MyDefs> = ...;
 * if (isSegmentType(segment, 'chart')) {
 *   // TypeScript now knows segment.attributes has chart's attribute type
 *   console.log(segment.attributes?.type); // 'bar' | 'line' | 'pie'
 * }
 * ```
 */
export function isSegmentType<
  TDefs extends TagDefinitions,
  K extends keyof TDefs | "text",
>(
  segment: ParsedSegment<TDefs>,
  type: K
): segment is ParsedSegment<TDefs, K> {
  return segment.type === type;
}
