import Kernel from './Kernel';
import AppCtx from './AppCtx';
export { INTERCEPT, ASYNC, INLINE } from './constants';

const TAO = new Kernel();
export default TAO;
export { AppCtx, Kernel };
