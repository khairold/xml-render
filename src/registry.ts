/**
 * Tag Registry for XML Render
 *
 * Creates an immutable registry of XML tag definitions with Zod schema validation.
 * TypeScript infers attribute types directly from the Zod schemas.
 */
import type { ZodType, infer as ZodInfer } from "zod";

/**
 * Definition for a single XML tag in the registry
 */
export interface TagDefinition<TSchema extends ZodType = ZodType> {
  /** Zod schema for validating and typing tag attributes */
  schema: TSchema;
  /** Whether the tag contains inner content (default: true) */
  hasContent?: boolean;
  /** Whether the tag is self-closing like <image /> (default: false) */
  selfClosing?: boolean;
}

/**
 * Input type for createRegistry - a record of tag names to definitions
 */
export type TagDefinitions = Record<string, TagDefinition>;

/**
 * Infer the attribute type from a TagDefinition's Zod schema
 */
export type InferAttributes<T extends TagDefinition> = ZodInfer<T["schema"]>;

/**
 * Safe parse result type for validateAttributes
 */
export type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: unknown };

/**
 * The immutable registry type returned by createRegistry
 */
export interface Registry<TDefs extends TagDefinitions> {
  /** Get all registered tag names */
  readonly tagNames: ReadonlyArray<keyof TDefs & string>;

  /** Get the definition for a specific tag */
  getTag<K extends keyof TDefs>(name: K): Readonly<TDefs[K]> | undefined;

  /** Check if a tag name is registered */
  hasTag(name: string): name is keyof TDefs & string;

  /** Get the Zod schema for a tag's attributes */
  getSchema<K extends keyof TDefs>(name: K): TDefs[K]["schema"] | undefined;

  /** Validate attributes for a tag using its Zod schema */
  validateAttributes<K extends keyof TDefs>(
    name: K,
    attributes: unknown
  ): SafeParseResult<InferAttributes<TDefs[K]>>;

  /** Check if a tag is self-closing */
  isSelfClosing<K extends keyof TDefs>(name: K): boolean;

  /** Check if a tag has content */
  hasContent<K extends keyof TDefs>(name: K): boolean;

  /** The raw definitions (frozen) */
  readonly definitions: Readonly<TDefs>;
}

/**
 * Create an immutable tag registry from tag definitions.
 *
 * The registry provides type-safe access to tag definitions and their
 * Zod schemas for attribute validation.
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * import { createRegistry } from '@khairold/xml-render';
 *
 * const registry = createRegistry({
 *   chart: {
 *     schema: z.object({
 *       type: z.enum(['bar', 'line', 'pie']),
 *       title: z.string().optional(),
 *     }),
 *     hasContent: true,
 *   },
 *   image: {
 *     schema: z.object({
 *       src: z.string(),
 *       alt: z.string().optional(),
 *     }),
 *     selfClosing: true,
 *     hasContent: false,
 *   },
 * });
 *
 * // TypeScript knows the exact tag names
 * registry.tagNames; // ['chart', 'image']
 *
 * // Attribute types are inferred from Zod schemas
 * type ChartAttrs = InferAttributes<typeof registry.definitions.chart>;
 * // { type: 'bar' | 'line' | 'pie'; title?: string }
 * ```
 *
 * @param definitions - Record of tag names to their definitions
 * @returns An immutable registry instance
 */
export function createRegistry<TDefs extends TagDefinitions>(
  definitions: TDefs
): Registry<TDefs> {
  // Freeze the definitions to make the registry immutable
  const frozenDefs = Object.freeze(
    Object.fromEntries(
      Object.entries(definitions).map(([name, def]) => [
        name,
        Object.freeze({
          ...def,
          hasContent: def.hasContent ?? true,
          selfClosing: def.selfClosing ?? false,
        }),
      ])
    )
  ) as Readonly<TDefs>;

  const tagNames = Object.freeze(Object.keys(frozenDefs)) as ReadonlyArray<
    keyof TDefs & string
  >;

  const tagNameSet = new Set(tagNames);

  const registry: Registry<TDefs> = {
    tagNames,
    definitions: frozenDefs,

    getTag<K extends keyof TDefs>(name: K): Readonly<TDefs[K]> | undefined {
      return frozenDefs[name];
    },

    hasTag(name: string): name is keyof TDefs & string {
      return tagNameSet.has(name);
    },

    getSchema<K extends keyof TDefs>(name: K): TDefs[K]["schema"] | undefined {
      return frozenDefs[name]?.schema;
    },

    validateAttributes<K extends keyof TDefs>(
      name: K,
      attributes: unknown
    ): SafeParseResult<InferAttributes<TDefs[K]>> {
      const schema = frozenDefs[name]?.schema;
      if (!schema) {
        return {
          success: false,
          error: new Error(`Unknown tag: ${String(name)}`),
        };
      }
      // Use Zod's safeParse and normalize the result
      const result = schema.safeParse(attributes);
      if (result.success) {
        return {
          success: true,
          data: result.data as InferAttributes<TDefs[K]>,
        };
      }
      return { success: false, error: result.error };
    },

    isSelfClosing<K extends keyof TDefs>(name: K): boolean {
      return frozenDefs[name]?.selfClosing ?? false;
    },

    hasContent<K extends keyof TDefs>(name: K): boolean {
      return frozenDefs[name]?.hasContent ?? true;
    },
  };

  // Freeze the registry itself
  return Object.freeze(registry);
}
