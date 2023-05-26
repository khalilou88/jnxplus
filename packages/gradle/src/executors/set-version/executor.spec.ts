import { setVersion } from './executor';

describe('regex work', () => {
  it('should work', async () => {
    const content = `
    plugins {
      // Apply the Java Gradle plugin development plugin to add support for developing Gradle plugins
      id 'java-gradle-plugin'
    
      // Apply the Groovy plugin to add support for Groovy
      id 'groovy'
    
      id 'maven-publish'
    
      id 'com.gradle.plugin-publish' version '1.2.0'
    }
    
    group = 'io.github.jnxplus'
    version = '0.0.1-SNAPSHOT'
    
    repositories {
      // Use Maven Central for resolving dependencies.
      mavenCentral()
    }
    `;

    expect(content.includes("version = '0.0.1-SNAPSHOT'")).toBe(true);

    const newConetnt = setVersion(content, '1.2.3');

    console.log(newConetnt);

    expect(newConetnt.includes("version = '1.2.3'")).toBe(true);
  });
});
