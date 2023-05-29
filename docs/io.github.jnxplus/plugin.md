# Why this plugin

## Installation

### gradle.properties

`jnxplusGradlePluginVersion=1.2.3`

### Settings.gradle

Kotlin:

`val jnxplusGradlePluginVersion: String by settings
plugins {
id("io.github.jnxplus") version jnxplusGradlePluginVersion
}`

Groovy:

`plugins {    
id 'io.github.jnxplus' version "${jnxplusGradlePluginVersion}"
}`

### build.gradle

Kotlin:

`plugins {
id("io.github.jnxplus")
}`

Groovy:

`plugins {
id "io.github.jnxplus"
}`

## How to use it?
