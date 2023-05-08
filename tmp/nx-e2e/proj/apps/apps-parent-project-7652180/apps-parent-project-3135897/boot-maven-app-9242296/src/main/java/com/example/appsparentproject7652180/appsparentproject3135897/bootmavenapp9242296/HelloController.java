package com.example.appsparentproject7652180.appsparentproject3135897.bootmavenapp9242296;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

  @GetMapping("/")
  public String greeting() {
    return "Hello World!";
  }
}
