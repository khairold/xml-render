/**
 * ErrorBoundary Component for React
 *
 * Catches render errors in segment components and displays a fallback UI.
 * Prevents a single segment error from crashing the entire content area.
 */
import React, { type ReactNode } from "react";
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
      Error in [{segmentType}]: {error.message}
    </span>
  );
}

function renderProdFallback(): ReactNode {
  return <span style={{ display: "none" }} />;
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
