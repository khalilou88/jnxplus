/*
 * This Groovy source file was generated by the Gradle 'init' task.
 */
package jnxplus.gradle.plugin

import org.gradle.testfixtures.ProjectBuilder
import spock.lang.Specification

/**
 * A simple unit test for the 'gradle.plugin.greeting' plugin.
 */
class GradlePluginPluginTest extends Specification {
    def "plugin registers task"() {
        given:
        def project = ProjectBuilder.builder().build()

        when:
        project.plugins.apply("jnxplus.gradle.plugin")

        then:
        project.tasks.findByName("projectGraph") != null
    }
}
