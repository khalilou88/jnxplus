import { Tree } from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import generator from './generator';
import { NxQuarkusMavenGeneratorSchema } from './schema';

describe('init generator', () => {
  let appTree: Tree;
  const options: NxQuarkusMavenGeneratorSchema = {
    javaVersion: 17,
    groupId: 'com.example',
    parentProjectName: 'test-boot-multiproject',
    parentProjectVersion: '1.0.0',
  };

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace();
    appTree.write('./.gitignore', '');
    appTree.write('./.prettierignore', '');
  });

  it('should run successfully', async () => {
    await generator(appTree, options);
    const pomXmlExists = appTree.exists('pom.xml');
    expect(pomXmlExists).toBeTruthy();
  });
});
