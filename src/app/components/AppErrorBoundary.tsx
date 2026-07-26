import React from 'react';
import { isStaleChunkLoadError, reloadAfterStaleChunk } from '../../lib/chunk-reload';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (isStaleChunkLoadError(error)) {
      reloadAfterStaleChunk();
      return;
    }

    console.error('App render failed:', error, errorInfo);
  }

  private handleReload = () => {
    reloadAfterStaleChunk();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
          <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl flex-col justify-center gap-6 rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-sky-300">
                Runtime Error
              </p>
              <h1 className="text-3xl font-black tracking-tight">
                The app crashed before the screen could render.
              </h1>
              <p className="max-w-2xl text-sm text-slate-300">
                This fallback is here so the project never fails as a blank page again.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-red-400/20 bg-red-500/10 p-5">
              <p className="text-sm font-semibold text-red-100">
                {this.state.error.message || 'Unknown render error'}
              </p>
            </div>

            <button
              type="button"
              onClick={this.handleReload}
              className="w-full rounded-full bg-sky-400 px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-slate-950 transition hover:bg-sky-300 sm:w-fit"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
