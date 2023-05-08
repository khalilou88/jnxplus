package com.example.bootmavenlib722461;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class HelloServiceTests {

  @Autowired
  private HelloService helloService;

  @Test
  public void shouldReturnHelloWorld() {
    assertThat(helloService.message()).contains("Hello World");
  }
}
