package com.ssafya701.roundy.config;

import com.ssafya701.roundy.global.auth.PrincipalDetails;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springdoc.core.utils.SpringDocUtils;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class SwaggerConfig {

    static {
        SpringDocUtils.getConfig().addRequestWrapperToIgnore(PrincipalDetails.class);
    }

    @Bean
    public OpenAPI openAPI() {
        String jwt = "JWT";

        SecurityRequirement securityRequirement = new SecurityRequirement().addList(jwt);

        Components components = new Components().addSecuritySchemes(jwt, new SecurityScheme()
                .name(jwt)
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
        );

        Server localServer = new Server();
        localServer.setDescription("local");
        localServer.setUrl("http://localhost:8080");

        return new OpenAPI()
                .info(apiInfo())
                .addSecurityItem(securityRequirement)
                .components(components)
                .servers(List.of(localServer));
    }

    private Info apiInfo() {
        return new Info()
                .title("Roundy API Document")
                .description("SSAFY Roundy 프로젝트 API 명세서입니다.")
                .version("1.0.0");
    }
}