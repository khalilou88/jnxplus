# Generators

## @jnxplus/nx-boot-gradle:init

Add Spring Boot and Gradle support. This only needs to be performed once per workspace.

### Usage

```bash
nx generate @jnxplus/nx-boot-gradle:init
```

Or

```bash
nx g @jnxplus/nx-boot-gradle:init
```

Show what will be generated without writing to disk:

```bash
nx g @jnxplus/nx-boot-gradle:init --dry-run
```

### Options

#### javaVersion (_**required**_)

Default: `17`

Type: `string`

Possible values: `17`, `19`

The java version for Spring Boot apps and libs. The same java version is used inside the Nx workspace.

#### dsl (_**required**_)

Default: `groovy`

Type: `string`

Possible values: `groovy`, `kotlin`

The Build DSL.

#### rootProjectName (_**required**_)

Default: `spring-boot-root-project`

Type: `string`

The root project name.

## @jnxplus/nx-boot-gradle:application

Create a Spring Boot application.

### Usage

```bash
nx generate @jnxplus/nx-boot-gradle:application my-app-name
```

Or

```bash
nx g @jnxplus/nx-boot-gradle:app my-app-name
```

Show what will be generated without writing to disk:

```bash
nx g ... --dry-run
```

### Options

#### name (_**required**_)

Type: `string`

The name of the application.

#### Language (_**required**_)

Default: `java`

Type: `string`

Possible values: `java`, `kotlin`

The language used for the project.

#### groupId (_**required**_)

Type: `string`

The groupId of the application.

#### projectVersion (_**required**_)

Alias(es): v

Type: `string`

The version of the application.

#### packaging (_**required**_)

Default: `jar`

Type: `string`

Possible values: `jar`, `war`

The application packaging.

#### configFormat (_**required**_)

Default: `.properties`

Type: `string`

Possible values: `.properties`, `.yml`

The configuration format used in the application.

#### directory

Alias(es): dir

Type: `string`

The directory of the new application.

#### tags

Alias(es): t

Type: `string`

Add tags to the application (used for linting).

#### simpleName

Default: `false`

Type: `boolean`

Don't include the directory in the app name

#### simplePackageName

Default: `false`

Type: `boolean`

Don't include the directory in the package name

#### minimal

Default: `false`

Type: `boolean`

Generate an app with a minimal setup

#### port

Default: `8080`

Type: `number`

Port to start the server at. Default is 8080.

## @jnxplus/nx-boot-gradle:library

Create a Spring Boot library.

### Usage

```bash
nx generate @jnxplus/nx-boot-gradle:library my-lib-name
```

Or

```bash
nx g @jnxplus/nx-boot-gradle:lib my-lib-name
```

Show what will be generated without writing to disk:

```bash
nx g ... --dry-run
```

#### Examples

Generate libs/myapp/mylib:

```bash
nx g @jnxplus/nx-boot-gradle:lib mylib --directory=myapp
```

### Options

#### name (_**required**_)

Type: `string`

The name of the library.

#### Language (_**required**_)

Default: `java`

Type: `string`

Possible values: `java`, `kotlin`

The language used for the project.

#### groupId (_**required**_)

Type: `string`

The groupId of the library.

#### projectVersion (_**required**_)

Alias(es): v

Type: `string`

The version of the library.

#### directory

Alias(es): dir

Type: `string`

A directory where the library is placed.

#### tags

Alias(es): t

Type: `string`

Add tags to the library (used for linting).

#### projects

Type: `string`

Projects that needs to access this library (comma delimited). This adds the library to their dependencies.

#### simpleName

Default: `false`

Type: `boolean`

Don't include the directory in the lib name

#### simplePackageName

Default: `false`

Type: `boolean`

Don't include the directory in the package name

#### skipStarterCode

Default: `false`

Type: `boolean`

Skip starter code

## @jnxplus/nx-boot-gradle:migrate

Update Gradle wrapper.

### Usage

```bash
nx generate @jnxplus/nx-boot-gradle:migrate
```

Or

```bash
nx g @jnxplus/nx-boot-gradle:migrate
```

Show what will be generated without writing to disk:

```bash
nx g @jnxplus/nx-boot-gradle:migrate --dry-run
```
