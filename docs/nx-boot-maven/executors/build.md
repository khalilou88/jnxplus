# @jnxplus/nx-boot-maven:build

Build a Spring Boot project:

- Build an application:
  We use the Spring Boot `spring-boot:repackage` goal to build the application.

- Build a library:
  For libraries we use `install` goal for build.

In both cases, the build command will not execute tests and you need to run the test command instead.

## Usage

```bash
nx build my-project-name
```

## Options

### mvnArgs

Type: `string`

Arguments to pass to the maven cli.

```bash
nx build my-app-name --mvnArgs="--no-transfer-progress"
```
