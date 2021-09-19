import org.jetbrains.kotlin.gradle.tasks.KotlinCompile
import java.io.FileInputStream
import java.util.*

val properties = Properties()
properties.load(FileInputStream("gradle.properties"))
val javaVersion: String = properties.getProperty("javaVersion")

plugins {
  id("org.springframework.boot")
  id("io.spring.dependency-management")
  <% if(packaging === 'war') { %>
  war
  <% } %>
  id("org.jetbrains.kotlin.jvm")
  id("org.jetbrains.kotlin.plugin.spring")
}

group = "<%= groupId %>"
version = "<%= projectVersion %>"
java.sourceCompatibility = JavaVersion.toVersion(javaVersion)

repositories {
  mavenCentral()
}

dependencies {
  implementation("org.springframework.boot:spring-boot-starter-web")
  implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
  implementation("org.jetbrains.kotlin:kotlin-reflect")
  implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8")
  <% if(packaging === 'war') { %>
  providedRuntime("org.springframework.boot:spring-boot-starter-tomcat")
  <% } %>
  testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.withType<KotlinCompile> {
  kotlinOptions {
    freeCompilerArgs = listOf("-Xjsr305=strict")
    jvmTarget = javaVersion
  }
}

tasks.withType<Test> {
  useJUnitPlatform()
}
