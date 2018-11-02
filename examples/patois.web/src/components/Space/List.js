import React from 'react';
import TAO from '@tao.js/core';
import { withContext } from '@tao.js/react';
// const TAOContext = React.createContext(TAO);

// const Link = props => {
//   const { t, a, o, data } = props;
//   return (
//     <TAOContext.Consumer>
//       {Kernel => }
//     </TAOContext.Consumer>
//   )
// }

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

const SpaceList = ({ data: Space }) => (
  <div>
    <h1>Current list of Spaces</h1>
    <h3>
      <button onClick={e => TAO.setCtx({ t: 'Space', a: 'New', o: 'Portal' })}>
        New
      </button>
    </h3>
    <ul>
      <SpaceItems spaces={Space.list} />
    </ul>
  </div>
);

export default withContext(
  { t: 'Space', a: 'List' },
  (tao, data, set) => ({ list: data.Space }),
  () => ({ list: [] })
)(SpaceList);
