package <%= packageName %>;

import jakarta.inject.Singleton;

@Singleton
public class HelloService  {

  public String greeting() {
    return "Hello World";
  }
}
