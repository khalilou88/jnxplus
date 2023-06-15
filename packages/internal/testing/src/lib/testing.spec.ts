import { semver } from './testing';

describe('e2eTesting', () => {
  it('should work', () => {
    const version: { major: number; minor: number; patch: number } =
      semver('16.4.0-beta.0');

    expect(version.major).toBe(16);
    expect(version.minor).toBe(4);
    expect(version.patch).toBe(0);
  });
});
