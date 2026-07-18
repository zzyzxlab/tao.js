import React from 'react';
import { createRoot } from 'react-dom/client';
import { Kernel } from '@tao.js/core';
import { Provider } from '@tao.js/react';
import App from './App.jsx';

const TAO = new Kernel();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider TAO={TAO}>
      <App />
    </Provider>
  </React.StrictMode>,
);
