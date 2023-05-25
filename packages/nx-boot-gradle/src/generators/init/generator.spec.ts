import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import generator from './generator';
import { NxBootGradleGeneratorSchema } from './schema';

describe('init generator', () => {
  let appTree: Tree;
  const options: NxBootGradleGeneratorSchema = {
    javaVersion: 17,
    dsl: 'groovy',
    rootProjectName: 'test-boot-multiproject',
  };

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace();
    appTree.write('./.gitignore', '');
    appTree.write('./.prettierignore', '');
  });

  xit('should run successfully', async () => {
    await generator(appTree, options);
    const settingsGradleExists = appTree.exists('settings.gradle');
    expect(settingsGradleExists).toBeTruthy();
  });
});
