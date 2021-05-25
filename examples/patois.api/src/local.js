import util from 'util';
import TAO, { AppCtx } from '@tao.js/core';

TAO.addInlineHandler(
  { t: 'start' },
  (tao, data) => new AppCtx('some', 'next', tao.o, 'global')
);

const channel1 = TAO.channel();
const clone2 = TAO.clone();

TAO.addInlineHandler(
  { t: 'from' },
  (tao, data) => new AppCtx('end', 'next', tao.o, 'global')
);

channel1.addInlineHandler(
  { t: 'some' },
  (tao, data) => new AppCtx('from', 'next', tao.o, 'channel1')
);
clone2.addInlineHandler(
  { t: 'some' },
  (tao, data) => new AppCtx('from', 'next', tao.o, 'clone2')
);

TAO.addInterceptHandler({}, (tao, data) => {
  console.log('global::handling:', tao, data);
});

console.log('TAO:', util.inspect(TAO, false, 3, true));
console.log('channel1:', util.inspect(channel1, false, 3, true));
console.log('clone2:', util.inspect(clone2, false, 3, true));

TAO.setCtx({ t: 'start', a: 'initial', o: 'cli' });
