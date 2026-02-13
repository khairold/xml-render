/**
 * Shared segment rendering logic
 *
 * Provides the core renderSegmentContent function used by both
 * React and React Native XmlRender components.
 */
import React, { type ReactNode, type ComponentType } from "react";
import type { TagDefinitions } from "../registry";
import type { ParsedSegment } from "../parser";
import type { Catalog } from "./catalog";

/**
 * Props for the default text/fallback components injected by each platform
 */
interface DefaultComponentProps<TDefs extends TagDefinitions> {
  segment: ParsedSegment<TDefs>;
}

/**
 * Render a single segment using the catalog.
 *
 * This is the shared rendering logic used by both React and React Native.
 * Platform-specific behavior is injected via the DefaultTextComponent and
 * DefaultFallbackComponent parameters.
 */
export function renderSegmentContent<TDefs extends TagDefinitions>(
  segment: ParsedSegment<TDefs>,
  index: number,
  catalog: Catalog<TDefs>,
  DefaultTextComponent: ComponentType<DefaultComponentProps<TDefs>>,
  DefaultFallbackComponent: ComponentType<DefaultComponentProps<TDefs>>,
  fallback?: (segment: ParsedSegment<TDefs>, index: number) => ReactNode,
  streaming?: boolean
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
          streaming={streaming}
        />
      );
    }
    return <DefaultTextComponent segment={segment} />;
  }

  // Handle registered tag segments
  const Renderer = catalog.getRenderer(segmentType as keyof TDefs);
  if (Renderer) {
    return <Renderer segment={segment as ParsedSegment<TDefs, keyof TDefs>} index={index} streaming={streaming} />;
  }

  // Use fallback for unknown segment types
  if (fallback) {
    return fallback(segment, index);
  }

  return <DefaultFallbackComponent segment={segment} />;
}
