import { Component } from 'react';
import {
  Adapter,
  Reactor,
  Provider,
  RenderHandler,
  SwitchHandler,
  DataHandler,
  withContext
} from '../src/all';

describe('@tao.js/react all.js exports both the current and original APIs to use tao.js with React', () => {
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

  it('should export a Provider Component', () => {
    expect(Provider).toBeDefined();
    expect(new Provider()).toBeInstanceOf(Provider);
    expect(new Provider()).toBeInstanceOf(Component);
    expect(new Provider()).not.toBeInstanceOf(Function);
  });

  it('should export a RenderHandler Component', () => {
    expect(RenderHandler).toBeDefined();
    expect(new RenderHandler({})).toBeInstanceOf(RenderHandler);
    expect(new RenderHandler({})).toBeInstanceOf(Component);
    expect(new RenderHandler({})).not.toBeInstanceOf(Function);
  });

  it('should export a SwitchHandler Component', () => {
    expect(SwitchHandler).toBeDefined();
    expect(new SwitchHandler()).toBeInstanceOf(SwitchHandler);
    expect(new SwitchHandler()).toBeInstanceOf(Component);
    expect(new SwitchHandler()).not.toBeInstanceOf(Function);
  });

  it('should export a DataHandler Component', () => {
    expect(DataHandler).toBeDefined();
    expect(new DataHandler({})).toBeInstanceOf(DataHandler);
    expect(new DataHandler({})).toBeInstanceOf(Component);
    expect(new DataHandler({})).not.toBeInstanceOf(Function);
  });

  it('should export an withContext HOC', () => {
    expect(withContext).toBeDefined();
    expect(withContext).toBeInstanceOf(Function);
    expect(new withContext({}, () => {})).toBeInstanceOf(Function);
    expect(new withContext({}, () => {})).not.toBeInstanceOf(Component);
    expect(new withContext({}, () => {})(Component)).toBeInstanceOf(Function);
    expect(new withContext({}, () => {})(Component)).not.toBeInstanceOf(
      Component
    );
    // expect(new withContext({}, () => {})(Component)()).toBeInstanceOf(Component);
    // expect(new withContext({}, () => {})(Component)()).not.toBeInstanceOf(Function);
  });
});
