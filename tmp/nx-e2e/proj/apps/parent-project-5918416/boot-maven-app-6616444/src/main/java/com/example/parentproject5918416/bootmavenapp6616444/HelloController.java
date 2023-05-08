package com.example.parentproject5918416.bootmavenapp6616444;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

  @GetMapping("/")
  public String greeting() {
    return "Hello World!";
  }
}
