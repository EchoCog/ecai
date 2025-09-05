# Database Architecture

## Overview

The liblab.ai platform implements a sophisticated multi-database architecture that supports connecting to and working with various database systems while maintaining security, performance, and scalability. The architecture separates the platform's internal database (Builder Database) from user-connected databases (Client Databases).

## Database Architecture Overview

```mermaid
graph TB
    subgraph "Application Layer"
        NEXT[Next.js App]
        API[API Gateway]
        PRISMA[Prisma ORM]
    end

    subgraph "Builder Infrastructure"
        BUILDERDB[(Builder Database<br/>PostgreSQL)]
        REDIS[(Redis Cache)]
        VAULT[Secure Vault<br/>Encrypted Storage]
    end

    subgraph "Connection Management"
        CONNPOOL[Connection Pool Manager]
        SCHEMASVC[Schema Service]
        QUERYSVC[Query Service]
        CACHESVC[Cache Service]
    end

    subgraph "Client Databases"
        subgraph "PostgreSQL"
            PG1[(Database 1)]
            PG2[(Database 2)]
            PG3[(Database N)]
        end

        subgraph "MySQL"
            MYSQL1[(Database 1)]
            MYSQL2[(Database 2)]
        end

        subgraph "MongoDB"
            MONGO1[(Database 1)]
            MONGO2[(Database 2)]
        end

        subgraph "SQLite"
            SQLITE1[(Database 1)]
            SQLITE2[(Database 2)]
        end
    end

    NEXT --> API
    API --> PRISMA
    PRISMA --> BUILDERDB

    API --> CONNPOOL
    API --> SCHEMASVC
    API --> QUERYSVC
    API --> CACHESVC

    CONNPOOL --> VAULT
    VAULT -.->|Encrypted Connections| PG1
    VAULT -.->|Encrypted Connections| PG2
    VAULT -.->|Encrypted Connections| PG3
    VAULT -.->|Encrypted Connections| MYSQL1
    VAULT -.->|Encrypted Connections| MYSQL2
    VAULT -.->|Encrypted Connections| MONGO1
    VAULT -.->|Encrypted Connections| MONGO2
    VAULT -.->|Encrypted Connections| SQLITE1
    VAULT -.->|Encrypted Connections| SQLITE2

    SCHEMASVC --> REDIS
    QUERYSVC --> REDIS

    classDef appLayer fill:#e1f5fe
    classDef builderInfra fill:#f3e5f5
    classDef connMgmt fill:#fff3e0
    classDef clientDbs fill:#e8f5e8

    class NEXT,API,PRISMA appLayer
    class BUILDERDB,REDIS,VAULT builderInfra
    class CONNPOOL,SCHEMASVC,QUERYSVC,CACHESVC connMgmt
    class PG1,PG2,PG3,MYSQL1,MYSQL2,MONGO1,MONGO2,SQLITE1,SQLITE2 clientDbs
```

## Builder Database Schema

The Builder Database stores all platform metadata, user data, and application configurations.

### Core Entities

```mermaid
erDiagram
    User {
        string id PK
        string email
        string name
        datetime createdAt
        datetime updatedAt
        boolean isActive
    }

    Organization {
        string id PK
        string name
        string slug
        datetime createdAt
        datetime updatedAt
    }

    Environment {
        string id PK
        string name
        string organizationId FK
        string description
        datetime createdAt
        datetime updatedAt
    }

    DataSource {
        string id PK
        string name
        string type
        string environmentId FK
        string connectionStringId FK
        json metadata
        datetime createdAt
        datetime updatedAt
    }

    Conversation {
        string id PK
        string environmentId FK
        string userId FK
        string title
        json context
        datetime createdAt
        datetime updatedAt
    }

    Message {
        string id PK
        string conversationId FK
        string role
        text content
        json metadata
        datetime createdAt
    }

    Website {
        string id PK
        string conversationId FK
        string name
        string domain
        string deploymentUrl
        json configuration
        datetime createdAt
        datetime updatedAt
    }

    Snapshot {
        string id PK
        string messageId FK
        string fileSystemState
        json metadata
        datetime createdAt
    }

    Role {
        string id PK
        string name
        string description
        string scope
        datetime createdAt
    }

    Permission {
        string id PK
        string roleId FK
        string resource
        string action
        datetime createdAt
    }

    User ||--o{ Conversation : creates
    Organization ||--o{ Environment : contains
    Environment ||--o{ DataSource : has
    Environment ||--o{ Conversation : belongs_to
    Conversation ||--o{ Message : contains
    Conversation ||--o{ Website : generates
    Message ||--o{ Snapshot : has
    Role ||--o{ Permission : has
    User }|--|| Role : assigned
```

