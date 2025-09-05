# Authentication & Security Architecture

## Overview

The liblab.ai platform implements a comprehensive security model that protects user data, secures database connections, and maintains the integrity of the AI-powered development environment. The architecture follows security-first principles with multiple layers of protection and defense-in-depth strategies.

## Security Architecture Overview

```mermaid
graph TB
    subgraph "External Layer"
        CDN[CDN/WAF]
        LB[Load Balancer]
        TUNNEL[Cloudflare Tunnel]
    end

    subgraph "Authentication Layer"
        AUTH[Better Auth]
        OAUTH[OAuth Providers]
        MFA[Multi-Factor Auth]
        SESSION[Session Management]
    end

    subgraph "Authorization Layer"
        RBAC[Role-Based Access Control]
        PERMS[Permissions Engine]
        CASL[CASL Authorization]
        POLICIES[Security Policies]
    end

    subgraph "Application Security"
        MIDDLEWARE[Security Middleware]
        CORS[CORS Configuration]
        CSP[Content Security Policy]
        RATELIMIT[Rate Limiting]
    end

    subgraph "Data Security"
        VAULT[Secure Vault]
        ENCRYPTION[Encryption Engine]
        SECRETS[Secret Management]
        KEYROTATION[Key Rotation]
    end

    subgraph "Network Security"
        TLS[TLS/SSL Termination]
        VPC[Virtual Private Cloud]
        FIREWALL[Firewall Rules]
        IDS[Intrusion Detection]
    end

    subgraph "Audit & Monitoring"
        LOGGING[Security Logging]
        SIEM[SIEM Integration]
        ALERTS[Alert System]
        COMPLIANCE[Compliance Reporting]
    end

    CDN --> LB
    LB --> TUNNEL
    TUNNEL --> AUTH

    AUTH --> OAUTH
    AUTH --> MFA
    AUTH --> SESSION

    SESSION --> RBAC
    RBAC --> PERMS
    PERMS --> CASL
    CASL --> POLICIES

    POLICIES --> MIDDLEWARE
    MIDDLEWARE --> CORS
    CORS --> CSP
    CSP --> RATELIMIT

    RATELIMIT --> VAULT
    VAULT --> ENCRYPTION
    ENCRYPTION --> SECRETS
    SECRETS --> KEYROTATION

    KEYROTATION --> TLS
    TLS --> VPC
    VPC --> FIREWALL
    FIREWALL --> IDS

    IDS --> LOGGING
    LOGGING --> SIEM
    SIEM --> ALERTS
    ALERTS --> COMPLIANCE

    classDef external fill:#ffebee
    classDef auth fill:#e8f5e8
    classDef authz fill:#f3e5f5
    classDef appsec fill:#e1f5fe
    classDef datasec fill:#fff3e0
    classDef netsec fill:#fce4ec
    classDef audit fill:#f1f8e9

    class CDN,LB,TUNNEL external
    class AUTH,OAUTH,MFA,SESSION auth
    class RBAC,PERMS,CASL,POLICIES authz
    class MIDDLEWARE,CORS,CSP,RATELIMIT appsec
    class VAULT,ENCRYPTION,SECRETS,KEYROTATION datasec
    class TLS,VPC,FIREWALL,IDS netsec
    class LOGGING,SIEM,ALERTS,COMPLIANCE audit
```

## Authentication System

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant AuthService
    participant OAuth
    participant Database
    participant Session

    Note over User,Session: User Registration/Login Flow
    User->>Frontend: Access protected resource
    Frontend->>AuthService: Check authentication
    AuthService-->>Frontend: Not authenticated
    Frontend->>User: Redirect to login

    User->>Frontend: Choose OAuth provider
    Frontend->>OAuth: Initiate OAuth flow
    OAuth->>User: Provider authentication
    User->>OAuth: Provide credentials
    OAuth-->>Frontend: Authorization code

    Frontend->>AuthService: Exchange code for tokens
    AuthService->>OAuth: Verify authorization code
    OAuth-->>AuthService: User profile
    AuthService->>Database: Store/update user
    Database-->>AuthService: User stored

    AuthService->>Session: Create session
    Session-->>AuthService: Session token
    AuthService-->>Frontend: Authentication tokens
    Frontend-->>User: Access granted

    Note over User,Session: Subsequent Requests
    User->>Frontend: Make authenticated request
    Frontend->>AuthService: Validate session
    AuthService->>Session: Check session validity
    Session-->>AuthService: Session valid
    AuthService-->>Frontend: User authenticated
    Frontend-->>User: Request processed
