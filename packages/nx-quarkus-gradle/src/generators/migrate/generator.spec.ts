import { Tree } from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import generator from './generator';
import { NxQuarkusGradleGeneratorSchema } from './schema';

describe('migrate generator', () => {
  let appTree: Tree;
  const options: NxQuarkusGradleGeneratorSchema = {
    javaVersion: '17',
    dsl: 'groovy',
    rootProjectName: 'quarkus-root-project',
  };

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace();
    appTree.write('./.gitignore', '');
    appTree.write('./.prettierignore', '');
  });

  it('should run successfully', async () => {
    await generator(appTree, options);
    const gradlew = appTree.exists('gradlew');
    expect(gradlew).toBeTruthy();
  });
});
