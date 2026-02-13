/**
 * React Native Context for XML Render
 *
 * Re-exports the shared context implementation.
 *
 * @example
 * ```tsx
 * import { XmlRenderProvider } from '@khairold/xml-render/react-native';
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
export {
  XmlRenderProvider,
  useXmlRenderContext,
  type XmlRenderProviderProps,
} from "../shared/context";
