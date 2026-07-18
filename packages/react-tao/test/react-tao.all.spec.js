import { Component } from 'react';
import {
  Adapter,
  Reactor,
  Provider,
  DataConsumer,
  RenderHandler,
  SwitchHandler,
  DataHandler,
  createContextHandler,
  withContext,
  useTaoContext,
  useTaoDataContext,
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
    expect(Provider).toBeInstanceOf(Function);
  });

  it('should export a RenderHandler Component', () => {
    expect(RenderHandler).toBeDefined();
    expect(RenderHandler).toBeInstanceOf(Function);
    expect(RenderHandler.isTaoRenderHandler).toBe(true);
  });

  it('should export a SwitchHandler Component', () => {
    expect(SwitchHandler).toBeDefined();
    expect(SwitchHandler).toBeInstanceOf(Function);
  });

  it('should export a DataHandler Component', () => {
    expect(DataHandler).toBeDefined();
    expect(DataHandler).toBeInstanceOf(Function);
  });

  it('should export an withContext HOC', () => {
    expect(withContext).toBeDefined();
    expect(withContext).toBeInstanceOf(Function);
    expect(new withContext({}, () => {})).toBeInstanceOf(Function);
    expect(new withContext({}, () => {})).not.toBeInstanceOf(Component);
    expect(new withContext({}, () => {})(Component)).toBeInstanceOf(Function);
    expect(new withContext({}, () => {})(Component)).not.toBeInstanceOf(
      Component,
    );
  });

  it('should export DataConsumer, createContextHandler, and hooks', () => {
    expect(DataConsumer).toBeDefined();
    expect(createContextHandler).toBeInstanceOf(Function);
    expect(useTaoContext).toBeInstanceOf(Function);
    expect(useTaoDataContext).toBeInstanceOf(Function);
  });
});
