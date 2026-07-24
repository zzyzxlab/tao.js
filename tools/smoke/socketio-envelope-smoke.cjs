/* End-to-end smoke: real socket.io round-trip over the BUILT libs on
 * feat/network-envelope, verifying the behavioral invariants of ENVELOPE-SPEC.md §10:
 *  1. chained AppCons still reach the Source middleware every hop (client->server forwarding)
 *  2. channel-entered cascades keep per-client reply scoping end-to-end
 *  3. no cross-client broadcast of another client's replies
 *  4. descendants of server-received signals are re-emitted (bidirectional reflex)
 *  5. tracer on the server kernel links the whole channel cascade with no instrumentation
 *  6. (0.20) the wire carries envelope.chain: ONE traceId across the whole
 *     client->server->client round trip, with exact cross-process parentage
 *  7. (0.20) chained hops carry hop.via (the producing phase) in trace records
 */
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const req = (p) => require(path.join(ROOT, p));

// resolve core through the socket.io adapter's own resolution so every
// module shares ONE core instance (pnpm's file: protocol stores copies;
// a direct packages/tao/lib require would be a second AppCtx class)
const { createRequire: createReq } = require('module');
const socketRequire = createReq(
  path.join(ROOT, 'packages/tao-socket-io/package.json'),
);
const { Kernel, AppCtx } = socketRequire('@tao.js/core');
const serverWire = req('packages/tao-socket-io/lib').default;
const { Tracer, InMemorySink } = req('packages/tao-telemetry/lib');

// client copy of the adapter: IS_SERVER is computed at import time from
// `typeof window`, so re-require with a window present (same trick the
// package's own tests use)
global.window = {};
for (const key of Object.keys(require.cache)) {
  if (key.includes('tao-socket-io')) delete require.cache[key];
}
const clientWire = req('packages/tao-socket-io/lib').default;
delete global.window;

const { createRequire } = require('module');
const apiRequire = createRequire(path.join(ROOT, 'examples/patois.api/package.json'));
const webRequire = createRequire(path.join(ROOT, 'examples/patois.web/package.json'));
const IO = apiRequire('socket.io');
const fs = require('fs');
function resolveClient() {
  try {
    return webRequire('socket.io-client');
  } catch (resolveErr) {
    const pnpmDir = path.join(ROOT, 'node_modules', '.pnpm');
    const hit = fs
      .readdirSync(pnpmDir)
      .find((dir) => dir.startsWith('socket.io-client@'));
    if (!hit) throw resolveErr;
    return require(path.join(pnpmDir, hit, 'node_modules', 'socket.io-client'));
  }
}
const ioClient = resolveClient();

const http = require('http');
const PORT = 45231;

const results = { pass: [], fail: [] };
const check = (name, cond) =>
  (cond ? results.pass : results.fail).push(name);

