package io.github.khalilou88.jnxplus

import org.gradle.testkit.runner.GradleRunner
import spock.lang.Specification
import spock.lang.TempDir

/**
 * A simple functional test for the 'io.github.khalilou88.jnxplus.projects' plugin.*/
class GradlePluginFunctionalTest extends Specification {
	@TempDir
	private File projectDir

	private getBuildFile() {
		new File(projectDir, "build.gradle")
	}

	private getSettingsFile() {
		new File(projectDir, "settings.gradle")
	}

	def "can run task"() {
		given:
		settingsFile << ""
		buildFile << """
plugins {
    id('io.github.khalilou88.jnxplus')
}
"""

		when:
		def runner = GradleRunner.create()
		runner.forwardOutput()
		runner.withPluginClasspath()
		runner.withArguments("projectDependencyTask", "--outputFile", "./build/example.json")
		runner.withProjectDir(projectDir)
		def result = runner.build()

		then:
		result.output.contains("Task ran for projectDependencyTask")
	}
}
