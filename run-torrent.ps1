# Start Infrastructure
Write-Host "Starting Infrastructure (PostgreSQL, Redis, Zookeeper, Kafka)..." -ForegroundColor Cyan
docker compose up -d

# Wait for infrastructure to be ready
Write-Host "Waiting 15 seconds for Kafka and PostgreSQL to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Pre-compile the project to ensure dependencies (common, grpc) are resolved
Write-Host "Compiling the project..." -ForegroundColor Cyan
mvn clean install -DskipTests

# Start Microservices in separate windows
Write-Host "Starting torrent-api on Port 8080..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd d:\Torrent; mvn spring-boot:run -pl torrent-api"

Write-Host "Starting torrent-worker on Port 8082 (gRPC on 9090)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd d:\Torrent; mvn spring-boot:run -pl torrent-worker"

Write-Host "Starting torrent-scheduler on Port 8083..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd d:\Torrent; mvn spring-boot:run -pl torrent-scheduler"

Write-Host "Starting torrent-admin on Port 8081..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd d:\Torrent; mvn spring-boot:run -pl torrent-admin"

Write-Host "All services have been instructed to start!" -ForegroundColor Cyan
Write-Host "Once the API is fully booted, you can access the Swagger UI at:" -ForegroundColor White
Write-Host "http://localhost:8080/swagger-ui/index.html" -ForegroundColor Yellow
