import { internalBootMaven } from './internal-boot-maven';

describe('internalBootMaven', () => {
  it('should work', () => {
    expect(internalBootMaven()).toEqual('internal-boot-maven');
  });
});