## Database Connection Patterns

### Connection Lifecycle

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Vault
    participant ConnPool
    participant ClientDB
    participant Cache

    Note over User,Cache: Database Connection Setup
    User->>Frontend: Provide DB credentials
    Frontend->>API: POST /api/data-sources
    API->>Vault: Encrypt and store credentials
    Vault-->>API: Credentials stored securely

    Note over API,ClientDB: Connection Testing
    API->>ConnPool: Test connection
    ConnPool->>ClientDB: Establish connection
    ClientDB-->>ConnPool: Connection successful
    ConnPool-->>API: Connection validated

    Note over API,Cache: Schema Discovery
    API->>ClientDB: Introspect schema
    ClientDB-->>API: Schema metadata
    API->>Cache: Store schema in Redis
    Cache-->>API: Schema cached
    API-->>Frontend: Connection established

    Note over User,Cache: Query Execution
    User->>Frontend: Execute query
    Frontend->>API: POST /api/execute-query
    API->>Cache: Check query cache

    alt Cache Hit
        Cache-->>API: Return cached result
    else Cache Miss
        API->>ConnPool: Get connection
        ConnPool->>ClientDB: Execute query
        ClientDB-->>ConnPool: Query result
        ConnPool-->>API: Return result
        API->>Cache: Cache result
    end

    API-->>Frontend: Query result
    Frontend-->>User: Display data
```

### Query Execution Architecture

```mermaid
graph LR
    subgraph "Query Processing Pipeline"
        PARSE[Query Parser]
        VALIDATE[Validator]
        OPTIMIZE[Query Optimizer]
        EXECUTE[Query Executor]
        FORMAT[Result Formatter]
    end

    subgraph "Security Layer"
        AUTHZ[Authorization Check]
        SANITIZE[SQL Injection Protection]
        RATELIMIT[Rate Limiting]
    end

    subgraph "Performance Layer"
        QUERYCACHE[Query Cache]
        CONNPOOL[Connection Pool]
        METRICS[Performance Metrics]
    end

    INPUT[Raw Query] --> PARSE
    PARSE --> VALIDATE
    VALIDATE --> AUTHZ
    AUTHZ --> SANITIZE
    SANITIZE --> RATELIMIT
    RATELIMIT --> OPTIMIZE
    OPTIMIZE --> QUERYCACHE

    QUERYCACHE --> EXECUTE
    EXECUTE --> CONNPOOL
    CONNPOOL --> FORMAT
    FORMAT --> METRICS
    METRICS --> OUTPUT[Query Result]

    classDef processing fill:#e1f5fe
    classDef security fill:#ffebee
    classDef performance fill:#f3e5f5

    class PARSE,VALIDATE,OPTIMIZE,EXECUTE,FORMAT processing
    class AUTHZ,SANITIZE,RATELIMIT security
    class QUERYCACHE,CONNPOOL,METRICS performance
