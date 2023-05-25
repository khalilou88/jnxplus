import { readProjectConfiguration, Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import generator from './generator';
import { NxBootMavenParentProjectGeneratorSchema } from './schema';

describe('parent project generator', () => {
  let appTree: Tree;
  const options: NxBootMavenParentProjectGeneratorSchema = {
    name: 'test',
    projectType: 'application',
    groupId: 'com.example',
    projectVersion: '0.0.1-SNAPSHOT',
    parentProject: '',
    dependencyManagementStrategy: 'none',
  };

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace();
    appTree.write(
      './pom.xml',
      '<project><groupId>com.example</groupId><artifactId>boot-multi-module</artifactId><version>0.0.1-SNAPSHOT</version><modules></modules></project>'
    );
  });

  it('should run successfully', async () => {
    await generator(appTree, options);
    const config = readProjectConfiguration(appTree, 'test');
    expect(config).toBeDefined();
  });
});
