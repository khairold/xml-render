/**
 * Shared ErrorBoundary base class
 *
 * Catches render errors in segment components and delegates
 * error UI rendering to platform-specific implementations.
 */
import { Component, type ReactNode, type ErrorInfo } from "react";

/**
 * Props for the base ErrorBoundary component
 */
export interface ErrorBoundaryBaseProps {
  /** The child components to render */
  children: ReactNode;
  /** The segment type being rendered (for error messages) */
  segmentType: string;
  /** Optional custom fallback renderer */
  fallback?: (error: Error, segmentType: string) => ReactNode;
  /** Platform-specific renderer for development error UI */
  renderDevError: (error: Error, segmentType: string) => ReactNode;
  /** Platform-specific renderer for production fallback UI */
  renderProdFallback: () => ReactNode;
}

/**
 * State for the ErrorBoundary component
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Base error boundary class with shared logic.
 *
 * Platform-specific error rendering is injected via renderDevError
 * and renderProdFallback props.
 */
export class ErrorBoundaryBase extends Component<
  ErrorBoundaryBaseProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryBaseProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(
      `XmlRender ErrorBoundary: Failed to render segment type "${this.props.segmentType}"`,
      error,
      errorInfo.componentStack
    );
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.props.segmentType);
      }

      if (process.env.NODE_ENV === "development") {
        return this.props.renderDevError(this.state.error, this.props.segmentType);
      }

      return this.props.renderProdFallback();
    }

    return this.props.children;
  }
}
