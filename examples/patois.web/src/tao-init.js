import TAO, { AppCtx } from '@tao.js/core';
import axios from 'axios';
import * as _ from './lib/lodash-slim';

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

TAO.addInlineHandler({ t: 'Space', a: 'Find' }, async ({ o }, { Find }) => {
  const apiPath =
    _.isEmpty(Find) || !Find._id ? '/spaces' : `/spaces/${Find._id}`;
  const { data } = await restApi.get(apiPath);

  return new AppCtx('Space', Array.isArray(data) ? 'List' : 'Enter', o, {
    Space: data
  });
});

TAO.addInlineHandler({ t: 'Space', a: 'Update' }, async (tao, { Space }) => {
  try {
    const apiResponse = await restApi.put(`/spaces/${Space._id}`, Space);
    return new AppCtx('Space', 'Enter', 'Portal', { Space: apiResponse.data });
  } catch (apiErr) {
    const Fail = {
      on: 'Update',
      status: apiErr.response.status,
      message: apiErr.response.statusText
    };
    return new AppCtx('Space', 'Fail', 'Portal', { Space, Fail });
  }
});

TAO.addInlineHandler({ t: 'Space', a: 'Add' }, async (tao, { Space }) => {
  try {
    const { data } = await restApi.post('/spaces', Space);
    return new AppCtx('Space', 'Enter', 'Portal', { Space: data });
  } catch (apiErr) {
    const Fail = {
      on: 'Add',
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

export default appEnterPortalCtx;
