package dev.torrent.api.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class ApiKeyInterceptor implements HandlerInterceptor {

    @Value("${torrent.api.key}")
    private String apiKey;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // Only protect POST /api/v1/jobs to not break SSE feed for now
        if ("POST".equalsIgnoreCase(request.getMethod()) && request.getRequestURI().startsWith("/api/v1/jobs")) {
            String authHeader = request.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                response.sendError(HttpStatus.UNAUTHORIZED.value(), "Missing Authorization Header");
                return false;
            }

            String token = authHeader.substring(7);
            if (!apiKey.equals(token)) {
                response.sendError(HttpStatus.UNAUTHORIZED.value(), "Invalid API Key");
                return false;
            }
        }
        return true;
    }
}
