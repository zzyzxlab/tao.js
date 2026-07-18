import AppCtx from './AppCtx';
import Network from './Network';
import Kernel from './Kernel';
export { INTERCEPT, ASYNC, INLINE, ERROR } from './constants';

const TAO = new Kernel();
export default TAO;
export { AppCtx, Network, Kernel };
