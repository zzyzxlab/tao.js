import TAO, { AppCtx } from '@tao.js/core';
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
import initialAppCtx, { enterAc, initialRoute } from './tao-init';
import Router from '@tao.js/router';

Router(TAO, {
  initAc: initialAppCtx,
  incomingAc: enterAc, // initialRoute,
  defaultRoute: '/'
});

TAO.addInlineHandler({ t: 'Router', a: 'Init', o: 'Portal' }, () => {
  return new AppCtx('Routes', 'Configure', 'Portal', {
    Routes: [
      {
        Route: '/',
        Add: { term: 'Space', action: 'List' },
        Attach: { term: 'Space', action: 'Find' }
      },
      {
        Route: {
          path: '/{t}/{term._id}',
          lowerCase: true
        },
        Add: { action: 'View' }
      },
      {
        Route: {
          path: '/{t}/{action._id}',
          lowerCase: true
        },
        Attach: { action: 'Find' }
      }
    ]
  });
});

TAO.setAppCtx(initialAppCtx);

ReactDOM.render(<App />, document.getElementById('root'));
registerServiceWorker();
