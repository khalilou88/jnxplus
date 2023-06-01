import { internalBoot } from './internal-boot';

describe('internalBoot', () => {
  it('should work', () => {
    expect(internalBoot()).toEqual('internal-boot');
  });
});
