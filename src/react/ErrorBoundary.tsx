/**
 * ErrorBoundary Component for React
 *
 * Catches render errors in segment components and displays a fallback UI.
 * Prevents a single segment error from crashing the entire content area.
 */
import React, { Component, type ReactNode, type ErrorInfo } from "react";

/**
 * Props for the ErrorBoundary component
 */
export interface ErrorBoundaryProps {
  /** The child components to render */
  children: ReactNode;
  /** The segment type being rendered (for error messages) */
  segmentType: string;
  /** Optional custom fallback renderer */
  fallback?: (error: Error, segmentType: string) => ReactNode;
}

/**
 * State for the ErrorBoundary component
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component that catches render errors in child components.
 *
 * In development mode, displays a visible error message with segment type and error details.
 * In production mode, renders a minimal hidden fallback to avoid disrupting the UI.
 *
 * @example
 * ```tsx
 * <ErrorBoundary segmentType="chart">
 *   <ChartComponent data={data} />
 * </ErrorBoundary>
 * ```
 *
 * @example With custom fallback
 * ```tsx
 * <ErrorBoundary
 *   segmentType="table"
 *   fallback={(error, type) => <div>Failed to render {type}: {error.message}</div>}
 * >
 *   <TableComponent data={data} />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error for debugging
    console.error(
      `XmlRender ErrorBoundary: Failed to render segment type "${this.props.segmentType}"`,
      error,
      errorInfo.componentStack
    );
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.props.segmentType);
      }

      // Development: show detailed error info
      if (process.env.NODE_ENV === "development") {
        return (
          <span
            style={{
              display: "inline-block",
              padding: "4px 8px",
              backgroundColor: "#fee2e2",
              border: "1px solid #ef4444",
              borderRadius: "4px",
              color: "#991b1b",
              fontSize: "12px",
              fontFamily: "monospace",
            }}
          >
            Error in [{this.props.segmentType}]: {this.state.error.message}
          </span>
        );
      }

      // Production: minimal hidden fallback
      return <span style={{ display: "none" }} />;
    }

    return this.props.children;
  }
}
