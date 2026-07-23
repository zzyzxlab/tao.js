/** @typedef {import('./Tracer').TraceRecord} TraceRecord */

/**
 * A node of the reassembled causal tree returned by
 * {@link InMemorySink#toTree}.
 *
 * @typedef {Object} TraceTreeNode
 * @property {TraceRecord} record
 * @property {TraceTreeNode[]} children
 */

/**
 * Render one record as a tree-node label: the trigram, its producing phase
 * when present, and (optionally) its captured data.
 *
 * @param {TraceRecord} record
 * @param {boolean} showData
 * @returns {string}
 */
function nodeLabel(record, showData) {
  let label = `☯ {${record.t}, ${record.a}, ${record.o}}`;
  if (record.via) {
    label += ` ·${record.via}`;
  }
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
  /**
   * Creates an instance of InMemorySink.
   * @param {Object} [opts]
   * @param {number} [opts.limit=10000] - ring-buffer capacity: at capacity
   *        the oldest record is evicted, and its orphaned children surface
   *        as roots
   * @memberof InMemorySink
   */
  constructor({ limit = 10000 } = {}) {
    this._limit = limit;
    this.clear();
  }

  /**
   * Sink interface: retain one dispatched signal and index it by id and by
   * parent.
   *
   * @param {TraceRecord} record
   * @memberof InMemorySink
   */
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

  /**
   * All retained records in arrival order (a fresh copy).
   *
   * @type {TraceRecord[]}
   * @readonly
   * @memberof InMemorySink
   */
  get records() {
    return [...this._records];
  }

  /**
   * Number of records currently retained.
   *
   * @type {number}
   * @readonly
   * @memberof InMemorySink
   */
  get size() {
    return this._records.length;
  }

  /**
   * Look up a retained record by its signal id.
   *
   * @param {string} signalId
   * @returns {TraceRecord|undefined} undefined when never seen or evicted
   * @memberof InMemorySink
   */
  byId(signalId) {
    return this._byId.get(signalId);
  }

  /**
   * Records chained by the given signal's handlers, in arrival order
   * (a fresh copy).
   *
   * @param {string} signalId
   * @returns {TraceRecord[]}
   * @memberof InMemorySink
   */
  childrenOf(signalId) {
    return [...(this._children.get(signalId) || [])];
  }

  /**
   * Local roots: records with no parent, or whose parent was never seen
   * locally (remote continuation) or has been evicted.
   *
   * @returns {TraceRecord[]}
   * @memberof InMemorySink
   */
  roots() {
    return this._records.filter(
      (record) => !record.parentId || !this._byId.has(record.parentId),
    );
  }

  /**
   * Reassemble the retained records into causal trees, one per local root.
   *
   * @returns {TraceTreeNode[]}
   * @memberof InMemorySink
   */
  toTree() {
    const toNode = (record) => ({
      record,
      children: this.childrenOf(record.signalId).map(toNode),
    });
    return this.roots().map(toNode);
  }

  /**
   * Render the causal trees as an ASCII tree, one line per signal.
   *
   * @param {Object} [opts]
   * @param {boolean} [opts.showData=false] - append each record's captured
   *        data to its label
   * @returns {string}
   * @memberof InMemorySink
   */
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

  /**
   * Drop every retained record and index.
   *
   * @memberof InMemorySink
   */
  clear() {
    this._records = [];
    this._byId = new Map();
    this._children = new Map();
  }

  /**
   * Evict the oldest record (ring-buffer overflow), unindexing it from its
   * parent's children and releasing its own child index.
   */
  _evictOldest() {
    const evicted = this._records.shift();
    this._byId.delete(evicted.signalId);
    if (evicted.parentId && this._children.has(evicted.parentId)) {
      const siblings = this._children
        .get(evicted.parentId)
        .filter((record) => record !== evicted);
      // Stryker disable next-line ConditionalExpression: keeping an empty siblings list is observationally identical to deleting it
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
