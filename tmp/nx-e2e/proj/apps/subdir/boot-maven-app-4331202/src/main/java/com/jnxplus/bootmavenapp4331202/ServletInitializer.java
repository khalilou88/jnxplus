package com.jnxplus.bootmavenapp4331202;

import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;

public class ServletInitializer extends SpringBootServletInitializer {

  @Override
  protected SpringApplicationBuilder configure(
    SpringApplicationBuilder application
  ) {
    return application.sources(SubdirBootMavenApp4331202Application.class);
  }
}
