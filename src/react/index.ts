/**
 * @khairold/xml-render/react - React Renderer
 *
 * React components for rendering parsed XML segments.
 * Use this entry point for web applications.
 *
 * @example
 * ```tsx
 * import { XmlRenderProvider, XmlRender, createCatalog } from '@khairold/xml-render/react';
 * import { createParser, createRegistry } from '@khairold/xml-render';
 *
 * // Create catalog with your component renderers
 * const catalog = createCatalog(registry, {
 *   components: {
 *     callout: ({ segment }) => <Callout type={segment.attributes?.type}>{segment.content}</Callout>,
 *   },
 * });
 *
 * // Render segments
 * <XmlRenderProvider catalog={catalog}>
 *   <XmlRender segments={parser.parse(text)} />
 * </XmlRenderProvider>
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// Core Functions
// ============================================================================

// Catalog - Create component mappings
export { createCatalog } from "./catalog";

// ============================================================================
// Components
// ============================================================================

// Provider and consumer hook
export { XmlRenderProvider, useXmlRenderContext } from "./context";

// Main render component
export { XmlRender } from "./XmlRender";

// Error boundary for safe rendering
export { ErrorBoundary } from "./ErrorBoundary";

// ============================================================================
// Type Exports
// ============================================================================

// Catalog types
export type {
  Catalog,
  CatalogOptions,
  CatalogComponents,
  SegmentProps,
  SegmentRenderer,
  TextRenderer,
  TextSegmentProps,
} from "./catalog";

// Context types
export type { XmlRenderProviderProps } from "./context";

// Component types
export type { XmlRenderProps } from "./XmlRender";

// Error boundary types
export type { ErrorBoundaryProps } from "./ErrorBoundary";
