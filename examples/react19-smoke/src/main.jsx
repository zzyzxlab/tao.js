import React from 'react';
import { createRoot } from 'react-dom/client';
import { Kernel } from '@tao.js/core';
import { TaoProvider } from '@tao.js/react';
import App from './App.jsx';

const TAO = new Kernel();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TaoProvider TAO={TAO}>
      <App />
    </TaoProvider>
  </React.StrictMode>,
);
