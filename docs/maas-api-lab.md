# MaaS API Documentation Engineering Lab

A hands-on API documentation engineering project demonstrating how to build, validate, generate, and maintain API documentation and SDK artifacts from an OpenAPI specification.

## Project Overview

This project simulates the documentation workflow for a Model-as-a-Service (MaaS) chat completion API.

It brings together API design, reference documentation, SDK generation, developer guides, and automated documentation checks in one repository.

**Note:** This is a learning project. The API server URL uses a placeholder domain and is not a live production service. Local request examples use a mock server.

## Key Deliverables

- **OpenAPI Specification** — API operations, request and response schemas, authentication, and error responses.
- **API Reference** — HTML documentation generated with Redocly CLI.
- **Java SDK** — Client code generated from the OpenAPI specification.
- **Developer Guide** — Quickstart, authentication, first request, error handling, and troubleshooting.
- **Local Mock Server** — Demonstrates successful requests and HTTP 401 error handling without calling a real API.
- **Documentation Quality Check** — A reusable PowerShell script that checks Markdown relative links.
- **GitHub Actions CI** — Automatically validates the OpenAPI specification, checks Markdown links, compiles the Java SDK, and builds the API Reference on pushes and pull requests targeting `main`.

## Technology Stack

- OpenAPI 3.0.3
- Redocly CLI
- OpenAPI Generator
- Java 17
- Gradle Wrapper
- Markdown
- PowerShell
- Git and GitHub
- GitHub Actions

## Repository Structure

```text
maas-api-lab/
├── docs/                  # Developer Guide
├── generated-java/        # Generated Java SDK and examples
├── openapi/
│   └── openapi.yaml       # Source API specification
├── scripts/
│   ├── check-doc-links.ps1
│   └── normalize-line-endings.ps1
├── api-reference.html     # Generated API Reference
├── openapitools.json      # Generator configuration
└── .gitignore
```

## Documentation

Start with the [Developer Guide](https://github.com/wyifang/maas-api-lab/blob/main/docs/index.md).

- [Quickstart](https://github.com/wyifang/maas-api-lab/blob/main/docs/quickstart.md)
- [Authentication](https://github.com/wyifang/maas-api-lab/blob/main/docs/authentication.md)
- [First Request](https://github.com/wyifang/maas-api-lab/blob/main/docs/first-request.md)
- [Error Handling](https://github.com/wyifang/maas-api-lab/blob/main/docs/error-handling.md)
- [Troubleshooting](https://github.com/wyifang/maas-api-lab/blob/main/docs/troubleshooting.md)

The generated API Reference is available in the [API Reference HTML file](https://github.com/wyifang/maas-api-lab/blob/main/api-reference.html).

## Continuous Integration

This project uses GitHub Actions to run automated quality checks on pushes and pull requests targeting the `main` branch.

The workflow is defined in `.github/workflows/ci.yml`.

It performs the following checks:

1. **OpenAPI validation** — Lints `openapi/openapi.yaml` with Redocly CLI.
2. **Markdown link validation** — Runs the PowerShell documentation link checker.
3. **Java SDK compilation** — Compiles the generated Java SDK using the Gradle Wrapper.
4. **API Reference generation** — Builds HTML documentation from the OpenAPI specification.

These checks help detect documentation and SDK build issues before changes are merged.

The workflow runs on GitHub-hosted Linux runners, while the project can also be developed locally on Windows.

## Build and Validate

### 1. Check Documentation Links

From the repository root, run:

```powershell
.\scripts\check-doc-links.ps1
```

### 2. Normalize Tracked Text File Line Endings

The repository uses LF for tracked text files and CRLF for Windows `.bat` and `.cmd` scripts. To normalize tracked files that currently contain CRLF or mixed line endings, run:

```powershell
.\scripts\normalize-line-endings.ps1
```

Use `-WhatIf` to preview which files would be normalized.

### 3. Compile the Java SDK

From the repository root:

```powershell
cd .\generated-java
.\gradlew.bat clean compileJava
```

### 4. Run the Local Mock API Example

Start the mock server in one PowerShell window:

```powershell
.\gradlew.bat runMockMaaSServer
```

In another PowerShell window, from `generated-java`, run:

```powershell
.\gradlew.bat runMockApiCallExample
```

The example sends an HTTP request to the local mock server and demonstrates SDK response parsing. Other examples demonstrate error handling and request serialization.

### 5. Rebuild the API Reference

From the repository root:

```powershell
npx @redocly/cli@2.64.1 build-docs .\openapi\openapi.yaml --output .\api-reference.html
```

This command requires Node.js and npm.

## Design Principle

The OpenAPI specification serves as the central source for API contract information. Generated SDK artifacts and API Reference documentation are derived from that contract, while the Developer Guide explains how developers use the API.

This project explores how documentation, code generation, and repeatable validation can work together in an API documentation engineering workflow.

## Scope and Limitations

- The API endpoint is fictional and is not intended for production use.
- The mock server runs locally and does not connect to a real MaaS provider.
- The Markdown link checker validates a subset of relative `.md` links; it does not validate external URLs or all Markdown anchor formats.

## Learning Objectives

- Maintain an OpenAPI-based API contract.
- Generate and compile a Java client SDK.
- Explain authentication, request construction, and API errors.
- Verify SDK behavior using a local mock service.
- Build repeatable checks for documentation quality.