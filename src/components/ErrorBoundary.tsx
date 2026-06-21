import { Component, type ReactNode } from 'react';

interface State {
  message: string | null;
}

// Prevent a render-time exception from blanking the whole screen; show why.
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { message: null };

  static getDerivedStateFromError(error: unknown): State {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  render() {
    if (this.state.message !== null) {
      return (
        <div className="error">
          <p>画面の描画でエラーが起きました: {this.state.message}</p>
          <button onClick={() => this.setState({ message: null })}>
            再試行
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
