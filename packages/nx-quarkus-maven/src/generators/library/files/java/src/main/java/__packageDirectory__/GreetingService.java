package <%= packageName %>;

import javax.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class GreetingService  {

    public String greeting() {
        return "Hello World!";
    }
}
