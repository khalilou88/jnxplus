package <%= packageName %>

import org.assertj.core.api.Assertions.assertThat

import io.quarkus.test.junit.QuarkusTest
import javax.inject.Inject


@SpringBootTest
class GreetingServiceTest {


@Inject
greetingService: GreetingService


  @Test
  fun `Should return Hello World`() {
    println(">> Should return Hello World")
    assertThat(greetingService.greeting()).contains("Hello World")
  }




}
