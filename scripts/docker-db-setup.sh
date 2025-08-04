#!/bin/bash

# Database setup script for PostgreSQL in Docker

# Detect which Docker Compose command is available
detect_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    elif docker compose version &> /dev/null; then
        echo "docker compose"
    else
        echo "❌ Neither 'docker-compose' nor 'docker compose' is available!"
        exit 1
    fi
}

# Set the Docker Compose command
DOCKER_COMPOSE_CMD=$(detect_docker_compose)
echo "📦 Using Docker Compose command: $DOCKER_COMPOSE_CMD"

echo "🗄️  Setting up PostgreSQL database..."

# Check if docker-compose.dev.yml exists
if [ ! -f "docker-compose.dev.yml" ]; then
    echo "❌ docker-compose.dev.yml not found!"
    exit 1
fi

# Start the database service only
echo "🚀 Starting PostgreSQL database..."
$DOCKER_COMPOSE_CMD -f docker-compose.dev.yml up -d postgres

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until $DOCKER_COMPOSE_CMD -f docker-compose.dev.yml exec -T postgres pg_isready -U liblab -d liblab -q; do
	  echo "Waiting for PostgreSQL to be ready..."
	  sleep 2
done

# Run database migrations
echo "🔄 Running database migrations..."
$DOCKER_COMPOSE_CMD -f docker-compose.dev.yml exec ai-app-dev pnpm prisma migrate deploy

# Generate Prisma client
echo "🔧 Generating Prisma client..."
$DOCKER_COMPOSE_CMD -f docker-compose.dev.yml exec ai-app-dev pnpm prisma generate

# Seed the database (if seed script exists)
if [ -f "prisma/seed.ts" ]; then
    echo "🌱 Seeding database..."
    $DOCKER_COMPOSE_CMD -f docker-compose.dev.yml exec ai-app-dev pnpm prisma db seed
fi

echo "✅ Database setup complete!"
echo "📊 PostgreSQL is running on localhost:5432"
echo "🔗 Connection: postgresql://liblab:liblab_password@localhost:5432/liblab"
