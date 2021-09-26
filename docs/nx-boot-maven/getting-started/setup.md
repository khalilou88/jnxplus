# Setup @jnxplus/nx-boot-maven

## 0. Prerequisites

`@jnxplus/nx-boot-maven` requires a Java 8 or higher Runtime Environment and the current Long Term Support (LTS) version of node.js.

## 1. Install @jnxplus/nx-boot-maven

In a Nx workspace root install `@jnxplus/nx-boot-maven` with your package manager using the dev flag.

This is an exampel with npm:

```bash
npm install --save-dev @jnxplus/nx-boot-maven
```

### 2. Init worspace with Add Spring boot and Maven support

The following command adds Spring boot and Maven support (Maven wrapper and config files) to the workspace. This only needs to be performed once per workspace.

```bash
nx generate @jnxplus/nx-boot-maven:init
```

Choose the version of Java supported by your operating system and values for the information asked for the Maven parent project :

```bash
nx-workspace> nx generate @jnxplus/nx-boot-maven:init
√ Which version of Java would you like to use? · 11
√ What groupId would you like to use? · com.example
√ What parentProjectName would you like to use? · boot-multi-module
√ What project version would you like to use? · 0.0.1-SNAPSHOT
CREATE mvnw
CREATE mvnw.cmd
CREATE pom.xml
CREATE .mvn/wrapper/maven-wrapper.jar
CREATE .mvn/wrapper/maven-wrapper.properties
CREATE .mvn/wrapper/MavenWrapperDownloader.java
CREATE tools/linters/checkstyle.xml
CREATE tools/linters/pmd.xml
UPDATE nx.json
UPDATE .gitignore
UPDATE .prettierignore
```

As you see, the command added the following files :

- Maven wrapper and Maven executables for windows and Linux.
- Pom.xml for maven parent project. Here we will add our apps and libs later so Maven could perform its tasks.
- `checkstyle.xml` and `pmd.xml` for java linting.

We also updated `nx.json` file to add the plugin for dep-graph feature and `.gitignore` and `.prettierignore` so we can ignore Maven build and cache folders.
