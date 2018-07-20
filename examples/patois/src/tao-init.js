import TAO, { AppCtx } from '@tao.js/core';

const SpacesList = {
  '1': {
    id: '1',
    name: 'Goon Squad',
    description: 'The goons who inspired this site'
  },
  '2': {
    id: '2',
    name: 'My Patoice',
    description: 'Another inspiration for this place'
  }
};
let lastSpaceId = 2;

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

TAO.addInlineHandler({ t: 'Space', a: 'Find' }, ({ o }) => {
  // TODO: fetch from an API
  return new AppCtx('Space', 'List', o, { Space: Object.values(SpacesList) });
});

TAO.addInlineHandler({ t: 'Space', a: 'Update' }, (tao, { Space }) => {
  SpacesList[Space.id] = Space;
});

TAO.addInlineHandler({ t: 'Space', a: 'Add' }, (tao, { Space }) => {
  Space.id = ++lastSpaceId;
  SpacesList[Space.id] = Space;
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
