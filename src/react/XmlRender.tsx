/**
 * XmlRender Component for React
 *
 * Renders an array of parsed segments using the component catalog.
 * Each segment is rendered by its corresponding component from the catalog.
 */
import React, { type ReactElement, type ReactNode } from "react";
import type { TagDefinitions } from "../registry";
import type { Segments, ParsedSegment } from "../parser";
import { useXmlRenderContext } from "./context";
import type { Catalog } from "./catalog";
import { ErrorBoundary } from "./ErrorBoundary";

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
}

/**
 * Default text renderer - renders plain text in a span
 */
function DefaultTextRenderer<TDefs extends TagDefinitions>({
  segment,
}: {
  segment: ParsedSegment<TDefs, "text">;
}): ReactElement {
  return <span>{segment.content}</span>;
}

/**
 * Default fallback renderer for unknown segment types
 */
function DefaultFallback<TDefs extends TagDefinitions>({
  segment,
}: {
  segment: ParsedSegment<TDefs>;
}): ReactElement {
  // In development, show a warning; in production, render content as text
  if (process.env.NODE_ENV === "development") {
    console.warn(
      `XmlRender: No renderer found for segment type "${String(segment.type)}"`
    );
  }
  return <span>{segment.content}</span>;
}

/**
 * Render a single segment using the catalog (without key or ErrorBoundary wrapper)
 */
function renderSegmentContent<TDefs extends TagDefinitions>(
  segment: ParsedSegment<TDefs>,
  index: number,
  catalog: Catalog<TDefs>,
  fallback?: (segment: ParsedSegment<TDefs>, index: number) => ReactNode
): ReactNode {
  const segmentType = segment.type;

  // Handle text segments
  if (segmentType === "text") {
    const TextRenderer = catalog.getTextRenderer();
    if (TextRenderer) {
      return (
        <TextRenderer
          segment={segment as ParsedSegment<TDefs, "text">}
          index={index}
        />
      );
    }
    return <DefaultTextRenderer segment={segment as ParsedSegment<TDefs, "text">} />;
  }

  // Handle registered tag segments
  const Renderer = catalog.getRenderer(segmentType as keyof TDefs);
  if (Renderer) {
    return <Renderer segment={segment as ParsedSegment<TDefs, keyof TDefs>} index={index} />;
  }

  // Use fallback for unknown segment types
  if (fallback) {
    return fallback(segment, index);
  }

  return <DefaultFallback segment={segment} />;
}

/**
 * Renders an array of parsed XML segments using the component catalog.
 *
 * Each segment is matched to its corresponding renderer component from the catalog.
 * Text segments use the catalog's text renderer or a default span renderer.
 * Unknown segment types use the fallback prop or render content as plain text.
 *
 * @example
 * ```tsx
 * import { XmlRender, XmlRenderProvider } from '@khairold/xml-render/react';
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
 *     <div className="unknown-segment">
 *       Unknown: {segment.type} - {segment.content}
 *     </div>
 *   )}
 * />
 * ```
 */
export function XmlRender<TDefs extends TagDefinitions>({
  segments,
  fallback,
  catalog: catalogProp,
  errorFallback,
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
    <>
      {segments.map((segment, index) => (
        <ErrorBoundary
          key={index}
          segmentType={String(segment.type)}
          fallback={errorFallback}
        >
          {renderSegmentContent(segment, index, catalog, fallback)}
        </ErrorBoundary>
      ))}
    </>
  );
}
