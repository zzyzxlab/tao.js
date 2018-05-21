import { Component } from 'react';
import { Provider, Reactor } from '../build';

describe('@tao.js/react exports convenience tools to use tao.js with React', () => {
  it('should export a Provider constructor', () => {
    expect(Provider).toBeDefined();
    expect(new Provider()).toBeInstanceOf(Provider);
    expect(new Provider()).not.toBeInstanceOf(Function);
  });

  it('should export a Reactor Component', () => {
    expect(Reactor).toBeDefined();
    expect(new Reactor()).toBeInstanceOf(Reactor);
    expect(new Reactor()).toBeInstanceOf(Component);
    expect(new Reactor()).not.toBeInstanceOf(Function);
  });
});
