package com.jnxplus.deep.subdir.bootmavenapp4074304;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

  @GetMapping("/")
  public String greeting() {
    return "Hello World!";
  }
}
