/**
 * XmlRender Component for React Native
 *
 * Renders an array of parsed segments using the component catalog.
 * Each segment is rendered by its corresponding component from the catalog.
 */
import React, { type ReactElement, type ReactNode } from "react";
import { View, Text } from "react-native";
import type { TagDefinitions } from "../registry";
import type { Segments, ParsedSegment, PartialSegment } from "../parser";
import { useXmlRenderContext } from "./context";
import type { Catalog } from "./catalog";
import { ErrorBoundary } from "./ErrorBoundary";
import { renderSegmentContent } from "../shared/renderSegment";

/**
 * Props for the XmlRender component
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
  /** Optional in-progress segment being streamed */
  partialSegment?: PartialSegment<TDefs>;
}

/**
 * Default text renderer - renders plain text in a Text component
 */
function DefaultTextRenderer<TDefs extends TagDefinitions>({
  segment,
}: {
  segment: ParsedSegment<TDefs>;
}): ReactElement {
  return <Text>{segment.content}</Text>;
}

/**
 * Default fallback renderer for unknown segment types
 */
function DefaultFallback<TDefs extends TagDefinitions>({
  segment,
}: {
  segment: ParsedSegment<TDefs>;
}): ReactElement {
  if (process.env.NODE_ENV === "development") {
    console.warn(
      `XmlRender: No renderer found for segment type "${String(segment.type)}"`
    );
  }
  return <Text>{segment.content}</Text>;
}

/**
 * Renders an array of parsed XML segments using the component catalog.
 *
 * Each segment is matched to its corresponding renderer component from the catalog.
 * Text segments use the catalog's text renderer or a default Text component renderer.
 * Unknown segment types use the fallback prop or render content as plain text.
 *
 * @example
 * ```tsx
 * import { XmlRender, XmlRenderProvider } from '@khairold/xml-render/react-native';
 * import { createParser } from '@khairold/xml-render';
 * import { registry, catalog } from './xml-config';
 *
 * function RichContent({ text }: { text: string }) {
 *   const parser = createParser(registry);
 *   const segments = parser.parse(text);
 *
 *   return (
 *     <XmlRenderProvider catalog={catalog}>
 *       <XmlRender segments={segments} />
 *     </XmlRenderProvider>
 *   );
 * }
 * ```
 *
 * @example With custom fallback
 * ```tsx
 * <XmlRender
 *   segments={segments}
 *   fallback={(segment, index) => (
 *     <View style={styles.unknownSegment}>
 *       <Text>Unknown: {segment.type} - {segment.content}</Text>
 *     </View>
 *   )}
 * />
 * ```
 */
export function XmlRender<TDefs extends TagDefinitions>({
  segments,
  fallback,
  catalog: catalogProp,
  errorFallback,
  partialSegment,
}: XmlRenderProps<TDefs>): ReactElement {
  // Use provided catalog or get from context
  const contextValue = catalogProp ? null : useXmlRenderContext<TDefs>();
  const catalog = catalogProp ?? contextValue?.catalog;

  if (!catalog) {
    throw new Error(
      "XmlRender requires a catalog prop or must be used within XmlRenderProvider"
    );
  }

  return (
    <View>
      {segments.map((segment, index) => (
        <ErrorBoundary
          key={index}
          segmentType={String(segment.type)}
          fallback={errorFallback}
        >
          {renderSegmentContent(segment, index, catalog, DefaultTextRenderer, DefaultFallback, fallback)}
        </ErrorBoundary>
      ))}
      {partialSegment && (
        <ErrorBoundary
          key="partial"
          segmentType={String(partialSegment.type)}
          fallback={errorFallback}
        >
          {renderSegmentContent(
            partialSegment as unknown as ParsedSegment<TDefs>,
            segments.length,
            catalog,
            DefaultTextRenderer,
            DefaultFallback,
            fallback,
            true
          )}
        </ErrorBoundary>
      )}
    </View>
  );
}
