export default class Router {
  constructor(TAO, history) {
    this._tao = TAO;
    this._history = history;
    this.setupEvents(TAO, history);
  }

  setupEvents /*= */(TAO, history) /* =>*/ {
    this._unlistenHistory = history.listen(this.historyChange);
  } //;

  historyChange /*= */(location, action) /* =>*/ {} //;
}
