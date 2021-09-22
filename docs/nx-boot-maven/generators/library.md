# @jnxplus/nx-boot-maven:library

Create a Spring Boot library.

## Usage

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

### Examples

Generate libs/myapp/mylib:

```bash
nx g @jnxplus/nx-boot-gradle:lib mylib --directory=myapp
```

## Options

### name (_**required**_)

Type: `string`

The name of the library.

### Language (_**required**_)

Default: `java`

Type: `string`

Possible values: `java`, `kotlin`

The language used for the project.

### groupId (_**required**_)

Type: `string`

The groupId of the library.

### projectVersion (_**required**_)

Alias(es): v

Type: `string`

The version of the library.

### directory

Alias(es): dir

Type: `string`

A directory where the library is placed.

### tags

Alias(es): t

Type: `string`

Add tags to the library (used for linting).

### projects

Type: `string`

Projects that needs to access this library (comma delimited). This add the library to their dependencies.
