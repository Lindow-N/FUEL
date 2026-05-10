"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <AlertTriangle size={40} className="text-yellow-500 mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">
            Oups, une erreur est survenue
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Recharge la page pour continuer
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-xl transition-colors"
          >
            Recharger
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
