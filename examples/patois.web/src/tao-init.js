import TAO, { AppCtx } from '@tao.js/core';
import axios from 'axios';
import * as _ from './lib/lodash-slim';

const socket = window.io('http://localhost:8080/tao');

// const socketConnected = new Promise((resolve, reject) => {
//   socket.on('connect', () => {
//     resolve(true);
//   });
//   socket.on('connect_error', () => {

//   })
// })

socket.on('receiveAC', ({ tao, data }) => {
  const datum = _.merge({}, data, {
    [tao.o]: {
      _fromSocket: true
    }
  });
  TAO.setCtx(tao, datum);
});

TAO.addAsyncHandler({}, (tao, data) => {
  if (!data[tao.o] || !data[tao.o]._fromSocket) {
    socket.emit('setAC', { tao, data });
  }
});

const restApi = axios.create({
  baseURL: 'http://localhost:8080/api'
});

const AppTerm = {
  title: 'Patois - words for the way you talk'
};
const SESSION_KEY = 'patois.Session';

const appEnterPortalCtx = new AppCtx('App', 'Enter', 'Portal', [AppTerm]);

const appViewPortalCtx = new AppCtx('App', 'View', 'Portal', [AppTerm]);

const sessionFindCtx = new AppCtx('Session', 'Find', 'Portal');

const sessionCreateCtx = new AppCtx('Session', 'Create', 'Portal');

TAO.addInterceptHandler({}, (tao, data) => {
  console.log('handling tao:', tao, data);
});

TAO.addInlineHandler(appEnterPortalCtx.unwrapCtx(), (tao, { App }) => {
  console.log('received App as:', App);
  return appViewPortalCtx;
});

TAO.addInlineHandler(appViewPortalCtx.unwrapCtx(), ({ o }) => {
  return new AppCtx('Space', 'Find', o);
});

TAO.addInlineHandler(
  { t: 'Space', a: 'Find_rest' },
  async ({ o }, { Find_rest }) => {
    const apiPath =
      _.isEmpty(Find_rest) || !Find_rest._id
        ? '/spaces'
        : `/spaces/${Find_rest._id}`;
    const { data } = await restApi.get(apiPath);

    return new AppCtx('Space', Array.isArray(data) ? 'List' : 'Enter', o, {
      Space: data
    });
  }
);

TAO.addInlineHandler(
  { t: 'Space', a: 'Update_rest' },
  async (tao, { Space }) => {
    try {
      const apiResponse = await restApi.put(`/spaces/${Space._id}`, Space);
      return new AppCtx('Space', 'Enter', 'Portal', {
        Space: apiResponse.data
      });
    } catch (apiErr) {
      const Fail = {
        on: tao.a,
        status: apiErr.response.status,
        message: apiErr.response.statusText
      };
      return new AppCtx('Space', 'Fail', 'Portal', { Space, Fail });
    }
  }
);

TAO.addInlineHandler({ t: 'Space', a: 'Add_rest' }, async (tao, { Space }) => {
  try {
    const { data } = await restApi.post('/spaces', Space);
    return new AppCtx('Space', 'Enter', 'Portal', { Space: data });
  } catch (apiErr) {
    const Fail = {
      on: tao.a,
      status: apiErr.response.status,
      message: apiErr.response.statusText
    };
    return new AppCtx('Space', 'Fail', 'Portal', { Space, Fail });
  }
});

TAO.addAsyncHandler(appEnterPortalCtx.unwrapCtx(), () => {
  return sessionFindCtx;
});

TAO.addInlineHandler(sessionFindCtx.unwrapCtx(), () => {
  const sessionData = localStorage.getItem(SESSION_KEY);
  if (!sessionData) {
    return sessionCreateCtx;
  }
  try {
    const Session = JSON.parse(sessionData);
    return new AppCtx('Session', 'Enter', 'Portal', { Session });
  } catch (sessionErr) {
    console.error('error with session data', sessionErr);
    return sessionCreateCtx;
  }
});

TAO.addInlineHandler(sessionCreateCtx.unwrapCtx(), () => {
  console.log('creating new session');
  const Session = { User: { id: '1234567890', email: 'dude@guy.bro' } };
  localStorage.setItem(SESSION_KEY, JSON.stringify(Session));
  return new AppCtx('Session', 'Enter', 'Portal', { Session });
});

TAO.addInlineHandler({ t: 'Session', a: 'Enter' }, ({ o }, { Session }) => {
  if (!Session.entrances) {
    Session.entrances = [];
  }
  Session.entrances.push(new Date());
  localStorage.setItem(SESSION_KEY, JSON.stringify(Session));
  // return new AppCtx('Session', 'Enter', 'Tracking', [Session, null, o]);
});

// async function getInitialCtx() {

// }

export default appEnterPortalCtx;
