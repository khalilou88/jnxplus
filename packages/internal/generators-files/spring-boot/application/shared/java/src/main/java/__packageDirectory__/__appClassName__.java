package <%= packageName %>;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication<% if(!minimal) { %>(scanBasePackages = "<%= basePackage %>")<% } %>
public class <%= appClassName %> {

  public static void main(String[] args) {
    SpringApplication.run(<%= appClassName %>.class, args);
  }

}
