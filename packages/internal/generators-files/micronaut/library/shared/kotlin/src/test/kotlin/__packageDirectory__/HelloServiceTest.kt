package <%= packageName %>

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test
import io.micronaut.test.extensions.junit5.annotation.MicronautTest
import jakarta.inject.Inject


@MicronautTest
class HelloServiceTest {


  @Inject
  lateinit var service: HelloService


  @Test
  fun `Should return Hello World`() {
    println(">> Should return Hello World")
    Assertions.assertTrue(service.greeting().contains("Hello World"));
  }


}

