plugins {
	id("org.springframework.boot")
	id("io.spring.dependency-management")
	id("java")
	<% if(packaging === 'war') { %>
	id("war")
    <% } %>
}

group = "<%= groupId %>"
version = "<%= projectVersion %>"
java.sourceCompatibility = JavaVersion.VERSION_11

repositories {
	mavenCentral()
}

dependencies {
  	implementation("org.springframework.boot:spring-boot-starter-web")
	<% if(packaging === 'war') { %>
 	providedRuntime("org.springframework.boot:spring-boot-starter-tomcat")
	<% } %>
  	testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.withType<Test> {
  useJUnitPlatform()
}