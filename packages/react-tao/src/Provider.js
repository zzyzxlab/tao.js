import React, { createContext } from 'react';
import TAO from '@tao.js/core';

const Context = createContext({ TAO, data: new Map() });

export { Context };

export default function Provider({ TAO, children }) {
  const data = new Map();
  return <Context.Provider value={{ TAO, data }}>{children}</Context.Provider>;
}
