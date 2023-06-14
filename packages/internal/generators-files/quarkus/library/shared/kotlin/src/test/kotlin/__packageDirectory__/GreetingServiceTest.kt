package <%= packageName %>

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test
import io.quarkus.test.junit.QuarkusTest
import jakarta.inject.Inject


@QuarkusTest
class GreetingServiceTest {


  @Inject
  lateinit var greetingService: GreetingService


  @Test
  fun `Should return Hello World`() {
    println(">> Should return Hello World")
    Assertions.assertTrue(greetingService.greeting().contains("Hello World"));
  }


}

