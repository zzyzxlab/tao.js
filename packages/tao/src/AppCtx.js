import AppCtxRoot from './AppCtxRoot';

function _cleanDatum(term, action, orient, ...data) {
  if (data.length) {
    if (data.length === 1) {
      // attempt to infer object
      let datum = {};
      const obj = data[0];
      let assigned = false;
      if (obj.term || obj.t) {
        datum[term] = obj.term || obj.t;
        assigned = true;
      } else if (obj[term]) {
        datum[term] = obj[term];
        assigned = true;
      }
      if (obj.action || obj.a) {
        datum[action] = obj.action || obj.a;
        assigned = true;
      } else if (obj[action]) {
        datum[action] = obj[action];
        assigned = true;
      }
      if (obj.orient || obj.o) {
        datum[orient] = obj.orient || obj.o;
        assigned = true;
      } else if (obj[orient]) {
        datum[orient] = obj[orient];
        assigned = true;
      }
      if (assigned) {
        return datum;
      }
    }
    // assume tuple
    return {
      [term]: data[0],
      [action]: data[1],
      [orient]: data[2]
    };
  }
  return {};
}

class Datum {
  constructor(term, action, orient, ...data) {
    Object.assign(this, _cleanDatum(term, action, orient, ...data));
    this._term = term;
    this._action = action;
    this._orient = orient;
  }

  get(key) {
    return this[key];
  }

  get t() {
    return this.get(this._term);
  }

  get a() {
    return this.get(this._action);
  }

  get o() {
    return this.get(this._orient);
  }

  get unwrap() {
    return {
      [this._term]: this.t,
      t: this.t,
      [this._action]: this.a,
      a: this.a,
      [this._orient]: this.o,
      o: this.o
    };
  }
}

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
}
