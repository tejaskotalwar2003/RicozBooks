'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

const App = dynamic(() => import('../App'), { ssr: false });

export default function AppWrapper() {
  return (
    <ErrorBoundary fallbackTitle="Application Error" fallbackMessage="RicozBooks encountered an unexpected runtime error. Please reload or check your connection.">
      <App />
    </ErrorBoundary>
  );
}
