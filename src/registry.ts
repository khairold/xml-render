/**
 * Tag Registry for XML Render
 *
 * Creates an immutable registry of XML tag definitions with Zod schema validation.
 * TypeScript infers attribute types directly from the Zod schemas.
 */
import type {
  TagDefinition,
  TagDefinitions,
  InferAttributes,
  SafeParseResult,
  Registry,
} from "./types";

// Re-export types for backwards compatibility
export type {
  TagDefinition,
  TagDefinitions,
  InferAttributes,
  SafeParseResult,
  Registry,
} from "./types";

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
