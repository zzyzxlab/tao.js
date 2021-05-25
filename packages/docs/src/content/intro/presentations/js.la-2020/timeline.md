# The Story of tao.js

## Pain

### 4th Normal Form

%2004%

### Metadata Data Model

%2005%

### Real-time Reporting

%2006%…%2007%

### Designing a Portal for Extensibility

%2008%…%2009%

## Dream

### Easily add OLAP

### Easily add Caching

### Easily add Functionality

## Fix

### Use AppCons

3-Dimensional description of an Application Context

```javascript
import { AppCon } from '@tao.js/core';

const ac = new AppCon('app', 'enter', 'anon', data);
```

### Subscribe to Trigrams

Different handlers for different needs

#### Inline Handlers

```javascript
import TAO from '@tao.js/core';

TAO.addInlineHandler({ t: 'app', a: 'enter', o: 'anon' }, (tao, data) => {

});
```

#### Async Handlers

```javascript
import TAO from '@tao.js/core';

TAO.addAsyncHandler({ t: 'app', a: 'enter', o: 'anon' }, (tao, data) => {

});
```

#### Intercept Handlers

```javascript
import TAO from '@tao.js/core';

TAO.addInterceptHandler({ t: 'app', a: 'enter', o: 'anon' }, (tao, data) => {

});
```

### Signal Network

A way to share AppCons across all stacks of your applications

```javascript
import TAO from '@tao.js/core';

TAO.setCtx({ t: 'app', a: 'enter', o: 'anon' }, data);
```

### Sample Application

