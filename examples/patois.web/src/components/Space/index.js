import React from 'react';
import TAO, { AppCtx } from '@tao.js/core';
import { Adapter, Reactor } from '@tao.js/react';
import List from './List';
import View from './View';
import Form from './Form';
import ErrorMessage from './ErrorMessage';

TAO.addInlineHandler(
  { t: 'Space', a: 'Enter', o: 'Portal' },
  (tao, { Space }) => {
    return new AppCtx('Space', 'View', 'Portal', { Space });
  }
);

const spaceAdapter = new Adapter(TAO);
spaceAdapter
  .setDefaultCtx({ term: 'Space', orient: 'Portal' })
  .addComponentHandler({ action: 'List' }, List)
  .addComponentHandler({ action: 'View' }, View)
  .addComponentHandler({ action: ['New', 'Edit'] }, Form);

const messageAdapter = new Adapter(TAO);
messageAdapter.addComponentHandler({ action: 'Fail' }, ErrorMessage);

const SpaceContainer = () => (
  <div>
    <Reactor key="spaceMessages" adapter={messageAdapter} />
    <Reactor key="spaceComponents" adapter={spaceAdapter} />
  </div>
);

export default SpaceContainer;
