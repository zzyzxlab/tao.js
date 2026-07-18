function nodeLabel(record, showData) {
  let label = `☯ {${record.t}, ${record.a}, ${record.o}}`;
  if (showData && typeof record.data !== 'undefined') {
    try {
      label += ` ${JSON.stringify(record.data)}`;
    } catch {
      label += ' [unserializable data]';
    }
  }
  return label;
}

/**
 * Collects signal records in memory and reassembles them into causal trees.
 * `format()` renders an ASCII tree — a compact, product-language map of what
 * the application actually did, suitable for tests, debugging, and agents.
 *
 * @export
 * @class InMemorySink
 */
export default class InMemorySink {
  constructor({ limit = 10000 } = {}) {
    this._limit = limit;
    this.clear();
  }

  signal(record) {
    if (this._records.length >= this._limit) {
      this._evictOldest();
    }
    this._records.push(record);
    this._byId.set(record.signalId, record);
    if (record.parentId) {
      if (!this._children.has(record.parentId)) {
        this._children.set(record.parentId, []);
      }
      this._children.get(record.parentId).push(record);
    }
  }

  get records() {
    return [...this._records];
  }

  get size() {
    return this._records.length;
  }

  byId(signalId) {
    return this._byId.get(signalId);
  }

  childrenOf(signalId) {
    return [...(this._children.get(signalId) || [])];
  }

  /**
   * Local roots: records with no parent, or whose parent was never seen
   * locally (remote continuation) or has been evicted.
   */
  roots() {
    return this._records.filter(
      (record) => !record.parentId || !this._byId.has(record.parentId),
    );
  }

  toTree() {
    const toNode = (record) => ({
      record,
      children: this.childrenOf(record.signalId).map(toNode),
    });
    return this.roots().map(toNode);
  }

  format({ showData = false } = {}) {
    const lines = [];
    const walk = (node, prefix, childPrefix) => {
      lines.push(prefix + nodeLabel(node.record, showData));
      node.children.forEach((child, i) => {
        const last = i === node.children.length - 1;
        walk(
          child,
          childPrefix + (last ? '└── ' : '├── '),
          childPrefix + (last ? '    ' : '│   '),
        );
      });
    };
    for (const root of this.toTree()) {
      walk(root, '', '');
    }
    return lines.join('\n');
  }

  clear() {
    this._records = [];
    this._byId = new Map();
    this._children = new Map();
  }

  _evictOldest() {
    const evicted = this._records.shift();
    this._byId.delete(evicted.signalId);
    if (evicted.parentId && this._children.has(evicted.parentId)) {
      const siblings = this._children
        .get(evicted.parentId)
        .filter((record) => record !== evicted);
      if (siblings.length) {
        this._children.set(evicted.parentId, siblings);
      } else {
        this._children.delete(evicted.parentId);
      }
    }
    // the evicted signal's children (if any) surface as roots via roots()
    this._children.delete(evicted.signalId);
  }
}
