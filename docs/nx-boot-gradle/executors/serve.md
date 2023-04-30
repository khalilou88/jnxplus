# @jnxplus/nx-boot-gradle:serve

Starts server for application.
Under the hood, we use the Spring Boot `bootRun` task to run the application.

## Usage

```bash
nx serve my-app-name
```

## Options

### args

Type: `string`

Add more arguments when serving an app.

```bash
nx serve my-app-name --args='--spring.profiles.active=dev'
```
