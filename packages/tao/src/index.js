import AppCtx from './AppCtx';
import Network from './Network';
import Kernel from './Kernel';
export { INTERCEPT, ASYNC, INLINE } from './constants';

const TAO = new Kernel();
export default TAO;
export { AppCtx, Network, Kernel };
