import React from 'react';
import TAO from '@tao.js/core';

const SpaceItems = ({ spaces }) =>
  spaces.map(s => {
    const Space = s;
    return (
      <li key={s.id}>
        <button
          onClick={e =>
            TAO.setCtx({ t: 'Space', a: 'Enter', o: 'Portal' }, { Space })
          }
        >
          {s.name}
        </button>
      </li>
    );
  });

const SpaceList = ({ Space }) => (
  <div>
    <h1>Current list of Spaces</h1>
    <h3>
      <button>New</button>
    </h3>
    <ul>
      <SpaceItems spaces={Space} />
    </ul>
  </div>
);

export default SpaceList;
