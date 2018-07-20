import React from 'react';
import TAO, { AppCtx } from '@tao.js/core';
import { Provider, Reactor } from '@tao.js/react';
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

// TAO.addInlineHandler(
//   { t: 'Space', a: 'Update', o: 'Portal' },
//   (tao, { Space }) => {
//     return new AppCtx('Space', 'Enter', 'Portal', { Space });
//   }
// );

// TAO.addInlineHandler(
//   { t: 'Space', a: 'Add', o: 'Portal' },
//   (tao, { Space }) => {
//     return new AppCtx('Space', 'Enter', 'Portal', { Space });
//   }
// );

const spaceProvider = new Provider(TAO);
spaceProvider
  .setDefaultCtx({ term: 'Space', orient: 'Portal' })
  .addComponentHandler({ action: 'List' }, List)
  .addComponentHandler({ action: 'View' }, View)
  .addComponentHandler({ action: ['New', 'Edit'] }, Form);

const messageProvider = new Provider(TAO);
messageProvider.addComponentHandler({ action: 'Fail' }, ErrorMessage);

const SpaceRender = () => (
  <div>
    <Reactor key="spaceMessages" provider={messageProvider} />
    <Reactor key="spaceComponents" provider={spaceProvider} />
  </div>
);

export default SpaceRender;
