/**
 * Component Catalog for React XML Renderer
 *
 * Creates a type-safe mapping from segment types to React components.
 * The catalog ensures that each registered tag type has a corresponding
 * renderer component with properly typed props.
 */
import type { ComponentType } from "react";
import type {
  TagDefinitions,
  Registry,
  InferAttributes,
} from "../registry";
import type { ParsedSegment } from "../parser";

/**
 * Props passed to segment renderer components
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
 * Props for the text segment renderer
 */
export interface TextSegmentProps<TDefs extends TagDefinitions> {
  segment: ParsedSegment<TDefs, "text">;
  index: number;
  streaming?: boolean;
}

/**
 * A component that renders a specific segment type
 */
export type SegmentRenderer<
  TDefs extends TagDefinitions,
  TType extends keyof TDefs,
> = ComponentType<SegmentProps<TDefs, TType>>;

/**
 * A component that renders text segments
 */
export type TextRenderer<TDefs extends TagDefinitions> = ComponentType<
  TextSegmentProps<TDefs>
>;

/**
 * Component definitions for the catalog - maps tag names to renderers
 */
export type CatalogComponents<TDefs extends TagDefinitions> = {
  [K in keyof TDefs]: SegmentRenderer<TDefs, K>;
};

/**
 * The catalog interface returned by createCatalog
 */
export interface Catalog<TDefs extends TagDefinitions> {
  /** Get the renderer component for a specific segment type */
  getRenderer<K extends keyof TDefs>(type: K): SegmentRenderer<TDefs, K> | undefined;

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
 * Options for creating a catalog
 */
export interface CatalogOptions<TDefs extends TagDefinitions> {
  /** Component renderers for each tag type */
  components: Partial<CatalogComponents<TDefs>>;
  /** Optional text segment renderer (default renders plain text in a span) */
  textRenderer?: TextRenderer<TDefs>;
}

/**
 * Create a component catalog for rendering XML segments.
 *
 * The catalog maps registered tag types to React components that render them.
 * TypeScript ensures that component props match the tag's attribute schema.
 *
 * @example
 * ```tsx
 * import { createCatalog } from '@khairold/xml-render/react';
 * import { registry } from './xml-registry';
 *
 * const catalog = createCatalog(registry, {
 *   components: {
 *     callout: ({ segment }) => (
 *       <div className={`callout callout-${segment.attributes?.type}`}>
 *         {segment.content}
 *       </div>
 *     ),
 *     chart: ({ segment }) => (
 *       <ChartComponent
 *         type={segment.attributes?.type}
 *         data={segment.content}
 *       />
 *     ),
 *   },
 *   textRenderer: ({ segment }) => <span>{segment.content}</span>,
 * });
 * ```
 *
 * @param registry - The tag registry defining valid segment types
 * @param options - Component renderers and optional text renderer
 * @returns A catalog instance for use with XmlRenderProvider
 */
export function createCatalog<TDefs extends TagDefinitions>(
  registry: Registry<TDefs>,
  options: CatalogOptions<TDefs>
): Catalog<TDefs> {
  const { components, textRenderer } = options;

  const frozenComponents = Object.freeze({ ...components }) as Readonly<
    Partial<CatalogComponents<TDefs>>
  >;

  const catalog: Catalog<TDefs> = {
    registry,
    components: frozenComponents,

    getRenderer<K extends keyof TDefs>(type: K): SegmentRenderer<TDefs, K> | undefined {
      return frozenComponents[type] as SegmentRenderer<TDefs, K> | undefined;
    },

    getTextRenderer(): TextRenderer<TDefs> | undefined {
      return textRenderer;
    },

    hasRenderer(type: keyof TDefs | "text"): boolean {
      if (type === "text") {
        return textRenderer !== undefined;
      }
      return type in frozenComponents;
    },
  };

  return Object.freeze(catalog);
}
