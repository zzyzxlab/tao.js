import { Kernel } from '@tao.js/core';
import {
  TaoProvider,
  DataHandler,
  RenderHandler,
  SwitchHandler,
  createContextHandler,
  withContext,
  useTaoContext,
  useTaoData,
  useTaoInlineHandler,
  useTaoAsyncHandler,
  useTaoInterceptHandler,
} from '@tao.js/react';
import type { AssertFalse, IsAny } from './helpers';

type _provider = AssertFalse<IsAny<typeof TaoProvider>>;
type _dataHandler = AssertFalse<IsAny<typeof DataHandler>>;
type _renderHandler = AssertFalse<IsAny<typeof RenderHandler>>;
type _switchHandler = AssertFalse<IsAny<typeof SwitchHandler>>;
type _createContextHandler = AssertFalse<IsAny<typeof createContextHandler>>;
type _withContext = AssertFalse<IsAny<typeof withContext>>;
type _useTaoData = AssertFalse<IsAny<typeof useTaoData>>;
type _useTaoAsyncHandler = AssertFalse<IsAny<typeof useTaoAsyncHandler>>;
type _useTaoInterceptHandler = AssertFalse<IsAny<typeof useTaoInterceptHandler>>;

const kernel = new Kernel();

function View() {
  const TAO = useTaoContext();
  type _tao = AssertFalse<IsAny<typeof TAO>>;
  const user = useTaoData('user');
  useTaoInlineHandler({ t: 'User', a: 'View', o: 'Portal' }, (tao, data) => {
    void tao;
    void data;
  });
  return <span>{JSON.stringify(user)}</span>;
}

export const app = (
  <TaoProvider TAO={kernel}>
    <DataHandler name="user" t="User" a="*" o="Portal">
      <SwitchHandler t="User" a={['Find', 'View']} o="Portal">
        <RenderHandler t="User" a="View" o="Portal">
          {(tao, data) => {
            void tao;
            void data;
            return <View />;
          }}
        </RenderHandler>
      </SwitchHandler>
    </DataHandler>
  </TaoProvider>
);
