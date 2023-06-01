import { internalBootGradle } from './internal-boot-gradle';

describe('internalBootGradle', () => {
  it('should work', () => {
    expect(internalBootGradle()).toEqual('internal-boot-gradle');
  });
});
