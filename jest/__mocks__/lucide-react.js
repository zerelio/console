const React = require('react');

const proxyHandler = {
  get(_target, name) {
    if (name === '__esModule') return true;
    if (typeof name === 'symbol' || name === 'default') return undefined;
    return React.forwardRef(function LucideMock(props, ref) {
      const { className, ...rest } = props || {};
      return React.createElement('span', {
        'data-testid': `lucide-${name}`,
        ref,
        className,
        ...rest,
      });
    });
  },
};

module.exports = new Proxy({}, proxyHandler);
