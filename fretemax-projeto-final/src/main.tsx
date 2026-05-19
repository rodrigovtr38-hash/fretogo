import {
  StrictMode,
  Suspense,
} from 'react';

import {
  createRoot,
} from 'react-dom/client';

import App from './App.tsx';

import './index.css';

import {
  AlertTriangle,
  Loader2,
} from 'lucide-react';

import {
  Component,
  type ReactNode,
} from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(
    props: ErrorBoundaryProps,
  ) {
    super(props);

    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch(
    error: Error,
    info: any,
  ) {
    console.error(
      'FRETOGO_RUNTIME_ERROR',
      error,
}
