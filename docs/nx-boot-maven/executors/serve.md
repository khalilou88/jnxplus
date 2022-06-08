# @jnxplus/nx-boot-maven:serve

Starts server for application.
Under the hood, we use the Spring Boot `spring-boot:run` goal to run the application.

## Usage

```bash
nx serve my-app-name
```

## Options

### args

Type: `string`

Add more arguments to Maven when serving an app.

```bash
nx serve my-app-name --args="-Dspring-boot.run.profiles=dev"
```
