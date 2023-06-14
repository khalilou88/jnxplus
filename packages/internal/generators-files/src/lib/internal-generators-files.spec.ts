import { internalGeneratorsFiles } from './internal-generators-files';

describe('internalGeneratorsFiles', () => {
  it('should work', () => {
    expect(internalGeneratorsFiles()).toEqual('internal-generators-files');
  });
});
