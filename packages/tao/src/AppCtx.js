import AppCtxRoot from './AppCtxRoot';

function _cleanDatum(term, action, orient, ...data) {
  const datum = {};
  if (!data.length) {
    return {};
  }
  let checkData = data;
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

export default class AppCtx extends AppCtxRoot {
  constructor(term, action, orient, ...data) {
    super(term, action, orient);
    // TODO: figure out how to deal with associated AppCon data <-- what did I mean by this?
    // this.datum = new Datum(term, action, orient, ...data);
    this.datum = _cleanDatum(term, action, orient, ...data);
  }

  get data() {
    return this.datum;
  }

  unwrapCtx(verbose = false) {
    return !verbose
      ? { t: this.t, a: this.a, o: this.o }
      : { term: this.t, action: this.a, orient: this.o };
  }
}
