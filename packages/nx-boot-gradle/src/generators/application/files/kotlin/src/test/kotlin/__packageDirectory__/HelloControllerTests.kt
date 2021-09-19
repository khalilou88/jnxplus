package <%= packageName %>

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.client.TestRestTemplate
import org.springframework.boot.test.web.client.getForEntity
import org.springframework.http.HttpStatus

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class HelloControllerTests(@Autowired val restTemplate: TestRestTemplate) {

  @BeforeAll
  fun setup() {
    println(">> Setup")
  }

  @Test
  fun `Should return Hello World`() {
    println(">> Should return Hello World")
    val entity = restTemplate.getForEntity<String>("/")
    assertThat(entity.statusCode).isEqualTo(HttpStatus.OK)
    assertThat(entity.body).contains("Hello World")
  }


  @AfterAll
  fun teardown() {
    println(">> Tear down")
  }

}
