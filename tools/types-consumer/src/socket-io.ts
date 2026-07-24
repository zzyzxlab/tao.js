import wireTaoJsToSocketIO from '@tao.js/socket.io';
import type {
  SocketLike,
  SocketIoServerLike,
  SocketIoClientFactory,
  WireOptions,
} from '@tao.js/socket.io';
import type { AssertFalse, IsAny } from './helpers';

type _wire = AssertFalse<IsAny<typeof wireTaoJsToSocketIO>>;
type _kernelParam = AssertFalse<IsAny<Parameters<typeof wireTaoJsToSocketIO>[0]>>;
type _ioParam = AssertFalse<IsAny<Parameters<typeof wireTaoJsToSocketIO>[1]>>;
type _socketLike = AssertFalse<IsAny<SocketLike>>;
type _serverLike = AssertFalse<IsAny<SocketIoServerLike>>;
type _clientFactory = AssertFalse<IsAny<SocketIoClientFactory>>;
type _wireOptions = AssertFalse<IsAny<WireOptions>>;
