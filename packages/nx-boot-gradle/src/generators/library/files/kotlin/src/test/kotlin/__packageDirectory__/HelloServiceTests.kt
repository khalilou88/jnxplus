package <%= packageName %>

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest


@SpringBootTest
class HelloServiceTests(@Autowired val helloService: HelloService) {

  @BeforeAll
  fun setup() {
    println(">> Setup")
  }

  @Test
  fun `Should return Hello World`() {
    println(">> Should return Hello World")
    assertThat(helloService.message()).contains("Hello World")
  }


  @AfterAll
  fun teardown() {
    println(">> Tear down")
  }


}
