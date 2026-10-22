'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const App = dynamic(() => import('../App'), { ssr: false });

export default function AppWrapper() {
  return <App />;
}
