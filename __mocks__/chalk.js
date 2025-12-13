const chalk = new Proxy(() => {}, {
  get: (target, prop) => {
    if (prop === 'default') {
      return chalk;
    }
    return new Proxy(() => '', { // Return a function that returns an empty string for any method
      get: (nestedTarget, nestedProp) => {
        return nestedTarget; // Allow chaining by returning the same proxy
      },
      apply: (nestedTarget, thisArg, argList) => {
        return argList.join(' '); // When called, just join the arguments
      }
    });
  },
  apply: (target, thisArg, argList) => {
    return argList.join(' '); // When top-level chalk is called
  }
});

module.exports = chalk;