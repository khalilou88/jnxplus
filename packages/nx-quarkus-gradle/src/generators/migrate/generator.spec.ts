import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import generator from './generator';
import { NxQuarkusGradleMigrateGeneratorSchema } from './schema';

describe('migrate generator', () => {
  let appTree: Tree;
  const options: NxQuarkusGradleMigrateGeneratorSchema = {
    javaVersion: '17',
    dsl: 'groovy',
    rootProjectName: 'quarkus-root-project',
  };

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace();
    appTree.write('./.gitignore', '');
    appTree.write('./.prettierignore', '');
  });

  xit('should run successfully', async () => {
    await generator(appTree, options);
    const gradlew = appTree.exists('gradlew');
    expect(gradlew).toBeTruthy();
  });
});