async function main() {
  // ---- server ----
  const serverTAO = new Kernel();
  const sink = new InMemorySink();
  new Tracer(serverTAO, { sinks: [sink] });
  const httpServer = http.createServer();
  const io = IO(httpServer);
  serverWire(serverTAO, io);
  // server business logic: Find -> chain List reply
  serverTAO.addInlineHandler(
    { t: 'Space', a: 'Find', o: 'Portal' },
    (tao, data) => new AppCtx('Space', 'List', 'Admin', { Space: [{ id: 1 }] }),
  );
  const trackReceived = [];
  serverTAO.addInlineHandler({ t: 'Space', a: 'Track', o: 'Portal' }, (tao, data) => {
    trackReceived.push(data);
  });
  await new Promise((res) => httpServer.listen(PORT, res));

  // ---- client A ----
  const clientA = new Kernel();
  const clientSinkA = new InMemorySink();
  new Tracer(clientA, { sinks: [clientSinkA] });
  clientWire(clientA, (url, opts) => ioClient(`http://localhost:${PORT}${url}`, opts), { host: '' });
  const aReceived = [];
  clientA.addInlineHandler({ t: 'Space', a: 'List', o: 'Admin' }, (tao, data) => {
    aReceived.push(data);
    // invariant 4: chained descendant of a server-received signal must be re-emitted
    return new AppCtx('Space', 'Track', 'Portal', { Space: { tracked: true } });
  });

  // ---- client B (must not receive A's replies) ----
  const clientB = new Kernel();
  clientWire(clientB, (url, opts) => ioClient(`http://localhost:${PORT}${url}`, opts), { host: '' });
  const bReceived = [];
  clientB.addInlineHandler({ t: 'Space', a: 'List', o: 'Admin' }, (tao, data) => {
    bReceived.push(data);
  });

  await new Promise((res) => setTimeout(res, 600)); // connect both

  // A fires the request
  clientA.setCtx({ t: 'Space', a: 'Find', o: 'Portal' }, { Space: { q: 'all' } });
  await new Promise((res) => setTimeout(res, 900));

  check('client A received the List reply', aReceived.length === 1);
  check('client B did NOT receive A\'s reply (no cross-client leak)', bReceived.length === 0);
  check('server received the chained Track signal back (bidirectional reflex)', trackReceived.length === 1);

  // tracer: the server-side cascade Find -> List should be linked
  const finds = sink.records.filter((r) => r.a === 'Find');
  const lists = sink.records.filter((r) => r.a === 'List');
  check('tracer recorded the Find entry', finds.length === 1);
  check('tracer recorded the List chain', lists.length >= 1);
  check(
    'tracer linked List as child of Find (channel cascade, no instrumentation)',
    lists.length >= 1 && finds.length === 1 && lists[0].parentId === finds[0].signalId,
  );
  check(
    'tracer kept one trace for the cascade',
    lists.length >= 1 && lists[0].traceId === finds[0].traceId,
  );

  // ---- 0.20: cross-process chain transport ----
  const aFinds = clientSinkA.records.filter((r) => r.a === 'Find');
  const aLists = clientSinkA.records.filter((r) => r.a === 'List');
  const aTracks = clientSinkA.records.filter((r) => r.a === 'Track');
  const serverTracks = sink.records.filter((r) => r.a === 'Track');
  const allRecords = [...clientSinkA.records, ...sink.records].filter(
    (r) => r.t === 'Space',
  );
  const traceIds = new Set(allRecords.map((r) => r.traceId));
  check(
    'ONE traceId across the whole client->server->client round trip',
    allRecords.length >= 6 && traceIds.size === 1,
  );
  check(
    "server Find continues the client's entry hop (cross-process parent link)",
    finds.length === 1 &&
      aFinds.length === 1 &&
      finds[0].parentId === aFinds[0].signalId,
  );
  check(
    "client List continues the server's reply hop (cross-process parent link)",
    aLists.length === 1 &&
      lists.length >= 1 &&
      aLists[0].parentId === lists[0].signalId,
  );
  check(
    "server Track continues the client's chained hop (second crossing)",
    serverTracks.length === 1 &&
      aTracks.length === 1 &&
      serverTracks[0].parentId === aTracks[0].signalId,
  );
  check(
    'chained hops carry hop.via in trace records (server List, client Track)',
    lists.length >= 1 &&
      lists[0].via === 'Inline' &&
      aTracks.length === 1 &&
      aTracks[0].via === 'Inline',
  );
  check(
    'transport entries carry no via (the edge is the transport)',
    finds.length === 1 && !('via' in finds[0]) && aFinds.length === 1 && !('via' in aFinds[0]),
  );

  console.log('PASS:', results.pass.length);
  results.pass.forEach((n) => console.log('  ✓', n));
  if (results.fail.length) {
    console.log('FAIL:', results.fail.length);
    results.fail.forEach((n) => console.log('  ✗', n));
  }
  process.exit(results.fail.length ? 1 : 0);
}

main().catch((err) => {
  console.error('SMOKE ERROR:', err);
  process.exit(2);
});
