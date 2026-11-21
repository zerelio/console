import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-8">
            <p className="text-[#ef4444] text-sm font-medium">Something went wrong</p>
            <p className="text-[#8b8b8e] text-xs mt-2">{this.state.error?.message}</p>
            <button onClick={() => this.setState({ hasError: false })} className="mt-4 px-4 py-2 bg-[#6c5ce7] text-white rounded-lg text-xs font-medium">
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
