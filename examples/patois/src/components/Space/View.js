import React from 'react';
import TAO from '@tao.js/core';

const SpaceView = ({ Space }) => (
  <div>
    <h1>Space - {Space.name}</h1>
    <button
      name="editSpace"
      key="editSpace"
      onClick={e =>
        TAO.setCtx({ t: 'Space', a: 'Edit', o: 'Portal' }, { Space })
      }
    >
      Edit
    </button>
    <button
      name="listSpaces"
      key="spaceList"
      onClick={e => TAO.setCtx({ t: 'Space', a: 'Find', a: 'Portal' })}
    >
      Back to List
    </button>
    <p>{Space.description}</p>
  </div>
);

export default SpaceView;
