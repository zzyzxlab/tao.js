import Tracer, { TRACE_CHAIN } from './Tracer';
import InMemorySink from './InMemorySink';
import ConsoleSink from './ConsoleSink';
import { TaoLogger } from './TaoLogger';
import {
  newTraceId,
  newSignalId,
  toTraceparent,
  parseTraceparent,
} from './ids';

/** @typedef {import('./Tracer').TraceRecord} TraceRecord */
/** @typedef {import('./InMemorySink').TraceTreeNode} TraceTreeNode */

export default Tracer;
export {
  Tracer,
  InMemorySink,
  ConsoleSink,
  TaoLogger,
  TRACE_CHAIN,
  newTraceId,
  newSignalId,
  toTraceparent,
  parseTraceparent,
};
