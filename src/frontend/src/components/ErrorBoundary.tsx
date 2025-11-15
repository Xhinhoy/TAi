import React from "react";
import ErrorScreen from "./ErrorScreen";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallbackMessage?: string;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary atrapó un error:", error, errorInfo);
  }

  render() {
    const { children, fallbackMessage } = this.props;
    const { error } = this.state;

    if (error) {
      return <ErrorScreen message={fallbackMessage ?? error.message} />;
    }

    return children;
  }
}

export default ErrorBoundary;
