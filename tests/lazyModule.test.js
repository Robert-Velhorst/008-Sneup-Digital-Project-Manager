const { createLazyRouter, createLazyValue } = require('../src/utils/lazyModule');

describe('lazy module boundaries', () => {
  test('loads and caches a value only when first requested', () => {
    const load = jest.fn(() => ({ ready: true }));
    const getValue = createLazyValue(load, 'test value');

    expect(getValue.isLoaded()).toBe(false);
    expect(getValue.peek()).toBeUndefined();
    expect(getValue()).toEqual({ ready: true });
    expect(getValue()).toBe(getValue.peek());
    expect(load).toHaveBeenCalledTimes(1);
  });

  test('shares one router across mounts and forwards route errors', () => {
    const routeError = new Error('route failed');
    const next = jest.fn();
    const router = jest.fn((_req, _res, routeNext) => routeNext(routeError));
    const load = jest.fn(() => router);
    const lazyRouter = createLazyRouter(load, 'test router');

    expect(lazyRouter.isLoaded()).toBe(false);
    lazyRouter({}, {}, next);
    lazyRouter({}, {}, next);

    expect(load).toHaveBeenCalledTimes(1);
    expect(router).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenLastCalledWith(routeError);
  });

  test('reports an invalid router through Express error handling', () => {
    const next = jest.fn();
    const lazyRouter = createLazyRouter(() => ({ invalid: true }), 'broken router');

    lazyRouter({}, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      code: 'SNEUP_INVALID_LAZY_ROUTER'
    }));
  });
});
