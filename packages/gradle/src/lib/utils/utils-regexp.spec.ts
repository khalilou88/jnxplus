import { jnxplusGradlePluginExists } from '.';

describe('utils regexp', () => {
  it('should return true', () => {
    const gradlePropertiesContent = `
    javaVersion=17
    jnxplusGradlePluginVersion=0.0.1-SNAPSHOT
    springBootVersion=3.0.6
    dependencyManagementVersion=1.1.0
    kotlinJvmVersion=1.7.22
    kotlinSpringVersion=1.7.22
    checkstyleVersion=10.11.0
    ktlintVersion=0.49.1
  `;

    expect(jnxplusGradlePluginExists(gradlePropertiesContent)).toBe(true);
  });

  it('should return false', () => {
    const gradlePropertiesContent = `
    javaVersion=17
    springBootVersion=3.0.6
    dependencyManagementVersion=1.1.0
    kotlinJvmVersion=1.7.22
    kotlinSpringVersion=1.7.22
    checkstyleVersion=10.11.0
    ktlintVersion=0.49.1
  `;

    expect(jnxplusGradlePluginExists(gradlePropertiesContent)).toBe(false);
  });
});
