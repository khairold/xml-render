/**
 * Component Catalog for React XML Renderer
 *
 * Re-exports the shared catalog implementation.
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
 *   },
 *   textRenderer: ({ segment }) => <span>{segment.content}</span>,
 * });
 * ```
 */
export {
  createCatalog,
  type Catalog,
  type CatalogOptions,
  type CatalogComponents,
  type SegmentProps,
  type SegmentRenderer,
  type TextRenderer,
  type TextSegmentProps,
} from "../shared/catalog";
