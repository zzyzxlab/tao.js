import { WILDCARD } from './constants';
import AppCtx from './AppCtx';
import Kernel from './Kernel';

xdescribe('AppCtxHandlers is used to attach handlers for Application Contexts', () => {
  it('should create an empty set of Handlers for AppCtx', () => {
    // Assemble
    const expected = {};
    // Act
    const actual = new AppCtxHandlers();
    // Assert
    expect(actual).toEqual(expect.anything());
  });

  describe('as inline handlers', () => {
    describe('for Concrete Application Contexts', () => {
      it('should attach an inline handler', () => {
        // Assemble
        const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
        const handler = jest.fn();
        // Act
        uut.addInlineHandler(handler);
        // Assert
        expect(uut.inlineHandlers).toContain(handler);
      });

      it('should be able to remove an inline handler', () => {
        // Assemble
        const uut = new AppCtxHandlers(TERM, ACTION, ORIENT);
        const handler = jest.fn();
        // Act
        uut.addInlineHandler(handler);
        uut.removeInlineHandler(handler);
        // Assert
        expect(uut.inlineHandlers).not.toContain(handler);
      });

      it('should call the inline handler when asked to handle App Con', () => {
        // Assemble
        const ach = new AppCtxHandlers(TERM, ACTION, ORIENT);
        const handler = jest.fn();
        ach.addInlineHandler(handler);
        const matchAc = new AppCtx(TERM, ACTION, ORIENT);
        // Act
        ach.handleAppCon(matchAc);
        // Assert
        expect(handler).toBeCalledWith(
          expect.objectContaining({
            t: TERM,
            a: ACTION,
            o: ORIENT
          }),
          {}
        );
      });

      it("should not call the handler when an Application Context that doesn't match is set", () => {
        // Assemble
        const ach = new AppCtxHandlers(TERM, ACTION, ORIENT);
        const handler = jest.fn();
        ach.addInlineHandler(handler);
        const missOnTerm = new AppCtx(ALT_TERM, ACTION, ORIENT);
        const missOnAction = new AppCtx(TERM, ALT_ACTION, ORIENT);
        const missOnOrient = new AppCtx(TERM, ACTION, ALT_ORIENT);
        // Act
        ach.handleAppCon(missOnTerm);
        ach.handleAppCon(missOnAction);
        ach.handleAppCon(missOnOrient);
        // Assert
        expect(handler).not.toBeCalled();
      });

      it('should not call a removed handler when a matching Application Context is set', () => {});
    });

    describe('for Wildcard Application Contexts', () => {
      describe('using Term Wildcard', () => {
        it('should attach an inline handler', () => {});

        it('should be able to remove an inline handler', () => {});

        it('should call the inline handler when a matching Application Context is set', () => {});

        it("should not call the handler when an Application Context that doesn't match is set", () => {});

        it('should not call a removed handler when a matching Application Context is set', () => {});
      });

      describe('using Action Wildcard', () => {
        it('should attach an inline handler', () => {});

        it('should be able to remove an inline handler', () => {});

        it('should call the inline handler when a matching Application Context is set', () => {});

        it("should not call the handler when an Application Context that doesn't match is set", () => {});

        it('should not call a removed handler when a matching Application Context is set', () => {});
      });

      describe('using Orient Wildcard', () => {
        it('should attach an inline handler', () => {});

        it('should be able to remove an inline handler', () => {});

        it('should call the inline handler when a matching Application Context is set', () => {});

        it("should not call the handler when an Application Context that doesn't match is set", () => {});

        it('should not call a removed handler when a matching Application Context is set', () => {});
      });

      describe('using All Wildcard', () => {
        it('should attach an inline handler', () => {});

        it('should be able to remove an inline handler', () => {});

        it('should call the inline handler when a matching Application Context is set', () => {});

        it("should not call the handler when an Application Context that doesn't match is set", () => {});

        it('should not call a removed handler when a matching Application Context is set', () => {});
      });
    });
  });

  describe('as async handlers', () => {
    describe('for Concrete Application Contexts', () => {
      it('should attach an inline handler', () => {});

      it('should be able to remove an inline handler', () => {});

      it('should call the inline handler when a matching Application Context is set', () => {});

      it("should not call the handler when an Application Context that doesn't match is set", () => {});

      it('should not call a removed handler when a matching Application Context is set', () => {});
    });

    describe('for Wildcard Application Contexts', () => {
      describe('using Term Wildcard', () => {
        it('should attach an inline handler', () => {});

        it('should be able to remove an inline handler', () => {});

        it('should call the inline handler when a matching Application Context is set', () => {});

        it("should not call the handler when an Application Context that doesn't match is set", () => {});

        it('should not call a removed handler when a matching Application Context is set', () => {});
      });

      describe('using Action Wildcard', () => {
        it('should attach an inline handler', () => {});

        it('should be able to remove an inline handler', () => {});

        it('should call the inline handler when a matching Application Context is set', () => {});

        it("should not call the handler when an Application Context that doesn't match is set", () => {});

        it('should not call a removed handler when a matching Application Context is set', () => {});
      });

      describe('using Orient Wildcard', () => {
        it('should attach an inline handler', () => {});

        it('should be able to remove an inline handler', () => {});

        it('should call the inline handler when a matching Application Context is set', () => {});

        it("should not call the handler when an Application Context that doesn't match is set", () => {});

        it('should not call a removed handler when a matching Application Context is set', () => {});
      });

      describe('using All Wildcard', () => {
        it('should attach an inline handler', () => {});

        it('should be able to remove an inline handler', () => {});

        it('should call the inline handler when a matching Application Context is set', () => {});

        it("should not call the handler when an Application Context that doesn't match is set", () => {});

        it('should not call a removed handler when a matching Application Context is set', () => {});
      });
    });
  });

  describe('as intercept handlers', () => {
    describe('for Concrete Application Contexts', () => {
      it('should attach an inline handler', () => {});

      it('should be able to remove an inline handler', () => {});

      it('should call the inline handler when a matching Application Context is set', () => {});

      it("should not call the handler when an Application Context that doesn't match is set", () => {});

      it('should not call a removed handler when a matching Application Context is set', () => {});
    });

    describe('for Wildcard Application Contexts', () => {
      describe('using Term Wildcard', () => {
        it('should attach an inline handler', () => {});

        it('should be able to remove an inline handler', () => {});

        it('should call the inline handler when a matching Application Context is set', () => {});

        it("should not call the handler when an Application Context that doesn't match is set", () => {});

        it('should not call a removed handler when a matching Application Context is set', () => {});
      });

      describe('using Action Wildcard', () => {
        it('should attach an inline handler', () => {});

        it('should be able to remove an inline handler', () => {});

        it('should call the inline handler when a matching Application Context is set', () => {});

        it("should not call the handler when an Application Context that doesn't match is set", () => {});

        it('should not call a removed handler when a matching Application Context is set', () => {});
      });

      describe('using Orient Wildcard', () => {
        it('should attach an inline handler', () => {});

        it('should be able to remove an inline handler', () => {});

        it('should call the inline handler when a matching Application Context is set', () => {});

        it("should not call the handler when an Application Context that doesn't match is set", () => {});

        it('should not call a removed handler when a matching Application Context is set', () => {});
      });

      describe('using All Wildcard', () => {
        it('should attach an inline handler', () => {});

        it('should be able to remove an inline handler', () => {});

        it('should call the inline handler when a matching Application Context is set', () => {});

        it("should not call the handler when an Application Context that doesn't match is set", () => {});

        it('should not call a removed handler when a matching Application Context is set', () => {});
      });
    });
  });
});
