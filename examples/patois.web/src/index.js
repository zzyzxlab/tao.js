import TAO, { AppCtx } from '@tao.js/core';
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
import initialAppCtx, { enterAc /*, initialRoute*/ } from './tao-init';
import Router from '@tao.js/router';

Router(TAO, {
  initAc: initialAppCtx,
  incomingAc: enterAc, // initialRoute,
  defaultRoute: '/'
});

TAO.addInlineHandler({ t: 'Router', a: 'Init', o: 'Portal' }, () => {
  return new AppCtx('Routes', 'Configure', 'Portal', {
    Routes: [
      // {
      //   Route: {
      //     path: '/{t}/{term._id}/edit',
      //     lowerCase: true,
      //   },
      //   Add: { action: 'Edit' },
      //   Attach: { action: 'Edit' },
      // },
      {
        Route: '/',
        Add: { term: 'Space', action: 'List' },
        Attach: { term: 'Space', action: 'Find', orient: 'Portal' }
      },
      {
        Route: {
          path: '/{t}/{term._id}',
          lowerCase: true
          // query: {
          //   toQuery: (tao, data) => '',
          //   fromQuery: (tao, data, qs) =>
          // }
        },
        Add: {
          tao: { action: 'View' },
          ignore: { term: 'App' }
        }
      },
      {
        Route: {
          path: '/{t}/{action._id}',
          lowerCase: true
          // query: (tao, data, qs) => {

          // }
        },
        Attach: {
          tao: { action: 'Find', orient: 'Portal' }
        }
      }
    ]
  });
});

TAO.setAppCtx(initialAppCtx);

ReactDOM.render(<App />, document.getElementById('root'));
registerServiceWorker();
