package <%= packageName %>;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class <%= applicationClassName %> {

  public static void main(String[] args) {
    SpringApplication.run(<%= applicationClassName %>.class, args);
  }

}
