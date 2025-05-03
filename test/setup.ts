import '@maxmilton/test-utils/extend';

const noop = () => {};

function setupMocks(): void {
  // @ts-expect-error - noop stub
  global.performance.mark = noop;
  // @ts-expect-error - noop stub
  global.performance.measure = noop;
}

setupMocks();
