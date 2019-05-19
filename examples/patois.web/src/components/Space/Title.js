import React from 'react';
// import TAO from '@tao.js/core';
import { withContext } from '@tao.js/react';

const SpaceTitle = ({ data }) => <h2>Space{data.isList ? 's' : ''} be here</h2>;

export default withContext(
  { t: 'Space', o: 'Portal' },
  (tao, data, set) => ({ isList: tao.a === 'List' }),
  () => ({ isList: true })
)(SpaceTitle);
