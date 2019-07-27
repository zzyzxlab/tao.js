import React from 'react';
import TAO from '@tao.js/core';
import { withContext } from '@tao.js/react';

const SpaceItems = ({ spaces }) =>
  spaces.map(s => {
    const Space = s;
    return (
      <li key={s._id}>
        <button
          onClick={e =>
            TAO.setCtx({ t: 'Space', a: 'Find', o: 'Portal' }, { Find: Space })
          }
        >
          {s.name}
        </button>
      </li>
    );
  });

const SpaceList = ({ data }) => (
  <div>
    <h1>Current list of Spaces</h1>
    <h3>
      <button onClick={e => TAO.setCtx({ t: 'Space', a: 'New', o: 'Portal' })}>
        New
      </button>
    </h3>
    <ul>
      <SpaceItems spaces={data.list} />
    </ul>
  </div>
);

export default withContext(
  { t: 'Space', a: 'List' },
  (tao, data, set) => ({ list: data.Space }),
  () => ({ list: [] })
)(SpaceList);
