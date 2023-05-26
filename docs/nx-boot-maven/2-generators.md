# Generators

## @jnxplus/nx-boot-maven:init

Add Spring Boot and Maven support. This only needs to be performed once per workspace.

### Usage

```bash
nx generate @jnxplus/nx-boot-maven:init
```

Or

```bash
nx g @jnxplus/nx-boot-maven:init
```

Show what will be generated without writing to disk:

```bash
nx g @jnxplus/nx-boot-maven:init --dry-run
```

### Options

#### javaVersion (_**required**_)

Default: `17`

Type: `string`

Possible values: `17`, `20`

The java version for Spring Boot apps and libs. The same java version is used inside the Nx workspace.

#### groupId (_**required**_)

Default: `com.example`

Type: `string`

The parent project groupId.

#### parentProjectName (_**required**_)

Default: `boot-multi-module`

Type: `string`

The parent project name.

#### parentProjectVersion (_**required**_)

Default: `0.0.1-SNAPSHOT`

Type: `string`

The parent project version.

## @jnxplus/nx-boot-maven:application

Create a Spring Boot application.

### Usage

```bash
nx generate @jnxplus/nx-boot-maven:application my-app-name
```

Or

```bash
nx g @jnxplus/nx-boot-maven:app my-app-name
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

#### parentProject

Default: `root project`

Type: `string`

ArtifactId of the parent project or leave it blank for the root project

## @jnxplus/nx-boot-maven:library

Create a Spring Boot library.

### Usage

```bash
nx generate @jnxplus/nx-boot-maven:library my-lib-name
```

Or

```bash
nx g @jnxplus/nx-boot-maven:lib my-lib-name
```

Show what will be generated without writing to disk:

```bash
nx g ... --dry-run
```

#### Examples

Generate libs/myapp/mylib:

```bash
nx g @jnxplus/nx-boot-maven:lib mylib --directory=myapp
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

Projects that needs to access this library (comma delimited). This add the library to their dependencies.

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

#### parentProject

Default: `root project`

Type: `string`

ArtifactId of the parent project or leave it blank for the root project

## @jnxplus/nx-boot-maven:parent-project

Create a parent project.

### Usage

```bash
nx generate @jnxplus/nx-boot-maven:parent-project my-parent-project
```

### Options

#### name (_**required**_)

Type: `string`

The name of the library.

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

#### simpleName

Default: `false`

Type: `boolean`

Don't include the directory in the lib name

#### parentProject

Default: `root project`

Type: `string`

ArtifactId of the parent project or leave it blank for the root project

## @jnxplus/nx-boot-maven:migrate

Update Maven wrapper.

### Usage

```bash
nx generate @jnxplus/nx-boot-maven:migrate
```

Or

```bash
nx g @jnxplus/nx-boot-maven:migrate
```

Show what will be generated without writing to disk:

```bash
nx g @jnxplus/nx-boot-maven:migrate --dry-run
```
