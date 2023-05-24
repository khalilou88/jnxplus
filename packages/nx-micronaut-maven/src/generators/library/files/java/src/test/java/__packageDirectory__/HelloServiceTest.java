package <%= packageName %>;

import jakarta.inject.Inject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import io.micronaut.test.extensions.junit5.annotation.MicronautTest;

@MicronautTest
public class HelloServiceTest {

    @Inject
    HelloService service;

    @Test
    public void testGreetingService() {
        Assertions.assertEquals("Hello World", service.greeting());
    }
}
