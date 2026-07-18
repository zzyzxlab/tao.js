import { Component } from 'react';
import {
  Provider,
  DataConsumer,
  DataHandler,
  RenderHandler,
  SwitchHandler,
  createContextHandler,
  withContext,
  useTaoContext,
  useTaoDataContext,
  useTaoInlineHandler,
  useTaoAsyncHandler,
  useTaoInterceptHandler,
} from '../src';

describe('@tao.js/react exports convenience tools to use tao.js with React', () => {
  it('should export a Provider Component', () => {
    expect(Provider).toBeDefined();
    expect(new Provider()).toBeInstanceOf(Provider);
    expect(new Provider()).toBeInstanceOf(Component);
    expect(new Provider()).not.toBeInstanceOf(Function);
  });

  it('should export a DataConsumer Component', () => {
    expect(DataConsumer).toBeDefined();
    expect(new DataConsumer({})).toBeInstanceOf(DataConsumer);
    expect(new DataConsumer({})).toBeInstanceOf(Component);
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

  it('should export createContextHandler', () => {
    expect(createContextHandler).toBeDefined();
    expect(createContextHandler).toBeInstanceOf(Function);
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

  it('should export Current API hooks', () => {
    expect(useTaoContext).toBeInstanceOf(Function);
    expect(useTaoDataContext).toBeInstanceOf(Function);
    expect(useTaoInlineHandler).toBeInstanceOf(Function);
    expect(useTaoAsyncHandler).toBeInstanceOf(Function);
    expect(useTaoInterceptHandler).toBeInstanceOf(Function);
  });
});
