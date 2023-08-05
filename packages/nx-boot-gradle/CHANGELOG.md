# Changelog

This file was generated using [@jscutlery/semver](https://github.com/jscutlery/semver).

# [9.0.0](https://github.com/khalilou88/jnxplus/compare/nx-boot-gradle-8.1.0...nx-boot-gradle-9.0.0) (2023-08-05)

### Dependency Updates

* `gradle` updated to version `0.15.0`

### Features

* add repository to package.json ([f08724a](https://github.com/khalilou88/jnxplus/commit/f08724ac736499548c7dff23ad125f59ed257f73))
* **executors:** remove deprecated executors from nx-boot plugins ([27ebe79](https://github.com/khalilou88/jnxplus/commit/27ebe793c2dcdf9afbcbc870d68fc6177b7dd086))


### BREAKING CHANGES

* **executors:** from now we need to change old executors by run-task executor



# [8.1.0](https://github.com/khalilou88/jnxplus/compare/nx-boot-gradle-8.0.0...nx-boot-gradle-8.1.0) (2023-07-28)

### Dependency Updates

* `gradle-plugin` updated to version `0.2.0`
* `gradle` updated to version `0.14.0`
* `common` updated to version `0.10.0`

### Features

* **executors:** deprecate executors ([8afa24b](https://github.com/khalilou88/jnxplus/commit/8afa24b512993e56a012224ec81f07893a6cbce5))



# [8.0.0](https://github.com/khalilou88/jnxplus/compare/nx-boot-gradle-7.3.5...nx-boot-gradle-8.0.0) (2023-07-12)

### Dependency Updates

* `gradle` updated to version `0.13.2`

### Features

* **graph:** use gradle task for dep-graph ([a339be5](https://github.com/khalilou88/jnxplus/commit/a339be502cf1447c27c52c7fbe89f1e7d2072268))


### BREAKING CHANGES

* **graph:** the graph will not work until you add jnxplus gradle plugin to the root project



## [7.3.5](https://github.com/khalilou88/jnxplus/compare/nx-boot-gradle-7.3.4...nx-boot-gradle-7.3.5) (2023-07-08)

### Dependency Updates

* `gradle` updated to version `0.13.1`
* `common` updated to version `0.9.1`


## [7.3.4](https://github.com/khalilou88/jnxplus/compare/nx-boot-gradle-7.3.3...nx-boot-gradle-7.3.4) (2023-07-02)

### Dependency Updates

* `gradle` updated to version `0.13.0`


## [7.3.3](https://github.com/khalilou88/jnxplus/compare/nx-boot-gradle-7.3.2...nx-boot-gradle-7.3.3) (2023-06-28)

### Dependency Updates

* `gradle` updated to version `0.12.0`


## [7.3.2](https://github.com/khalilou88/jnxplus/compare/nx-boot-gradle-7.3.1...nx-boot-gradle-7.3.2) (2023-06-24)

### Dependency Updates

* `gradle` updated to version `0.11.0`


## [7.3.1](https://github.com/khalilou88/jnxplus/compare/nx-boot-gradle-7.3.0...nx-boot-gradle-7.3.1) (2023-06-23)

### Dependency Updates

* `internal-generators-files` updated to version `0.1.0`
* `gradle` updated to version `0.10.1`


# [7.3.0](https://github.com/khalilou88/jnxplus/compare/nx-boot-gradle-7.2.0...nx-boot-gradle-7.3.0) (2023-06-21)

### Dependency Updates

* `internal-generators-files` updated to version `0.1.0`
* `gradle` updated to version `0.10.0`
* `common` updated to version `0.9.0`

### Bug Fixes

* fix e2e tests ([#266](https://github.com/khalilou88/jnxplus/issues/266)) ([0e12db4](https://github.com/khalilou88/jnxplus/commit/0e12db4cb10b15142da482f3a63f9e7841f3ef88))
* fix optional project.json ([#271](https://github.com/khalilou88/jnxplus/issues/271)) ([92e7064](https://github.com/khalilou88/jnxplus/commit/92e70640576a5943bc5be201f8c9885a51f49693))


### Features

* **generators:** add framework to nx-gradle ([#265](https://github.com/khalilou88/jnxplus/issues/265)) ([2148db4](https://github.com/khalilou88/jnxplus/commit/2148db46ba63acc5d292543142e47c20061a967e))



# [7.2.0](https://github.com/khalilou88/jnxplus/compare/nx-boot-gradle-7.1.2...nx-boot-gradle-7.2.0) (2023-06-17)

### Dependency Updates

* `gradle-plugin` updated to version `0.2.0`
* `internal-generators-files` updated to version `0.1.0`
* `gradle` updated to version `0.9.1`
* `common` updated to version `0.8.1`

### Features

* **generators:** reduce code duplication ([#251](https://github.com/khalilou88/jnxplus/issues/251)) ([dfdad1d](https://github.com/khalilou88/jnxplus/commit/dfdad1dfd2ef13303e1c12a4d824261d5bf407be))
* **generators:** reduce linters files ([#252](https://github.com/khalilou88/jnxplus/issues/252)) ([75c0e76](https://github.com/khalilou88/jnxplus/commit/75c0e769e7917ef91584b4f5dcb5efbff80da6c2))



## [7.1.2](https://github.com/khalilou88/jnxplus/compare/nx-boot-gradle-7.1.1...nx-boot-gradle-7.1.2) (2023-06-09)

### Dependency Updates

* `gradle-plugin` updated to version `0.2.0`
* `gradle` updated to version `0.9.0`
* `common` updated to version `0.8.0`


## [7.1.1](https://github.com/khalilou88/jnxplus/compare/nx-boot-gradle-7.1.0...nx-boot-gradle-7.1.1) (2023-06-09)

### Dependency Updates

* `gradle` updated to version `0.8.1`


# [7.1.0](https://github.com/khalilou88/jnxplus/compare/nx-boot-gradle-7.0.0...nx-boot-gradle-7.1.0) (2023-06-07)

### Dependency Updates

* `gradle-plugin` updated to version `0.1.5`
* `gradle` updated to version `0.8.0`
* `common` updated to version `0.7.0`

### Features

* **executors:** add publish executor ([0a6a9fa](https://github.com/khalilou88/jnxplus/commit/0a6a9fa36e0f86dd35d93e04b1dfbca7fc8ff3a2))
* **generators:** export generators [skip ci] ([78a7730](https://github.com/khalilou88/jnxplus/commit/78a7730d83006da48eeff2b0d01227ee651cd5ff))
* **graph:** use projectDependencyTask to add deps to the graph ([#248](https://github.com/khalilou88/jnxplus/issues/248)) ([f174562](https://github.com/khalilou88/jnxplus/commit/f174562cd77ca1d68ae378927651001c46527579))



# [7.0.0](https://github.com/khalilou88/jnxplus/compare/nx-boot-gradle-6.7.0...nx-boot-gradle-7.0.0) (2023-06-01)

### Dependency Updates

* `gradle` updated to version `0.7.0`
* `common` updated to version `0.6.0`

### Bug Fixes

* **graph:** set minimum version of nx to 16.3.0 ([3559934](https://github.com/khalilou88/jnxplus/commit/355993462155a27ab620678b1fd358d2f4eed6de))


### BREAKING CHANGES

* **graph:** Nx version 16.3.0 move hashing to the daemon, that create a breaking change in the plugin



# [6.7.0](https://github.com/khalilou88/jnxplus/compare/nx-boot-gradle-6.6.0...nx-boot-gradle-6.7.0) (2023-05-28)

### Dependency Updates

* `gradle` updated to version `0.6.0`
* `common` updated to version `0.5.0`

### Features

* **executors:** move all gradle executors to gradle lib ([#235](https://github.com/khalilou88/jnxplus/issues/235)) ([86d6740](https://github.com/khalilou88/jnxplus/commit/86d67402517fd92cf505226c31c6af6fa0929b9d))



# [6.6.0](https://github.com/khalilou88/jnxplus/compare/nx-boot-gradle-6.5.0...nx-boot-gradle-6.6.0) (2023-05-27)

### Dependency Updates

* `gradle` updated to version `0.5.0`
* `common` updated to version `0.4.0`

### Bug Fixes

* **executors:** use pipe output capture ([#233](https://github.com/khalilou88/jnxplus/issues/233)) ([1d295b4](https://github.com/khalilou88/jnxplus/commit/1d295b4548a2b2cbdeb4c7fbb5ceb4fb73a830d8))


### Features

* **generators:** update spring boot version to 3.1.0 ([#231](https://github.com/khalilou88/jnxplus/issues/231)) ([b050516](https://github.com/khalilou88/jnxplus/commit/b0505163fde06fbcf355a97a75e675c0c5fe8bc3))



# [6.5.0](https://github.com/khalilou88/jnxplus/compare/nx-boot-gradle-6.4.1...nx-boot-gradle-6.5.0) (2023-05-26)

### Dependency Updates

* `gradle` updated to version `0.4.0`
* `common` updated to version `0.3.1`

### Features

* **generators:** update gradle wrapper version ([b9953ae](https://github.com/khalilou88/jnxplus/commit/b9953ae7607d8b9ca01542627711b79b131d629d))



## [6.4.1](https://github.com/khalilou88/jnxplus/compare/nx-boot-gradle-6.4.0...nx-boot-gradle-6.4.1) (2023-05-22)

### Dependency Updates

* `gradle` updated to version `0.3.1`

### Bug Fixes

* **generators:** add `\t` when adding a dependency to a project ([#217](https://github.com/khalilou88/jnxplus/issues/217)) ([acb752f](https://github.com/khalilou88/jnxplus/commit/acb752f01a735cae98432e22934d457721378a4f))



# [6.4.0](https://github.com/khalilou88/jnxplus/compare/nx-boot-gradle-6.3.1...nx-boot-gradle-6.4.0) (2023-05-21)

### Dependency Updates

* `gradle` updated to version `0.3.0`

### Bug Fixes

* **generators:** don't generate extras lines in templates ([#216](https://github.com/khalilou88/jnxplus/issues/216)) ([fd2835c](https://github.com/khalilou88/jnxplus/commit/fd2835ce58f0b67c0d02ec0586744735e94330b1))


### Features

* **generators:** read gradle dsl from root project ([#214](https://github.com/khalilou88/jnxplus/issues/214)) ([ddf52d0](https://github.com/khalilou88/jnxplus/commit/ddf52d0e0886081c2c4b3176488e1779457defeb))



## [6.3.1](https://github.com/khalilou88/jnxplus/compare/nx-boot-gradle-6.3.0...nx-boot-gradle-6.3.1) (2023-05-19)

### Dependency Updates

* `gradle` updated to version `0.2.1`
* `common` updated to version `0.3.0`

### Bug Fixes

* **nx-boot-gradle:** refactor deps graph ([#212](https://github.com/khalilou88/jnxplus/issues/212)) ([ad50fc6](https://github.com/khalilou88/jnxplus/commit/ad50fc6302e981080040a9343def126015b1e216))



# [6.3.0](https://github.com/khalilou88/jnxplus/compare/nx-boot-gradle-6.2.0...nx-boot-gradle-6.3.0) (2023-05-17)

### Dependency Updates

* `gradle` updated to version `0.2.0`
* `common` updated to version `0.2.4`

### Bug Fixes

* **nx-boot-gradle:** fix gitattributes content [skip ci] ([e4cd677](https://github.com/khalilou88/jnxplus/commit/e4cd677cb51b44ba371e4106861d758a9c90146a))


### Features

* **nx-boot-gradle:** use addOrUpdateGitattributes from gradle lib ([9eaf8dc](https://github.com/khalilou88/jnxplus/commit/9eaf8dcd944fa436184fc9d601b46538e038d138))



# [6.2.0](https://github.com/khalilou88/jnxplus/compare/nx-boot-gradle-6.1.4...nx-boot-gradle-6.2.0) (2023-05-13)

### Dependency Updates

- `gradle` updated to version `0.1.6`
- `common` updated to version `0.2.3`

### Features

- **nx-boot-gradle:** add ktformat executor ([#196](https://github.com/khalilou88/jnxplus/issues/196)) ([9266914](https://github.com/khalilou88/jnxplus/commit/9266914a661b0ffa329a1a4470db14fd586e1dfe))
