package io.github.khalilou88.jnxplus

import org.gradle.testfixtures.ProjectBuilder
import spock.lang.Specification

/**
 * A simple unit test for the 'gradle.plugin.greeting' plugin.*/
class GradlePluginTest extends Specification {
	def "plugin registers task"() {
		given:
		def project = ProjectBuilder.builder().build()

		when:
		project.plugins.apply("io.github.khalilou88.jnxplus")

		then:
		project.tasks.findByName("projectDependencyTask") != null
	}
}
