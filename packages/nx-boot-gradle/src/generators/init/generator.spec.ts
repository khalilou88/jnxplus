import { Tree } from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import generator from './generator';
import { NxBootGradleGeneratorSchema } from './schema';

describe('init generator', () => {
  let appTree: Tree;
  const options: NxBootGradleGeneratorSchema = {
    rootProjectName: 'test-boot-multiproject',
  };

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace();
    appTree.write('./.gitignore', '');
  });

  it('should run successfully', async () => {
    await generator(appTree, options);
    const settingsGradleExists = appTree.exists('settings.gradle');
    expect(settingsGradleExists).toBeTruthy();
  });
});