```

### Multi-Factor Authentication

```mermaid
graph TB
    LOGIN[User Login] --> PRIMARY[Primary Authentication]

    PRIMARY --> EMAIL{Email Verification}
    PRIMARY --> OAUTH{OAuth Provider}

    EMAIL -->|Success| MFA_CHECK{MFA Required?}
    OAUTH -->|Success| MFA_CHECK

    MFA_CHECK -->|No| SUCCESS[Authentication Success]
    MFA_CHECK -->|Yes| MFA_METHOD{MFA Method}

    MFA_METHOD --> TOTP[TOTP Authenticator]
    MFA_METHOD --> SMS[SMS Code]
    MFA_METHOD --> EMAIL_CODE[Email Code]
    MFA_METHOD --> BACKUP[Backup Codes]

    TOTP --> VERIFY_TOTP{Verify TOTP}
    SMS --> VERIFY_SMS{Verify SMS}
    EMAIL_CODE --> VERIFY_EMAIL{Verify Email}
    BACKUP --> VERIFY_BACKUP{Verify Backup Code}

    VERIFY_TOTP -->|Valid| SUCCESS
    VERIFY_SMS -->|Valid| SUCCESS
    VERIFY_EMAIL -->|Valid| SUCCESS
    VERIFY_BACKUP -->|Valid| SUCCESS

    VERIFY_TOTP -->|Invalid| RETRY[Retry MFA]
    VERIFY_SMS -->|Invalid| RETRY
    VERIFY_EMAIL -->|Invalid| RETRY
    VERIFY_BACKUP -->|Invalid| RETRY

    RETRY --> ATTEMPT_COUNT{Attempts < 3?}
    ATTEMPT_COUNT -->|Yes| MFA_METHOD
    ATTEMPT_COUNT -->|No| LOCKOUT[Account Lockout]

    classDef primary fill:#e8f5e8
    classDef mfa fill:#fff3e0
    classDef success fill:#e1f5fe
    classDef error fill:#ffebee

    class PRIMARY,EMAIL,OAUTH primary
    class MFA_CHECK,MFA_METHOD,TOTP,SMS,EMAIL_CODE,BACKUP mfa
    class SUCCESS success
    class RETRY,LOCKOUT error
