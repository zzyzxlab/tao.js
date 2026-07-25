import { Component } from 'react';
import * as api from '../src';
import {
  TaoProvider,
  DataHandler,
  RenderHandler,
  SwitchHandler,
  createContextHandler,
  withContext,
  DataLayerContext,
  useDataLayers,
  useTaoContext,
  useTaoData,
  useTaoInlineHandler,
  useTaoAsyncHandler,
  useTaoInterceptHandler,
} from '../src';

describe('@tao.js/react exports convenience tools to use tao.js with React', () => {
  it('should export a TaoProvider Component', () => {
    expect(TaoProvider).toBeDefined();
    expect(TaoProvider).toBeInstanceOf(Function);
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

  it('should export the DataLayerContext and useDataLayers', () => {
    expect(DataLayerContext).toBeDefined();
    expect(useDataLayers).toBeInstanceOf(Function);
  });

  it('should export Current API hooks', () => {
    expect(useTaoContext).toBeInstanceOf(Function);
    expect(useTaoData).toBeInstanceOf(Function);
    expect(useTaoInlineHandler).toBeInstanceOf(Function);
    expect(useTaoAsyncHandler).toBeInstanceOf(Function);
    expect(useTaoInterceptHandler).toBeInstanceOf(Function);
  });

  it('should not export surfaces removed in 0.21', () => {
    expect(api.Provider).toBeUndefined();
    expect(api.DataConsumer).toBeUndefined();
    expect(api.useTaoDataContext).toBeUndefined();
  });
});
