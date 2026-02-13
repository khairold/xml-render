/**
 * Component Catalog for React Native XML Renderer
 *
 * Re-exports the shared catalog implementation.
 *
 * @example
 * ```tsx
 * import { createCatalog } from '@khairold/xml-render/react-native';
 * import { View, Text } from 'react-native';
 * import { registry } from './xml-registry';
 *
 * const catalog = createCatalog(registry, {
 *   components: {
 *     callout: ({ segment }) => (
 *       <View style={styles.callout}>
 *         <Text>{segment.content}</Text>
 *       </View>
 *     ),
 *   },
 *   textRenderer: ({ segment }) => <Text>{segment.content}</Text>,
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
