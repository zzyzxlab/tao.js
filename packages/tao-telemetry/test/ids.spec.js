import {
  newTraceId,
  newSignalId,
  toTraceparent,
  parseTraceparent,
} from '../src/ids';

describe('ids provides W3C-compatible trace identifiers', () => {
  it('should generate 32 lowercase hex char trace ids', () => {
    // Assemble
    // Act
    const id = newTraceId();
    const other = newTraceId();
    // Assert
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(id).not.toMatch(/^0+$/);
    expect(other).not.toBe(id);
  });

  it('should generate 16 lowercase hex char signal ids', () => {
    // Assemble
    // Act
    const id = newSignalId();
    const other = newSignalId();
    // Assert
    expect(id).toMatch(/^[0-9a-f]{16}$/);
    expect(id).not.toMatch(/^0+$/);
    expect(other).not.toBe(id);
  });
});

describe('traceparent formatting and parsing', () => {
  it('should round-trip a stamp through toTraceparent/parseTraceparent', () => {
    // Assemble
    const stamp = { traceId: newTraceId(), signalId: newSignalId() };
    // Act
    const header = toTraceparent(stamp);
    const parsed = parseTraceparent(header);
    // Assert
    expect(header).toBe(`00-${stamp.traceId}-${stamp.signalId}-01`);
    expect(parsed).toEqual({
      traceId: stamp.traceId,
      parentId: stamp.signalId,
    });
  });

  it('should accept uppercase headers by normalizing to lowercase', () => {
    // Assemble
    const traceId = 'ab'.repeat(16);
    const parentId = 'cd'.repeat(8);
    // Act
    const parsed = parseTraceparent(
      `00-${traceId.toUpperCase()}-${parentId.toUpperCase()}-01`,
    );
    // Assert
    expect(parsed).toEqual({ traceId, parentId });
  });

  it.each([
    ['not a string', 42],
    ['garbage', 'garbage'],
    ['too few segments', '00-abc'],
    ['bad version', 'zz-' + 'ab'.repeat(16) + '-' + 'cd'.repeat(8) + '-01'],
    ['version ff', 'ff-' + 'ab'.repeat(16) + '-' + 'cd'.repeat(8) + '-01'],
    ['short trace id', '00-abcd-' + 'cd'.repeat(8) + '-01'],
    [
      'all-zero trace id',
      '00-' + '0'.repeat(32) + '-' + 'cd'.repeat(8) + '-01',
    ],
    ['short parent id', '00-' + 'ab'.repeat(16) + '-cdcd-01'],
    [
      'all-zero parent id',
      '00-' + 'ab'.repeat(16) + '-' + '0'.repeat(16) + '-01',
    ],
  ])('should return null for malformed header: %s', (label, header) => {
    // Assemble
    // Act
    // Assert
    expect(parseTraceparent(header)).toBeNull();
  });
});

describe('id generation without WebCrypto', () => {
  it('should fall back to Math.random-based hex when crypto is unavailable', () => {
    // Assemble — jsdom exposes crypto as an accessor, so shadow it with an
    // own configurable property instead of jest.replaceProperty
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    try {
      // Act
      const traceId = newTraceId();
      const signalId = newSignalId();
      // Assert
      expect(traceId).toMatch(/^[0-9a-f]{32}$/);
      expect(signalId).toMatch(/^[0-9a-f]{16}$/);
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, 'crypto', descriptor);
      } else {
        delete globalThis.crypto;
      }
    }
  });
});

describe('id generation entropy sources (mutation)', () => {
  it('should use WebCrypto when available', () => {
    const getRandomValues = jest.spyOn(globalThis.crypto, 'getRandomValues');
    const random = jest.spyOn(Math, 'random');
    newTraceId();
    expect(getRandomValues).toHaveBeenCalledTimes(1);
    expect(random).not.toHaveBeenCalled();
    getRandomValues.mockRestore();
    random.mockRestore();
  });

  it('should regenerate when the RNG yields an all-zero id', () => {
    const getRandomValues = jest
      .spyOn(globalThis.crypto, 'getRandomValues')
      .mockImplementationOnce((bytes) => {
        bytes.fill(0);
        return bytes;
      });
    const id = newSignalId();
    expect(id).toMatch(/^[0-9a-f]{16}$/);
    expect(id).not.toMatch(/^0+$/);
    expect(getRandomValues.mock.calls.length).toBeGreaterThanOrEqual(2);
    getRandomValues.mockRestore();
  });

  it('should use Math.random in the fallback path', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const random = jest.spyOn(Math, 'random');
    try {
      newSignalId();
      expect(random).toHaveBeenCalled();
    } finally {
      random.mockRestore();
      if (descriptor) {
        Object.defineProperty(globalThis, 'crypto', descriptor);
      } else {
        delete globalThis.crypto;
      }
    }
  });
});

describe('traceparent parsing details (mutation)', () => {
  it('should trim surrounding whitespace', () => {
    const traceId = 'ab'.repeat(16);
    const parentId = 'cd'.repeat(8);
    expect(parseTraceparent(`  00-${traceId}-${parentId}-01\n`)).toEqual({
      traceId,
      parentId,
    });
  });

  it('should reject a three-segment header even with valid ids', () => {
    const traceId = 'ab'.repeat(16);
    const parentId = 'cd'.repeat(8);
    expect(parseTraceparent(`00-${traceId}-${parentId}`)).toBeNull();
  });
});

describe('entropy edge cases (mutation)', () => {
  it('should fall back to Math.random when crypto lacks getRandomValues', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', {
      value: {},
      configurable: true,
      writable: true,
    });
    const random = jest.spyOn(Math, 'random');
    try {
      const id = newSignalId();
      expect(id).toMatch(/^[0-9a-f]{16}$/);
      expect(random).toHaveBeenCalled();
    } finally {
      random.mockRestore();
      if (descriptor) {
        Object.defineProperty(globalThis, 'crypto', descriptor);
      } else {
        delete globalThis.crypto;
      }
    }
  });

  it('should regenerate all-zero trace ids too', () => {
    const getRandomValues = jest
      .spyOn(globalThis.crypto, 'getRandomValues')
      .mockImplementationOnce((bytes) => {
        bytes.fill(0);
        return bytes;
      });
    const id = newTraceId();
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(id).not.toMatch(/^0+$/);
    expect(getRandomValues.mock.calls.length).toBeGreaterThanOrEqual(2);
    getRandomValues.mockRestore();
  });
});