```

## Multi-Database Support

### Database Type Abstraction

```mermaid
classDiagram
    class DatabaseAdapter {
        <<interface>>
        +connect() Promise~Connection~
        +disconnect() void
        +executeQuery(query: string) Promise~Result~
        +getSchema() Promise~Schema~
        +validateConnection() Promise~boolean~
    }

    class PostgreSQLAdapter {
        -pgClient: Client
        +connect() Promise~Connection~
        +disconnect() void
        +executeQuery(query: string) Promise~Result~
        +getSchema() Promise~Schema~
        +validateConnection() Promise~boolean~
    }

    class MySQLAdapter {
        -mysqlClient: Connection
        +connect() Promise~Connection~
        +disconnect() void
        +executeQuery(query: string) Promise~Result~
        +getSchema() Promise~Schema~
        +validateConnection() Promise~boolean~
    }

    class MongoDBAdapter {
        -mongoClient: MongoClient
        +connect() Promise~Connection~
        +disconnect() void
        +executeQuery(query: string) Promise~Result~
        +getSchema() Promise~Schema~
        +validateConnection() Promise~boolean~
    }

    class SQLiteAdapter {
        -sqliteDb: Database
        +connect() Promise~Connection~
        +disconnect() void
        +executeQuery(query: string) Promise~Result~
        +getSchema() Promise~Schema~
        +validateConnection() Promise~boolean~
    }

    DatabaseAdapter <|-- PostgreSQLAdapter
    DatabaseAdapter <|-- MySQLAdapter
    DatabaseAdapter <|-- MongoDBAdapter
    DatabaseAdapter <|-- SQLiteAdapter
```

### Connection Pool Management

```mermaid
graph TB
    subgraph "Connection Pool Manager"
        POOL[Pool Registry]
        CONFIG[Pool Configuration]
        HEALTH[Health Monitor]
        METRICS[Pool Metrics]
    end

    subgraph "PostgreSQL Pools"
        PG_POOL1[Pool 1<br/>Min: 5, Max: 20]
        PG_POOL2[Pool 2<br/>Min: 3, Max: 15]
    end

    subgraph "MySQL Pools"
        MYSQL_POOL1[Pool 1<br/>Min: 2, Max: 10]
    end

    subgraph "MongoDB Pools"
        MONGO_POOL1[Pool 1<br/>Min: 3, Max: 12]
    end

    POOL --> CONFIG
    CONFIG --> PG_POOL1
    CONFIG --> PG_POOL2
    CONFIG --> MYSQL_POOL1
    CONFIG --> MONGO_POOL1

    HEALTH --> PG_POOL1
    HEALTH --> PG_POOL2
    HEALTH --> MYSQL_POOL1
    HEALTH --> MONGO_POOL1

    METRICS --> POOL

    classDef poolMgmt fill:#e1f5fe
    classDef pools fill:#f3e5f5

    class POOL,CONFIG,HEALTH,METRICS poolMgmt
    class PG_POOL1,PG_POOL2,MYSQL_POOL1,MONGO_POOL1 pools
```

## Schema Management

### Schema Discovery Process

```mermaid
sequenceDiagram
    participant SchemaService
    participant DatabaseAdapter
    participant ClientDB
    participant Cache
    participant AI_Service

    Note over SchemaService,AI_Service: Schema Discovery Flow
    SchemaService->>DatabaseAdapter: getSchema()
    DatabaseAdapter->>ClientDB: INFORMATION_SCHEMA queries
    ClientDB-->>DatabaseAdapter: Raw schema data
    DatabaseAdapter->>DatabaseAdapter: Parse and normalize
    DatabaseAdapter-->>SchemaService: Normalized schema

    SchemaService->>Cache: Store schema metadata
    Cache-->>SchemaService: Schema cached

    SchemaService->>AI_Service: Generate schema description
    AI_Service-->>SchemaService: Human-readable schema
    SchemaService->>Cache: Store AI description

    SchemaService-->>API: Schema ready for use
