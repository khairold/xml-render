/**
 * ErrorBoundary Component for React Native
 *
 * Catches render errors in segment components and displays a fallback UI.
 * Prevents a single segment error from crashing the entire content area.
 */
import React, { type ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ErrorBoundaryBase } from "../shared/ErrorBoundary";

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

function renderDevError(error: Error, segmentType: string): ReactNode {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>
        Error in [{segmentType}]: {error.message}
      </Text>
    </View>
  );
}

function renderProdFallback(): ReactNode {
  return <View style={styles.hidden} />;
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
export function ErrorBoundary({ children, segmentType, fallback }: ErrorBoundaryProps): React.ReactElement {
  return (
    <ErrorBoundaryBase
      segmentType={segmentType}
      fallback={fallback}
      renderDevError={renderDevError}
      renderProdFallback={renderProdFallback}
    >
      {children}
    </ErrorBoundaryBase>
  );
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
