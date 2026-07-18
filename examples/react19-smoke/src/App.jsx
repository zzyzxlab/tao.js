import React from 'react';
import { AppCtx } from '@tao.js/core';
import {
  DataHandler,
  RenderHandler,
  SwitchHandler,
  useTaoContext,
  useTaoDataContext,
} from '@tao.js/react';

const ORIENT = 'Portal';

function SessionBadge() {
  const session = useTaoDataContext('session');
  return (
    <p data-testid="session">
      session: {session ? session.token : '(none)'}
    </p>
  );
}

function Controls() {
  const TAO = useTaoContext();
  return (
    <div>
      <button
        type="button"
        data-testid="view"
        onClick={() =>
          TAO.setAppCtx(
            new AppCtx('User', 'View', ORIENT, { User: { id: 'u-1' } }),
          )
        }
      >
        View user
      </button>
      <button
        type="button"
        data-testid="edit"
        onClick={() =>
          TAO.setAppCtx(
            new AppCtx('User', 'Edit', ORIENT, { User: { id: 'u-1' } }),
          )
        }
      >
        Edit user
      </button>
    </div>
  );
}

export default function App() {
  return (
    <DataHandler
      name="session"
      term="Session"
      action="Enter"
      orient={ORIENT}
      default={{ token: 'smoke-ok' }}
    >
      <h1>@tao.js/react · React 19 smoke</h1>
      <SessionBadge />
      <Controls />
      <SwitchHandler orient={ORIENT}>
        <RenderHandler term="User" action="View">
          {(tao, data) => (
            <p data-testid="panel">
              viewing {data.User && data.User.id} ({tao.a})
            </p>
          )}
        </RenderHandler>
        <RenderHandler term="User" action="Edit">
          {(tao, data) => (
            <p data-testid="panel">
              editing {data.User && data.User.id} ({tao.a})
            </p>
          )}
        </RenderHandler>
      </SwitchHandler>
    </DataHandler>
  );
}
