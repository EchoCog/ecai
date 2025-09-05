# Technical Architecture Documentation

This directory contains comprehensive technical architecture documentation for the liblab.ai platform, including detailed Mermaid diagrams and architectural explanations.

## Architecture Overview

liblab.ai is an AI-powered developer tool platform that accelerates development workflows by helping users build internal applications through natural language interactions. The platform connects to databases, generates full-stack applications, and provides deployment capabilities.

## Documentation Structure

### 1. [System Architecture](system-architecture.md)

High-level overview of the entire system, showing how all major components interact and the overall data flow patterns.

### 2. [Database Architecture](database-architecture.md)

Detailed documentation of database connectivity, schema management, query execution patterns, and multi-database support.

### 3. [AI Integration Architecture](ai-integration-architecture.md)

Comprehensive overview of AI model integrations, prompt management, code generation workflows, and model selection strategies.

### 4. [Authentication & Security Architecture](auth-security-architecture.md)

Security model, authentication flows, authorization patterns, role-based permissions, and secure data handling.

### 5. [Development Workflow Architecture](development-workflow-architecture.md)

Code generation pipeline, WebContainer integration, hot reloading, and the development experience flow.

### 6. [Deployment Architecture](deployment-architecture.md)

Docker containerization, Netlify integration, production deployment patterns, and infrastructure considerations.

### 7. [API Architecture](api-architecture.md)

Internal API design, service interactions, external integrations, and communication patterns.

## Legacy Diagrams

The following Mermaid diagrams provide additional detail for specific workflows:

- [dashboards-chat-sequence.mermaid](dashboards-chat-sequence.mermaid) - Original chat sequence for dashboard generation
- [execute-query.mermaid](execute-query.mermaid) - Original query execution flow

## Key Architectural Principles

- **AI-First Design**: Every component is designed to work seamlessly with AI-generated content and workflows
- **Multi-Database Support**: Flexible database connectivity supporting PostgreSQL, MySQL, MongoDB, and SQLite
- **Security by Design**: Comprehensive security model with encrypted connections and role-based access control
- **Developer Experience**: Streamlined workflows from natural language to deployed applications
- **Scalable Infrastructure**: Docker-based deployment with horizontal scaling capabilities
- **Real-time Collaboration**: WebSocket-based real-time updates and collaborative editing

## Getting Started

Begin with the [System Architecture](system-architecture.md) document for a high-level overview, then dive into specific architectural domains based on your interest or requirements.

## Diagram Standards

All architecture diagrams in this documentation follow these standards:

- **Mermaid format** for consistency and version control
- **Color coding** to distinguish component types
- **Clear labeling** with descriptive names and relationships
- **Flow direction** typically top-to-bottom or left-to-right
- **Security boundaries** clearly marked where applicable
