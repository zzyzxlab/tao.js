import { TAO } from './index';
import AppCtx from './AppCtx';

// const tao = new TAO();
// console.log('created TAO as:\n', tao);

const logger = (tao, data) => {
  console.log('-------logger got:', { tao, data });
};

const interrupter = (tao, data) => {
  console.log(`-->| INTERRUPTING COW |<---\n`, { tao, data });
  return true;
};

TAO.addInterceptHandler({}, logger);

// TAO.addInterceptHandler({ action: 'Find' }, interrupter);

TAO.addAsyncHandler(
  {
    // Context
    t: 'App',
    a: 'Init',
    o: 'Portal'
  }, // Handler
  (tao, data) => {
    console.log(`=>| AppCtx from async: ['${tao.t}', '${tao.a}', '${tao.o}']`);
    console.log(`  - data from async:\n`, data);
    console.log(
      `returning 'App' 'Enter' 'Portal' from Async Handler for 'App' 'Init' 'Portal'`
    );
    return new AppCtx('App', 'Enter', 'Portal', {
      Enter: 'Hello, World!'
    });
  }
);
console.log(`added Async handler for 'App' 'Init' 'Portal'`);

function inlineHandler(tao, data) {
  console.log(`=> AppCtx from inline: ['${tao.t}', '${tao.a}', '${tao.o}']`);
  console.log(` - data from inline:\n`, data);
}

TAO.addInlineHandler(
  {
    t: 'App',
    a: 'Init',
    o: 'Portal'
  },
  (tao, data) => {
    inlineHandler(tao, data);
    console.log(
      `returning 'User' 'Find' 'Portal' from Inline Handler for 'App' 'Init' 'Portal'`
    );
    return new AppCtx('User', 'Find', 'Portal', {
      User: { token: 'asf;lkj6789' }
    });
  }
);
console.log(`added Inline handler for 'App' 'Init' 'Portal'`);

TAO.addAsyncHandler(
  {
    o: 'Portal'
  },
  (tao, data) => {
    console.log(
      `=>|* AppCtx from async WILDCARD: ['${tao.t}', '${tao.a}', '${tao.o}']`
    );
    console.log(`   - data from async WILDCARD:\n`, data);
  }
);
console.log(`added Async handler for '*' '*' 'Portal'`);

TAO.addInlineHandler(
  {
    t: 'App',
    a: 'Enter',
    o: 'Portal'
  },
  inlineHandler
);
console.log(`added Inline handler for 'App' 'Enter' 'Portal'`);

TAO.addInlineHandler(
  {
    o: 'Portal'
  },
  (tao, data) => {
    console.log(
      `=>* AppCtx from inline WILDCARD: ['${tao.t}', '${tao.a}', '${tao.o}']`
    );
    console.log(`   - data from inline WILDCARD:\n`, data);
  }
);
console.log(`added Inline handler for '*' '*' 'Portal'`);

console.log(
  `=====><===== About to set context to 'App' 'Init' 'Portal' - let's see what happens =====><=====\n`
);
TAO.setCtx(
  { t: 'App', a: 'Init', o: 'Portal' },
  {
    App: {
      options: 'too many for ju'
    }
  }
);
console.log(
  `=====><===== done setting context to 'App' 'Init' 'Portal' =====><=====`
);