```

## Authorization System

### Role-Based Access Control (RBAC)

```mermaid
erDiagram
    User {
        string id PK
        string email
        string name
        datetime createdAt
        boolean isActive
    }

    Organization {
        string id PK
        string name
        string slug
        datetime createdAt
    }

    Environment {
        string id PK
        string name
        string organizationId FK
        string description
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
        json conditions
    }

    UserRole {
        string id PK
        string userId FK
        string roleId FK
        string resourceType
        string resourceId
        datetime createdAt
    }

    User ||--o{ UserRole : has
    Role ||--o{ Permission : contains
    Role ||--o{ UserRole : assigned_to
    Organization ||--o{ Environment : contains
    User }|--|| Organization : member_of
```

### Permission Matrix

```mermaid
graph LR
    subgraph "Resources"
        ORG[Organizations]
        ENV[Environments]
        DS[Data Sources]
        CONV[Conversations]
        APPS[Applications]
        USERS[Users]
    end

    subgraph "Actions"
        CREATE[Create]
        READ[Read]
        UPDATE[Update]
        DELETE[Delete]
        EXECUTE[Execute]
        DEPLOY[Deploy]
    end

    subgraph "Roles"
        SUPERADMIN[Super Admin]
        ORGADMIN[Org Admin]
        DEVELOPER[Developer]
        VIEWER[Viewer]
        GUEST[Guest]
    end

    SUPERADMIN -.->|All| ORG
    SUPERADMIN -.->|All| ENV
    SUPERADMIN -.->|All| DS
    SUPERADMIN -.->|All| CONV
    SUPERADMIN -.->|All| APPS
    SUPERADMIN -.->|All| USERS

    ORGADMIN -.->|CRUD| ORG
    ORGADMIN -.->|CRUD| ENV
    ORGADMIN -.->|CRUD| DS
    ORGADMIN -.->|Read| CONV
    ORGADMIN -.->|Read| APPS
    ORGADMIN -.->|CRUD| USERS

    DEVELOPER -.->|Read| ORG
    DEVELOPER -.->|CRUD| ENV
    DEVELOPER -.->|CRUD| DS
    DEVELOPER -.->|CRUD| CONV
    DEVELOPER -.->|CRUD| APPS
    DEVELOPER -.->|Read| USERS

    VIEWER -.->|Read| ORG
    VIEWER -.->|Read| ENV
    VIEWER -.->|Read| DS
    VIEWER -.->|Read| CONV
    VIEWER -.->|Read| APPS

    GUEST -.->|Read| ORG
    GUEST -.->|Read| ENV

    classDef resources fill:#e8f5e8
    classDef actions fill:#fff3e0
    classDef roles fill:#e1f5fe

    class ORG,ENV,DS,CONV,APPS,USERS resources
    class CREATE,READ,UPDATE,DELETE,EXECUTE,DEPLOY actions
    class SUPERADMIN,ORGADMIN,DEVELOPER,VIEWER,GUEST roles
```

### CASL Integration

```mermaid
graph TB
    REQUEST[Incoming Request] --> AUTH_CHECK[Authentication Check]
    AUTH_CHECK --> USER_CONTEXT[Load User Context]
    USER_CONTEXT --> ABILITY_BUILDER[Build User Abilities]

    ABILITY_BUILDER --> ROLES[Load User Roles]
    ROLES --> PERMISSIONS[Load Permissions]
    PERMISSIONS --> CONDITIONS[Evaluate Conditions]
    CONDITIONS --> CASL_ABILITY[Create CASL Ability]

    CASL_ABILITY --> RESOURCE_CHECK[Check Resource Access]
    RESOURCE_CHECK --> CAN{Can Perform Action?}

    CAN -->|Yes| ALLOW[Allow Request]
    CAN -->|No| CONTEXT_CHECK[Check Context-based Rules]

    CONTEXT_CHECK --> OWNERSHIP{Resource Owner?}
    OWNERSHIP -->|Yes| CONDITIONAL[Check Conditional Permissions]
    OWNERSHIP -->|No| DENY[Deny Request]

    CONDITIONAL --> ENVIRONMENT{Same Environment?}
    ENVIRONMENT -->|Yes| ALLOW
    ENVIRONMENT -->|No| DENY

    classDef auth fill:#e8f5e8
    classDef authorization fill:#fff3e0
    classDef decision fill:#e1f5fe
    classDef result fill:#f3e5f5

    class AUTH_CHECK,USER_CONTEXT,ABILITY_BUILDER auth
    class ROLES,PERMISSIONS,CONDITIONS,CASL_ABILITY authorization
    class CAN,CONTEXT_CHECK,OWNERSHIP,ENVIRONMENT decision
    class ALLOW,DENY,CONDITIONAL result
```

## Data Security

### Encryption Architecture

```mermaid
graph TB
    subgraph "Data at Rest"
        DB_ENCRYPTION[Database Encryption<br/>AES-256]
        FILE_ENCRYPTION[File System Encryption<br/>AES-256]
        BACKUP_ENCRYPTION[Backup Encryption<br/>AES-256]
    end

    subgraph "Data in Transit"
        TLS_ENCRYPTION[TLS 1.3 Encryption]
        API_ENCRYPTION[API Communication<br/>HTTPS]
        DB_CONNECTION[Database Connections<br/>SSL/TLS]
    end

    subgraph "Key Management"
        MASTER_KEY[Master Key<br/>Hardware Security Module]
        DATA_KEYS[Data Encryption Keys<br/>AES-256]
        KEY_ROTATION[Automatic Key Rotation<br/>90 Days]
    end

    subgraph "Secret Management"
        VAULT_STORAGE[Vault Storage<br/>Encrypted Secrets]
        API_KEYS[API Key Management]
        DB_CREDENTIALS[Database Credentials]
        CERTIFICATES[SSL Certificates]
    end

    MASTER_KEY --> DATA_KEYS
    DATA_KEYS --> DB_ENCRYPTION
    DATA_KEYS --> FILE_ENCRYPTION
    DATA_KEYS --> BACKUP_ENCRYPTION

    TLS_ENCRYPTION --> API_ENCRYPTION
    API_ENCRYPTION --> DB_CONNECTION

    KEY_ROTATION --> MASTER_KEY

    VAULT_STORAGE --> API_KEYS
    VAULT_STORAGE --> DB_CREDENTIALS
    VAULT_STORAGE --> CERTIFICATES

    classDef rest fill:#e8f5e8
    classDef transit fill:#fff3e0
    classDef keys fill:#e1f5fe
    classDef secrets fill:#f3e5f5

    class DB_ENCRYPTION,FILE_ENCRYPTION,BACKUP_ENCRYPTION rest
    class TLS_ENCRYPTION,API_ENCRYPTION,DB_CONNECTION transit
    class MASTER_KEY,DATA_KEYS,KEY_ROTATION keys
    class VAULT_STORAGE,API_KEYS,DB_CREDENTIALS,CERTIFICATES secrets
```

### Secure Database Connections

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Vault
    participant Proxy
    participant ClientDB

    Note over User,ClientDB: Database Connection Setup
    User->>Frontend: Provide DB credentials
    Frontend->>API: POST /api/data-sources
    API->>API: Validate credentials format
    API->>Vault: Encrypt credentials
    Vault-->>API: Credentials stored with ID

    Note over API,ClientDB: Connection Testing
    API->>Vault: Retrieve credentials
    Vault->>Vault: Decrypt credentials
    Vault-->>API: Plain credentials (memory only)
    API->>Proxy: Test connection via proxy
    Proxy->>ClientDB: SSL/TLS connection
    ClientDB-->>Proxy: Connection successful
    Proxy-->>API: Connection validated
    API->>API: Clear credentials from memory

    Note over User,ClientDB: Query Execution
    User->>Frontend: Execute query
    Frontend->>API: POST /api/execute-query
    API->>Vault: Retrieve credentials
    Vault-->>API: Decrypted credentials
    API->>Proxy: Execute via proxy
    Proxy->>ClientDB: Secure connection + query
    ClientDB-->>Proxy: Query results
    Proxy-->>API: Results
    API->>API: Clear credentials from memory
    API-->>Frontend: Query results
```

## Application Security

### Security Middleware Stack

```mermaid
graph TB
    REQUEST[Incoming Request] --> WAF[Web Application Firewall]
    WAF --> RATE_LIMIT[Rate Limiting]
    RATE_LIMIT --> DDoS[DDoS Protection]
    DDoS --> CORS[CORS Validation]
    CORS --> CSP[Content Security Policy]
    CSP --> AUTH[Authentication]
    AUTH --> AUTHZ[Authorization]
    AUTHZ --> INPUT_VALIDATION[Input Validation]
    INPUT_VALIDATION --> SANITIZATION[Data Sanitization]
    SANITIZATION --> AUDIT[Audit Logging]
    AUDIT --> APPLICATION[Application Logic]

    classDef security fill:#ffebee
    classDef auth fill:#e8f5e8
    classDef validation fill:#fff3e0
    classDef app fill:#e1f5fe

    class WAF,RATE_LIMIT,DDoS,CORS,CSP security
    class AUTH,AUTHZ auth
    class INPUT_VALIDATION,SANITIZATION validation
    class AUDIT,APPLICATION app
```

### Input Validation & Sanitization

```mermaid
graph LR
    subgraph "Input Sources"
        USER_INPUT[User Input]
        API_REQUEST[API Requests]
        FILE_UPLOAD[File Uploads]
        DB_DATA[Database Data]
    end

    subgraph "Validation Layer"
        SCHEMA_VALIDATION[Schema Validation<br/>Zod/Joi]
        TYPE_CHECKING[Type Checking<br/>TypeScript]
        LENGTH_VALIDATION[Length Validation]
        PATTERN_MATCHING[Pattern Matching<br/>Regex]
    end

    subgraph "Sanitization Layer"
        HTML_SANITIZATION[HTML Sanitization<br/>DOMPurify]
        SQL_SANITIZATION[SQL Sanitization<br/>Parameterized Queries]
        PATH_SANITIZATION[Path Sanitization]
        ENCODING[Output Encoding]
    end

    subgraph "Security Checks"
        XSS_PROTECTION[XSS Protection]
        SQLI_PROTECTION[SQL Injection Protection]
        PATH_TRAVERSAL[Path Traversal Protection]
        CSRF_PROTECTION[CSRF Protection]
    end

    USER_INPUT --> SCHEMA_VALIDATION
    API_REQUEST --> TYPE_CHECKING
    FILE_UPLOAD --> LENGTH_VALIDATION
    DB_DATA --> PATTERN_MATCHING

    SCHEMA_VALIDATION --> HTML_SANITIZATION
    TYPE_CHECKING --> SQL_SANITIZATION
    LENGTH_VALIDATION --> PATH_SANITIZATION
    PATTERN_MATCHING --> ENCODING

    HTML_SANITIZATION --> XSS_PROTECTION
    SQL_SANITIZATION --> SQLI_PROTECTION
    PATH_SANITIZATION --> PATH_TRAVERSAL
    ENCODING --> CSRF_PROTECTION

    classDef input fill:#e8f5e8
    classDef validation fill:#fff3e0
    classDef sanitization fill:#e1f5fe
    classDef security fill:#f3e5f5

    class USER_INPUT,API_REQUEST,FILE_UPLOAD,DB_DATA input
    class SCHEMA_VALIDATION,TYPE_CHECKING,LENGTH_VALIDATION,PATTERN_MATCHING validation
    class HTML_SANITIZATION,SQL_SANITIZATION,PATH_SANITIZATION,ENCODING sanitization
    class XSS_PROTECTION,SQLI_PROTECTION,PATH_TRAVERSAL,CSRF_PROTECTION security
```

## Security Monitoring & Incident Response

### Security Event Monitoring

```mermaid
graph TB
    subgraph "Event Sources"
        AUTH_EVENTS[Authentication Events]
        API_EVENTS[API Access Events]
        DB_EVENTS[Database Events]
        FILE_EVENTS[File System Events]
        NETWORK_EVENTS[Network Events]
    end

    subgraph "Event Processing"
        COLLECTOR[Event Collector]
        PARSER[Event Parser]
        ENRICHER[Event Enricher]
        CORRELATOR[Event Correlator]
    end

    subgraph "Threat Detection"
        ANOMALY[Anomaly Detection]
        PATTERN[Pattern Matching]
        ML_ANALYSIS[ML-based Analysis]
        THREAT_INTEL[Threat Intelligence]
    end

    subgraph "Response Actions"
        ALERT[Generate Alerts]
        BLOCK[Auto-block IPs]
        QUARANTINE[Quarantine Users]
        INCIDENT[Create Incidents]
    end

    AUTH_EVENTS --> COLLECTOR
    API_EVENTS --> COLLECTOR
    DB_EVENTS --> COLLECTOR
    FILE_EVENTS --> COLLECTOR
    NETWORK_EVENTS --> COLLECTOR

    COLLECTOR --> PARSER
    PARSER --> ENRICHER
    ENRICHER --> CORRELATOR

    CORRELATOR --> ANOMALY
    CORRELATOR --> PATTERN
    CORRELATOR --> ML_ANALYSIS
    CORRELATOR --> THREAT_INTEL

    ANOMALY --> ALERT
    PATTERN --> BLOCK
    ML_ANALYSIS --> QUARANTINE
    THREAT_INTEL --> INCIDENT

    classDef sources fill:#e8f5e8
    classDef processing fill:#fff3e0
    classDef detection fill:#e1f5fe
    classDef response fill:#f3e5f5

    class AUTH_EVENTS,API_EVENTS,DB_EVENTS,FILE_EVENTS,NETWORK_EVENTS sources
    class COLLECTOR,PARSER,ENRICHER,CORRELATOR processing
    class ANOMALY,PATTERN,ML_ANALYSIS,THREAT_INTEL detection
    class ALERT,BLOCK,QUARANTINE,INCIDENT response
```

### Incident Response Flow

```mermaid
sequenceDiagram
    participant Monitor
    participant SIEM
    participant SOC
    participant Admin
    participant System
    participant User

    Monitor->>SIEM: Security event detected
    SIEM->>SIEM: Analyze event severity

    alt Critical Incident
        SIEM->>SOC: Immediate alert
        SOC->>Admin: Emergency notification
        Admin->>System: Implement emergency response
        System->>User: Service disruption notice
    else High Priority
        SIEM->>SOC: High priority alert
        SOC->>Admin: Urgent notification
        Admin->>System: Implement mitigation
    else Medium/Low Priority
        SIEM->>SOC: Standard alert
        SOC->>Admin: Standard notification
        Admin->>System: Schedule remediation
    end

    Admin->>SIEM: Update incident status
    SIEM->>Monitor: Adjust monitoring rules
```

## Compliance & Audit

### Audit Trail Architecture

```mermaid
graph TB
    subgraph "Audit Sources"
        USER_ACTIONS[User Actions]
        SYSTEM_EVENTS[System Events]
        DATA_CHANGES[Data Changes]
        ACCESS_LOGS[Access Logs]
    end

    subgraph "Audit Processing"
        AUDIT_LOGGER[Audit Logger]
        EVENT_FORMATTER[Event Formatter]
        INTEGRITY_CHECKER[Integrity Checker]
        RETENTION_MANAGER[Retention Manager]
    end

    subgraph "Storage"
        IMMUTABLE_STORE[Immutable Audit Store]
        BACKUP_STORE[Backup Storage]
        COMPLIANCE_DB[Compliance Database]
    end

    subgraph "Reporting"
        COMPLIANCE_REPORTS[Compliance Reports]
        AUDIT_DASHBOARD[Audit Dashboard]
        FORENSIC_TOOLS[Forensic Analysis Tools]
        EXPORT_API[Export API]
    end

    USER_ACTIONS --> AUDIT_LOGGER
    SYSTEM_EVENTS --> AUDIT_LOGGER
    DATA_CHANGES --> AUDIT_LOGGER
    ACCESS_LOGS --> AUDIT_LOGGER

    AUDIT_LOGGER --> EVENT_FORMATTER
    EVENT_FORMATTER --> INTEGRITY_CHECKER
    INTEGRITY_CHECKER --> RETENTION_MANAGER

    RETENTION_MANAGER --> IMMUTABLE_STORE
    IMMUTABLE_STORE --> BACKUP_STORE
    BACKUP_STORE --> COMPLIANCE_DB

    COMPLIANCE_DB --> COMPLIANCE_REPORTS
    COMPLIANCE_DB --> AUDIT_DASHBOARD
    COMPLIANCE_DB --> FORENSIC_TOOLS
    COMPLIANCE_DB --> EXPORT_API

    classDef sources fill:#e8f5e8
    classDef processing fill:#fff3e0
    classDef storage fill:#e1f5fe
    classDef reporting fill:#f3e5f5

    class USER_ACTIONS,SYSTEM_EVENTS,DATA_CHANGES,ACCESS_LOGS sources
    class AUDIT_LOGGER,EVENT_FORMATTER,INTEGRITY_CHECKER,RETENTION_MANAGER processing
    class IMMUTABLE_STORE,BACKUP_STORE,COMPLIANCE_DB storage
    class COMPLIANCE_REPORTS,AUDIT_DASHBOARD,FORENSIC_TOOLS,EXPORT_API reporting
```

## Security Best Practices

### Security Checklist

1. **Authentication**
   - Multi-factor authentication enabled
   - Strong password policies enforced
   - Session management secure
   - OAuth integration properly configured

2. **Authorization**
   - Role-based access control implemented
   - Principle of least privilege applied
   - Regular permission audits conducted
   - Context-based access decisions

3. **Data Protection**
   - Encryption at rest and in transit
   - Secure key management
   - Regular key rotation
   - Backup encryption

4. **Application Security**
   - Input validation and sanitization
   - OWASP Top 10 protections
   - Secure coding practices
   - Regular security testing

5. **Infrastructure Security**
   - Network segmentation
   - Firewall configurations
   - Intrusion detection systems
   - Regular security updates

6. **Monitoring & Response**
   - Comprehensive logging
   - Real-time monitoring
   - Incident response procedures
   - Regular security assessments

This security architecture provides comprehensive protection while maintaining usability and performance for the AI-powered development platform.
