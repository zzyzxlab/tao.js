import '@babel/polyfill';
import TAO from '@tao.js/core';
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
import initialAppCtx from './tao-init';

TAO.setAppCtx(initialAppCtx);

ReactDOM.render(<App />, document.getElementById('root'));
registerServiceWorker();
