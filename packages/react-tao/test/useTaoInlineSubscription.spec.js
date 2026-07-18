import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { Kernel } from '@tao.js/core';
import Provider from '../src/Provider';
import useTaoInlineSubscription from '../src/useTaoInlineSubscription';

describe('useTaoInlineSubscription', () => {
  let TAO;

  beforeEach(() => {
    TAO = new Kernel();
  });

  afterEach(cleanup);

  it('treats a null/undefined trigram list as empty (no Kernel registration)', () => {
    const addSpy = jest.spyOn(TAO, 'addInlineHandler');

    function Probe({ trigrams }) {
      useTaoInlineSubscription(trigrams, () => {});
      return null;
    }

    const { rerender } = render(
      <Provider TAO={TAO}>
        <Probe trigrams={null} />
      </Provider>,
    );
    expect(addSpy).not.toHaveBeenCalled();

    rerender(
      <Provider TAO={TAO}>
        <Probe trigrams={undefined} />
      </Provider>,
    );
    expect(addSpy).not.toHaveBeenCalled();

    addSpy.mockRestore();
  });
});
