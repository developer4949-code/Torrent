package dev.torrent.api.integration;

import dev.torrent.common.domain.JobPriority;
import dev.torrent.api.dto.JobRequestDto;
import dev.torrent.api.dto.JobResponseDto;
import dev.torrent.api.dto.RetryPolicyDto;
import dev.torrent.api.dto.ScheduleDto;
import dev.torrent.common.repository.JobRepository;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.notNullValue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
public class JobSubmissionIT {

    @LocalServerPort
    private int port;

    @Autowired
    private JobRepository jobRepository;
    
    @Autowired
    private ObjectMapper objectMapper;

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        jobRepository.deleteAll();
    }

    @Test
    void testSuccessfulJobCreationReturns201() {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("customerId", "C123");
        
        JobRequestDto request = new JobRequestDto(
                "key-1",
                "INVOICE_GENERATION",
                payload,
                new ScheduleDto("CRON", "0 9 * * MON"),
                JobPriority.HIGH,
                new RetryPolicyDto(3, 2.0, 300),
                120
        );

        given()
                .contentType(ContentType.JSON)
                .body(request)
                .when()
                .post("/api/v1/jobs")
                .then()
                .statusCode(201)
                .body("id", notNullValue());

        assertThat(jobRepository.findByIdempotencyKey("key-1")).isPresent();
    }

    @Test
    void testDuplicateIdempotencyKeyReturns200WithSameJobId() {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("customerId", "C123");
        
        JobRequestDto request = new JobRequestDto(
                "key-2",
                "INVOICE_GENERATION",
                payload,
                new ScheduleDto("CRON", "0 9 * * MON"),
                JobPriority.HIGH,
                new RetryPolicyDto(3, 2.0, 300),
                120
        );

        JobResponseDto response1 = given()
                .contentType(ContentType.JSON)
                .body(request)
                .when()
                .post("/api/v1/jobs")
                .then()
                .statusCode(201)
                .extract()
                .as(JobResponseDto.class);

        JobResponseDto response2 = given()
                .contentType(ContentType.JSON)
                .body(request)
                .when()
                .post("/api/v1/jobs")
                .then()
                .statusCode(200)
                .extract()
                .as(JobResponseDto.class);

        assertThat(response1.id()).isEqualTo(response2.id());
    }

    @Test
    void testInvalidCronExpressionReturns400() {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("customerId", "C123");
        
        JobRequestDto request = new JobRequestDto(
                "key-3",
                "INVOICE_GENERATION",
                payload,
                new ScheduleDto("CRON", "invalid-cron"),
                JobPriority.HIGH,
                new RetryPolicyDto(3, 2.0, 300),
                120
        );

        given()
                .contentType(ContentType.JSON)
                .body(request)
                .when()
                .post("/api/v1/jobs")
                .then()
                .statusCode(400);
    }
}
