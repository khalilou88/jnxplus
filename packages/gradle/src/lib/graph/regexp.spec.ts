import {
  getDependencies,
  getRootProjectName,
  getSubprojects,
} from './graph-legacy';

describe('regexp', () => {
  it('should get correct name and subs from settings.gradle', () => {
    const settingsGradle = `
    rootProject.name= 'basic-multiproject'
    include 'app'
    include 'lib'
  `;

    expect(getRootProjectName(settingsGradle)).toBe('basic-multiproject');
    expect(getSubprojects(settingsGradle)).toEqual(['app', 'lib']);
  });

  it('should get correct name and subs from settings.gradle.kts', () => {
    const settingsGradleKts = `
    rootProject.name  = "basic-multiproject"
    include("app")
    include("lib")
  `;

    expect(getRootProjectName(settingsGradleKts)).toBe('basic-multiproject');
    expect(getSubprojects(settingsGradleKts)).toEqual(['app', 'lib']);
  });

  it('should get correct subs in one line from settings.gradle', () => {
    const settingsGradle = `
    rootProject.name = 'dependencies-java'
    include 'api', 'shared', 'services:person-service'
    include 'lib'
  `;

    expect(getRootProjectName(settingsGradle)).toBe('dependencies-java');
    expect(getSubprojects(settingsGradle)).toEqual([
      'api',
      'shared',
      'services:person-service',
      'lib',
    ]);
  });

  it('should get correct subs in one line from settings.gradle.kts', () => {
    const settingsGradleKts = `
    rootProject.name = "dependencies-java"
    include("api", "shared", "services:person-service")
    include("lib")
  `;

    expect(getRootProjectName(settingsGradleKts)).toBe('dependencies-java');
    expect(getSubprojects(settingsGradleKts)).toEqual([
      'api',
      'shared',
      'services:person-service',
      'lib',
    ]);
  });

  it('should get deps from build.gradle', () => {
    const buildGradle = `
    plugins {
      id 'myproject.java-conventions'
    }
    
    dependencies {
        implementation project(':shared')
    }
  `;

    expect(getDependencies(buildGradle)).toEqual(['shared']);
  });

  it('should get deps from build.gradle.kts', () => {
    const buildGradleKts = `
    plugins {
      id("myproject.java-conventions")
    }
    
    dependencies {
        implementation(project(":shared"))
    }
  `;

    expect(getDependencies(buildGradleKts)).toEqual(['shared']);
  });
});
