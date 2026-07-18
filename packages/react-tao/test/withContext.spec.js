import React from 'react';
import { render, cleanup, act, waitFor } from '@testing-library/react';
import { AppCtx, Kernel } from '@tao.js/core';
import Provider from '../src/Provider';
import withContext from '../src/withContext';

const TERM = 'User';
const ACTION = 'Enter';
const ORIENT = 'Portal';

describe('withContext', () => {
  let TAO;

  beforeEach(() => {
    TAO = new Kernel();
  });

  afterEach(cleanup);

  it('throws when handler is not a function', () => {
    expect(() => withContext({ t: TERM }, null)).toThrow(
      /handler` must be a function/,
    );
  });

  it('sets a displayName on the wrapped component', () => {
    function Named() {
      return null;
    }
    Named.displayName = 'NamedView';
    const Wrapped = withContext(
      { term: TERM, action: ACTION, orient: ORIENT },
      () => ({}),
      {},
    )(Named);
    expect(Wrapped.displayName).toBe('withContext(NamedView)');
  });

  it('injects data from TAO handlers into the wrapped component', async () => {
    const Wrapped = withContext(
      { term: TERM, action: ACTION, orient: ORIENT },
      (tao, data) => data.User,
      { id: null },
    )(function ShowUser({ data }) {
      return <div data-testid="id">{data && data.id}</div>;
    });

    const { getByTestId } = render(
      <Provider TAO={TAO}>
        <Wrapped />
      </Provider>,
    );

    expect(getByTestId('id').textContent).toBe('');

    act(() => {
      TAO.setAppCtx(new AppCtx(TERM, ACTION, ORIENT, { User: { id: 'wc-1' } }));
    });

    await waitFor(() => {
      expect(getByTestId('id').textContent).toBe('wc-1');
    });
  });
});
