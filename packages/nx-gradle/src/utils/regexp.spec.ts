import { getProjectPathFromProjectRoot, getRootProjectName } from '.';

describe('regexp', () => {
  it('should get name from settings.gradle', () => {
    const settingsGradle = `
    rootProject.name= 'basic-multiproject'
    include 'app'
    include 'lib'
  `;

    expect(getRootProjectName(settingsGradle)).toBe('basic-multiproject');
  });

  it('should get name from settings.gradle.kts', () => {
    const settingsGradleKts = `
    rootProject.name  = "basic-multiproject"
    include("app")
    include("lib")
  `;

    expect(getRootProjectName(settingsGradleKts)).toBe('basic-multiproject');
  });

  it('should get correct projectPath', () => {
    expect(
      getProjectPathFromProjectRoot(
        './nx-gradle/boot-gradle-app-4128904/test',
        'nx-gradle',
      ),
    ).toBe(':boot-gradle-app-4128904:test');
  });
});
