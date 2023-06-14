package <%= packageName %>;

import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class GreetingService  {

    public String greeting() {
        return "Hello World!";
    }
}
