const createLazyValue = (loadValue, label = 'module') => {
  if (typeof loadValue !== 'function') {
    throw new TypeError(`Lazy ${label} loader must be a function`);
  }

  let loaded = false;
  let value;

  const get = () => {
    if (!loaded) {
      value = loadValue();
      loaded = true;
    }
    return value;
  };

  get.isLoaded = () => loaded;
  get.peek = () => value;
  return get;
};

const createLazyRouter = (loadRouter, label = 'router') => {
  const getRouter = createLazyValue(() => {
    const router = loadRouter();
    if (typeof router !== 'function') {
      const error = new TypeError(`Lazy ${label} must export an Express router`);
      error.code = 'SNEUP_INVALID_LAZY_ROUTER';
      throw error;
    }
    return router;
  }, label);

  const middleware = (req, res, next) => {
    try {
      return getRouter()(req, res, next);
    } catch (error) {
      return next(error);
    }
  };

  middleware.isLoaded = getRouter.isLoaded;
  return middleware;
};

module.exports = {
  createLazyRouter,
  createLazyValue
};
