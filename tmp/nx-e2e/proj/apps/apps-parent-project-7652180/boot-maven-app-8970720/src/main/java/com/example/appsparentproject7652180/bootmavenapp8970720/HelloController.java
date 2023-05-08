package com.example.appsparentproject7652180.bootmavenapp8970720;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

  @GetMapping("/")
  public String greeting() {
    return "Hello World!";
  }
}