```

### Schema Caching Strategy

```mermaid
graph TB
    subgraph "Cache Layers"
        L1[L1: In-Memory<br/>Schema Objects]
        L2[L2: Redis<br/>Serialized Schema]
        L3[L3: Builder DB<br/>Schema Metadata]
    end

    subgraph "Cache Invalidation"
        TTL[Time-based TTL<br/>15 minutes]
        EVENT[Event-based<br/>Schema Changes]
        MANUAL[Manual<br/>User Refresh]
    end

    subgraph "Cache Warming"
        PRELOAD[Startup Preload]
        BACKGROUND[Background Refresh]
        LAZY[Lazy Loading]
    end

    L1 --> L2
    L2 --> L3

    TTL --> L1
    EVENT --> L1
    MANUAL --> L1

    PRELOAD --> L1
    BACKGROUND --> L1
    LAZY --> L1

    classDef cache fill:#e1f5fe
    classDef invalidation fill:#ffebee
    classDef warming fill:#f3e5f5

    class L1,L2,L3 cache
    class TTL,EVENT,MANUAL invalidation
    class PRELOAD,BACKGROUND,LAZY warming
```

## Performance Optimizations

### Query Optimization Strategies

1. **Query Caching**: Redis-based caching of frequently executed queries
2. **Connection Pooling**: Efficient reuse of database connections
3. **Schema Caching**: Avoid repeated schema introspection
4. **Prepared Statements**: Reusable compiled query plans
5. **Result Streaming**: Stream large result sets to avoid memory issues

### Monitoring & Metrics

```mermaid
graph LR
    subgraph "Database Metrics"
        CONN[Connection Count]
        QUERY[Query Performance]
        CACHE[Cache Hit Rate]
        ERROR[Error Rate]
    end

    subgraph "Performance Metrics"
        LATENCY[Query Latency]
        THROUGHPUT[Queries/Second]
        POOL[Pool Utilization]
        MEMORY[Memory Usage]
    end

    subgraph "Health Metrics"
        AVAILABILITY[Database Availability]
        REPLICATION[Replication Lag]
        STORAGE[Storage Usage]
        BACKUP[Backup Status]
    end

    CONN --> DASHBOARD[Monitoring Dashboard]
    QUERY --> DASHBOARD
    CACHE --> DASHBOARD
    ERROR --> DASHBOARD
    LATENCY --> DASHBOARD
    THROUGHPUT --> DASHBOARD
    POOL --> DASHBOARD
    MEMORY --> DASHBOARD
    AVAILABILITY --> DASHBOARD
    REPLICATION --> DASHBOARD
    STORAGE --> DASHBOARD
    BACKUP --> DASHBOARD

    classDef dbMetrics fill:#e1f5fe
    classDef perfMetrics fill:#f3e5f5
    classDef healthMetrics fill:#fff3e0

    class CONN,QUERY,CACHE,ERROR dbMetrics
    class LATENCY,THROUGHPUT,POOL,MEMORY perfMetrics
    class AVAILABILITY,REPLICATION,STORAGE,BACKUP healthMetrics
```

## Security Considerations

### Connection Security

1. **Encrypted Storage**: All connection strings encrypted in Vault
2. **TLS/SSL**: Encrypted connections to all client databases
3. **Credential Rotation**: Automatic rotation of database credentials
4. **Network Isolation**: VPC and firewall rules for database access
5. **Audit Logging**: Complete audit trail of database operations

### Access Control

1. **Role-based Access**: Fine-grained permissions per database
2. **Query Whitelisting**: Approved query patterns only
3. **Data Masking**: Sensitive data masking in development environments
4. **Row-level Security**: Database-native security policies
5. **Rate Limiting**: Prevent abuse and DoS attacks

## Backup & Recovery

### Backup Strategies

1. **Automated Backups**: Regular snapshots of Builder Database
2. **Point-in-time Recovery**: Transaction log backups
3. **Cross-region Replication**: Geographic backup distribution
4. **Schema Versioning**: Track schema changes over time
5. **Disaster Recovery**: Complete system recovery procedures

This database architecture ensures secure, scalable, and performant access to multiple database systems while maintaining data integrity and user privacy.
