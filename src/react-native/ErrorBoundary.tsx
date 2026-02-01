/**
 * ErrorBoundary Component for React Native
 *
 * Catches render errors in segment components and displays a fallback UI.
 * Prevents a single segment error from crashing the entire content area.
 */
import React, { Component, type ReactNode, type ErrorInfo } from "react";
import { View, Text, StyleSheet } from "react-native";

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
 *   fallback={(error, type) => (
 *     <View>
 *       <Text>Failed to render {type}: {error.message}</Text>
 *     </View>
 *   )}
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
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              Error in [{this.props.segmentType}]: {this.state.error.message}
            </Text>
          </View>
        );
      }

      // Production: minimal hidden fallback
      return <View style={styles.hidden} />;
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    padding: 8,
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 4,
  },
  errorText: {
    color: "#991b1b",
    fontSize: 12,
    fontFamily: "monospace",
  },
  hidden: {
    width: 0,
    height: 0,
    overflow: "hidden",
  },
});
