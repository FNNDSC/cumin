const chalk = new Proxy(() => {}, {
  get: (target, prop) => {
    if (prop === 'default') {
      return chalk;
    }
    return new Proxy(() => '', {
      get: (nestedTarget) => nestedTarget, // Allow chained color/style calls
      apply: (nestedTarget, thisArg, argList) => argList.join(' '),
    });
  },
  apply: (target, thisArg, argList) => argList.join(' '),
});

module.exports = chalk;
