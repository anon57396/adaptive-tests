package fixtures.java.annotations;

import org.springframework.stereotype.*;
import org.springframework.beans.factory.annotation.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.boot.autoconfigure.*;
import org.springframework.context.annotation.*;
import org.springframework.transaction.annotation.*;
import javax.persistence.*;
import javax.validation.constraints.*;
import javax.inject.*;
import org.junit.jupiter.api.*;
import org.mockito.*;
import lombok.*;

/**
 * Framework-specific annotation fixtures for popular Java frameworks
 */
public class FrameworkAnnotations {

    // Spring Framework annotations
    @Component
    public static class SpringComponent {
        @Autowired
        private ServiceClass service;

        @Value("${app.property}")
        private String configValue;

        @PostConstruct
        public void init() {
            System.out.println("Initialized");
        }

        @PreDestroy
        public void cleanup() {
            System.out.println("Cleanup");
        }
    }

    @Service
    public static class ServiceClass {
        @Autowired
        private RepositoryClass repository;

        @Transactional
        public void performTransaction() {
            // Transactional operation
        }

        @Cacheable("users")
        public User getUser(Long id) {
            return repository.findById(id);
        }
    }

    @Repository
    public static class RepositoryClass {
        @PersistenceContext
        private EntityManager entityManager;

        public User findById(Long id) {
            return entityManager.find(User.class, id);
        }
    }

    @RestController
    @RequestMapping("/api/users")
    public static class RestControllerExample {

        @GetMapping("/{id}")
        public User getUser(@PathVariable Long id) {
            return new User(id, "John");
        }

        @PostMapping
        public User createUser(@RequestBody @Valid User user) {
            return user;
        }

        @PutMapping("/{id}")
        public User updateUser(
            @PathVariable Long id,
            @RequestBody User user
        ) {
            user.setId(id);
            return user;
        }

        @DeleteMapping("/{id}")
        @ResponseStatus(HttpStatus.NO_CONTENT)
        public void deleteUser(@PathVariable Long id) {
            // Delete logic
        }

        @ExceptionHandler(Exception.class)
        public ResponseEntity<String> handleException(Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    // JPA/Hibernate annotations
    @Entity
    @Table(name = "users")
    @NamedQueries({
        @NamedQuery(name = "User.findAll", query = "SELECT u FROM User u"),
        @NamedQuery(name = "User.findByName", query = "SELECT u FROM User u WHERE u.name = :name")
    })
    public static class User {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @Column(nullable = false, length = 100)
        @NotNull
        @Size(min = 1, max = 100)
        private String name;

        @Column(unique = true)
        @Email
        private String email;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "department_id")
        private Department department;

        @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
        private List<Order> orders;

        @Temporal(TemporalType.TIMESTAMP)
        private Date createdAt;

        @Version
        private Long version;

        @Transient
        private String tempField;

        // Constructors
        public User() {}

        public User(Long id, String name) {
            this.id = id;
            this.name = name;
        }

        // Getters and setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
    }

    @Entity
    @Table(name = "departments")
    public static class Department {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @Column(nullable = false)
        private String name;

        @OneToMany(mappedBy = "department")
        private List<User> users;
    }

    @Entity
    @Table(name = "orders")
    public static class Order {
        @Id
        @GeneratedValue(strategy = GenerationType.UUID)
        private String id;

        @ManyToOne
        @JoinColumn(name = "user_id")
        private User user;

        @ElementCollection
        @CollectionTable(name = "order_items")
        private List<String> items;

        @Enumerated(EnumType.STRING)
        private OrderStatus status;

        public enum OrderStatus {
            PENDING, PROCESSING, COMPLETED, CANCELLED
        }
    }

    // Validation annotations
    public static class ValidationExample {
        @NotNull(message = "Name cannot be null")
        @Size(min = 2, max = 50)
        private String name;

        @Min(0)
        @Max(150)
        private int age;

        @Email(message = "Invalid email format")
        private String email;

        @Pattern(regexp = "^[0-9]{10}$", message = "Phone must be 10 digits")
        private String phone;

        @Past
        private Date birthDate;

        @Future
        private Date appointmentDate;

        @DecimalMin("0.0")
        @DecimalMax("999999.99")
        private BigDecimal amount;

        @AssertTrue(message = "Must accept terms")
        private boolean acceptedTerms;

        @Valid
        @NotNull
        private Address address;
    }

    // Lombok annotations
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LombokExample {
        private Long id;
        private String name;

        @Getter(AccessLevel.NONE)
        @Setter(AccessLevel.NONE)
        private String internalField;

        @ToString.Exclude
        private String password;

        @EqualsAndHashCode.Exclude
        private Date timestamp;
    }

    @Value
    @Builder
    public static class ImmutableClass {
        Long id;
        String name;
        @With String description;
    }

    // JUnit 5 annotations
    @TestInstance(TestInstance.Lifecycle.PER_CLASS)
    public static class JUnitTestExample {

        @Mock
        private ServiceClass mockService;

        @Spy
        private RepositoryClass spyRepository;

        @InjectMocks
        private ControllerClass controller;

        @BeforeAll
        public void setupAll() {
            System.out.println("Setup all tests");
        }

        @BeforeEach
        public void setup() {
            MockitoAnnotations.openMocks(this);
        }

        @Test
        @DisplayName("Test successful operation")
        public void testSuccess() {
            // Test logic
        }

        @ParameterizedTest
        @ValueSource(strings = {"test1", "test2", "test3"})
        public void parameterizedTest(String value) {
            // Test with parameter
        }

        @RepeatedTest(3)
        public void repeatedTest() {
            // Test repeated 3 times
        }

        @Test
        @Disabled("Not implemented yet")
        public void disabledTest() {
            // Disabled test
        }

        @AfterEach
        public void teardown() {
            // Cleanup after each test
        }

        @AfterAll
        public void teardownAll() {
            // Final cleanup
        }
    }

    // CDI (Contexts and Dependency Injection) annotations
    @Named("customBean")
    @ApplicationScoped
    public static class CDIBean {

        @Inject
        private AnotherBean dependency;

        @Inject
        @Qualifier
        private SpecialBean specialBean;

        @Produces
        @RequestScoped
        public SessionBean createSessionBean() {
            return new SessionBean();
        }

        @PostConstruct
        public void init() {
            // Initialization
        }

        @PreDestroy
        public void destroy() {
            // Cleanup
        }
    }

    // Custom qualifier annotation
    @Qualifier
    @Retention(RetentionPolicy.RUNTIME)
    @Target({ElementType.FIELD, ElementType.METHOD, ElementType.TYPE})
    public @interface Special {}

    // Configuration annotations
    @Configuration
    @EnableAutoConfiguration
    @ComponentScan(basePackages = "com.example")
    @PropertySource("classpath:application.properties")
    @Profile("development")
    public static class ConfigurationClass {

        @Bean
        @Primary
        @Scope("prototype")
        @Conditional(OnPropertyCondition.class)
        public ServiceClass serviceBean() {
            return new ServiceClass();
        }

        @Bean
        @Lazy
        @DependsOn("serviceBean")
        public RepositoryClass repositoryBean() {
            return new RepositoryClass();
        }
    }
}