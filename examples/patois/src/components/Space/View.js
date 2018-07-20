import React from 'react';
import TAO from '@tao.js/core';

const SpaceView = ({ Space }) => (
  <div>
    <h1>Space - {Space.name}</h1>
    <button
      onClick={e =>
        TAO.setCtx({ t: 'Space', a: 'Edit', o: 'Portal' }, { Space })
      }
    >
      Edit
    </button>
    <button onClick={e => TAO.setCtx({ t: 'Space', a: 'Find', o: 'Portal' })}>
      Back to List
    </button>
    <p>{Space.description}</p>
  </div>
);

export default SpaceView;
