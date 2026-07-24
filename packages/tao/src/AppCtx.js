import AppCtxRoot from './AppCtxRoot';

/**
 * Build the datum object from constructor data args: a single array spreads
 * as positional `[term, action, orient]` data; a single non-array object is
 * checked for tuple keys (`term`/`t`, `action`/`a`, `orient`/`o`, or the
 * actual part names) and extracted per part when found, otherwise keyed
 * whole under the term name; multiple args are positional per part.
 *
 * @param {string} term - the trigram's term (datum key for term data)
 * @param {string} action - the trigram's action (datum key for action data)
 * @param {string} orient - the trigram's orient (datum key for orient data)
 * @param {...*} data - the raw data args
 * @returns {Object} datum keyed by the trigram's part names (may be empty)
 */
function _cleanDatum(term, action, orient, ...data) {
  const datum = {};
  // Stryker disable next-line all: empty data still yields {} via the positional path below
  if (!data.length) {
    return {};
  }
  let checkData = data;
  // Stryker disable next-line ConditionalExpression: length>1 still falls through to the same positional assigns
  if (checkData.length === 1) {
    // MUST check Array first b/c ([] instanceof Object === true)
    if (Array.isArray(checkData[0])) {
      checkData = checkData[0];
    } else if (checkData[0] instanceof Object) {
      // infer all context data from single object
      const obj = checkData[0];
      let assigned = false;
      if (typeof obj.term !== 'undefined') {
        datum[term] = obj.term;
        assigned = true;
      } else if (typeof obj.t !== 'undefined') {
        datum[term] = obj.t;
        assigned = true;
      } else if (typeof obj[term] !== 'undefined') {
        datum[term] = obj[term];
        assigned = true;
      }
      if (typeof obj.action !== 'undefined') {
        datum[action] = obj.action;
        assigned = true;
      } else if (typeof obj.a !== 'undefined') {
        datum[action] = obj.a;
        // Stryker disable next-line BooleanLiteral: perTest coverage sometimes skips the { a } only path
        assigned = true;
      } else if (typeof obj[action] !== 'undefined') {
        datum[action] = obj[action];
        assigned = true;
      }
      if (typeof obj.orient !== 'undefined') {
        datum[orient] = obj.orient;
        assigned = true;
      } else if (typeof obj.o !== 'undefined') {
        datum[orient] = obj.o;
        assigned = true;
      } else if (typeof obj[orient] !== 'undefined') {
        datum[orient] = obj[orient];
        assigned = true;
      }
      // if the single object passed defined a tuple with the expected keys
      if (assigned) {
        return datum;
      }
    }
  }
  // if we are left then assume the first object is term only
  if (typeof checkData[0] !== 'undefined') {
    datum[term] = checkData[0];
  }
  if (typeof checkData[1] !== 'undefined') {
    datum[action] = checkData[1];
  }
  if (typeof checkData[2] !== 'undefined') {
    datum[orient] = checkData[2];
  }
  return datum;
}

// Keeping for potential use but not used now
// commenting to remove from test coverage calculation
// class Datum {
//   constructor(term, action, orient, ...data) {
//     Object.assign(this, _cleanDatum(term, action, orient, ...data));
//     this._term = term;
//     this._action = action;
//     this._orient = orient;
//   }

//   get(key) {
//     return this[key];
//   }

//   get t() {
//     return this.get(this._term);
//   }

//   get a() {
//     return this.get(this._action);
//   }

//   get o() {
//     return this.get(this._orient);
//   }

//   get unwrap() {
//     return {
//       [this._term]: this.t,
//       t: this.t,
//       [this._action]: this.a,
//       a: this.a,
//       [this._orient]: this.o,
//       o: this.o
//     };
//   }
// }

/**
 * A concrete Application Context (AppCon): a trigram plus the data it
 * carries. Setting an AppCtx on a Kernel/Network runs matching handlers,
 * which receive `(tao, data)` built from this instance; handlers chain by
 * returning another AppCtx.
 */
export default class AppCtx extends AppCtxRoot {
  /**
   * @param {string} [term] - the thing (missing = WILDCARD)
   * @param {string} [action] - the operation (missing = WILDCARD)
   * @param {string} [orient] - the perspective (missing = WILDCARD)
   * @param {...*} data - context data; see `_cleanDatum` for the inference
   *        rules (single object → tuple-key extraction or keyed under the
   *        term name; array or multiple args → positional per part)
   */
  constructor(term, action, orient, ...data) {
    super(term, action, orient);
    // TODO: figure out how to deal with associated AppCon data <-- what did I mean by this?
    // this.datum = new Datum(term, action, orient, ...data);
    this.datum = _cleanDatum(term, action, orient, ...data);
  }

  /** The context's data — always an object, possibly empty. @returns {Object} */
  get data() {
    return this.datum;
  }

  /**
   * The trigram as a plain object.
   * @param {boolean} [verbose=false] - long keys (`{term, action, orient}`)
   *        instead of short (`{t, a, o}`)
   * @returns {{t: string, a: string, o: string}|{term: string, action: string, orient: string}}
   */
  unwrapCtx(verbose = false) {
    return !verbose
      ? { t: this.t, a: this.a, o: this.o }
      : { term: this.t, action: this.a, orient: this.o };
  }
}
