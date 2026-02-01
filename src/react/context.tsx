/**
 * React Context for XML Render
 *
 * Provides the component catalog to the render tree via React Context.
 * This allows XmlRender components to access the catalog without prop drilling.
 */
import React, { createContext, useContext, type ReactNode } from "react";
import type { TagDefinitions } from "../registry";
import type { Catalog } from "./catalog";

/**
 * Context value type containing the catalog
 */
interface XmlRenderContextValue<TDefs extends TagDefinitions> {
  catalog: Catalog<TDefs>;
}

/**
 * Internal context value type - uses unknown catalog for internal storage
 * Type safety is ensured at the provider/consumer boundaries
 */
interface InternalContextValue {
  catalog: unknown;
}

/**
 * Internal context - stores catalog as unknown, typed at provider/consumer level
 */
const XmlRenderContext = createContext<InternalContextValue | null>(null);

/**
 * Props for XmlRenderProvider
 */
export interface XmlRenderProviderProps<TDefs extends TagDefinitions> {
  /** The component catalog to provide to the tree */
  catalog: Catalog<TDefs>;
  /** Child components that can use XmlRender */
  children: ReactNode;
}

/**
 * Provider component that makes the catalog available to XmlRender components.
 *
 * Wrap your application or component tree with this provider to enable
 * XML segment rendering.
 *
 * @example
 * ```tsx
 * import { XmlRenderProvider } from '@khairold/xml-render/react';
 * import { catalog } from './xml-catalog';
 *
 * function App() {
 *   return (
 *     <XmlRenderProvider catalog={catalog}>
 *       <MyContent />
 *     </XmlRenderProvider>
 *   );
 * }
 * ```
 */
export function XmlRenderProvider<TDefs extends TagDefinitions>({
  catalog,
  children,
}: XmlRenderProviderProps<TDefs>): React.ReactElement {
  const value: InternalContextValue = { catalog };

  return (
    <XmlRenderContext.Provider value={value}>
      {children}
    </XmlRenderContext.Provider>
  );
}

/**
 * Hook to access the XML render catalog from context.
 *
 * Must be used within an XmlRenderProvider.
 *
 * @throws Error if used outside of XmlRenderProvider
 * @returns The current catalog from context
 *
 * @example
 * ```tsx
 * import { useXmlRenderContext } from '@khairold/xml-render/react';
 *
 * function CustomRenderer() {
 *   const { catalog } = useXmlRenderContext();
 *   // Use catalog to look up renderers...
 * }
 * ```
 */
export function useXmlRenderContext<
  TDefs extends TagDefinitions = TagDefinitions,
>(): XmlRenderContextValue<TDefs> {
  const context = useContext(XmlRenderContext);

  if (!context) {
    throw new Error(
      "useXmlRenderContext must be used within an XmlRenderProvider"
    );
  }

  // Cast the internal unknown catalog back to the typed version
  return { catalog: context.catalog as Catalog<TDefs> };
}
