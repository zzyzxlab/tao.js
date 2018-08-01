import { Component } from 'react';
import { Adapter, Reactor } from '../build';

describe('@tao.js/react exports convenience tools to use tao.js with React', () => {
  it('should export an Adapter constructor', () => {
    expect(Adapter).toBeDefined();
    expect(new Adapter()).toBeInstanceOf(Adapter);
    expect(new Adapter()).not.toBeInstanceOf(Function);
  });

  it('should export a Reactor Component', () => {
    expect(Reactor).toBeDefined();
    expect(new Reactor()).toBeInstanceOf(Reactor);
    expect(new Reactor()).toBeInstanceOf(Component);
    expect(new Reactor()).not.toBeInstanceOf(Function);
  });
});
