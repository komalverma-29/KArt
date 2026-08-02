# KArt Technical Steering

> Version: 1.0
> Project: KArt
> Document Type: Technical Steering
> Status: Active

---

# Purpose

This document defines the engineering standards, architectural decisions, technology choices, and implementation guidelines for KArt.

Unlike a technology stack document, this file explains not only **what technologies are used**, but also **why they were selected**, **how they should be used**, and **the principles that guide every engineering decision**.

Every contributor, whether human or AI, should follow this document before implementing new functionality.

---

# Engineering Philosophy

KArt is intended to be a production-quality application.

The project should prioritize:

- Maintainability
- Readability
- Scalability
- Security
- Consistency
- Simplicity

Quick solutions that compromise long-term quality should be avoided.

The codebase should remain understandable by another developer without requiring excessive explanation.

Every implementation should be easy to extend without introducing unnecessary complexity.

---

# Engineering Principles

## Principle 1 — Build for Maintainability

Readable code is preferred over clever code.

Future developers should understand the purpose of a file within a few minutes.

Avoid unnecessary abstractions.

Avoid deeply nested logic.

Prefer explicit implementations over confusing optimizations.

---

## Principle 2 — Simplicity Before Complexity

Choose the simplest implementation that satisfies the current requirements.

Do not build infrastructure for features that do not yet exist.

However, architecture should remain flexible enough to support future growth.

---

## Principle 3 — Separation of Concerns

Each layer of the application should have a single responsibility.

Examples:

- Components display UI.
- Server Actions receive requests.
- Services contain business logic.
- Repositories interact with the database.
- Prisma communicates with PostgreSQL.

Responsibilities should never overlap unnecessarily.

---

## Principle 4 — Type Safety

TypeScript should be used throughout the project.

Avoid the use of `any`.

Every function, object, and API should use explicit types whenever practical.

Type safety reduces bugs and improves maintainability.

---

## Principle 5 — Secure by Default

Every implementation should assume that incoming data is untrusted.

All user input must be validated.

Authorization must always be verified before performing protected operations.

Security should never be considered an optional enhancement.

---

## Principle 6 — Reusability

Common logic should exist in one place.

Avoid duplicating:

- Validation
- Business rules
- UI components
- Utility functions
- Database queries

Reusable code reduces maintenance costs.

---

## Principle 7 — Production Mindset

Every feature should be implemented as though it will immediately serve real users.

Avoid shortcuts that would require rewriting before deployment.

The project should be deployable at every meaningful milestone.

---

# Technology Stack

The selected technologies should remain consistent unless there is a compelling engineering reason to change them.

---

## Frontend

### Next.js 15 (App Router)

Purpose

Application framework.

Reason

- Server-first architecture
- Excellent performance
- Built-in routing
- Server Actions
- React Server Components
- Production-ready ecosystem

Why it fits KArt

KArt contains a mix of public content, authenticated Studio pages, forms, and server-rendered artwork. Next.js provides an excellent balance between developer experience and production capabilities.

---

### React 19

Purpose

Component-based UI development.

Reason

- Mature ecosystem
- Declarative programming model
- Strong community support
- Excellent integration with Next.js

---

### TypeScript

Purpose

Static typing.

Reason

- Prevents runtime errors
- Improves maintainability
- Better editor support
- Safer refactoring

Every new file should use TypeScript.

JavaScript files should not be introduced.

---

### Tailwind CSS v4

Purpose

Application styling.

Reason

- Utility-first workflow
- Consistent spacing
- Fast development
- Easy maintenance

Tailwind should be used alongside reusable UI components.

Avoid excessive inline utility duplication.

---

### shadcn/ui

Purpose

Reusable UI component foundation.

Reason

- Accessible components
- Excellent customization
- Modern architecture
- No unnecessary runtime dependencies

Components should be customized to match the KArt design language rather than used without modification.

---

### Lucide React

Purpose

Application icons.

Reason

- Consistent design
- Lightweight
- Tree-shakable
- Excellent TypeScript support

Avoid mixing multiple icon libraries.

---

# Backend

KArt uses Next.js as a full-stack framework.

A separate backend server is intentionally not introduced in Version 1.

This reduces deployment complexity while maintaining a clean architecture.

Business logic should remain independent of framework-specific code whenever practical.

---

## Server Actions

Purpose

Handle mutations initiated by the application.

Examples:

- Create artwork
- Update artwork
- Delete artwork
- Submit commission request
- Publish story

Reason

- End-to-end type safety
- Less boilerplate
- Excellent integration with forms
- Simplified development workflow

Use Server Actions for operations originating from the application's own interface.

---

## Route Handlers

Purpose

Expose HTTP endpoints when required.

Use cases include:

- Webhooks
- Future public APIs
- External integrations
- File handling endpoints

Avoid creating Route Handlers when Server Actions provide a simpler solution.

---

# Database

## PostgreSQL

Purpose

Primary relational database.

Reason

- Mature
- Reliable
- Excellent relational capabilities
- Strong indexing support
- Wide industry adoption
- Excellent Prisma integration

Why it fits KArt

KArt contains strongly related entities such as:

- Users
- Artworks
- Collections
- Orders
- Commissions
- Stories

A relational database models these relationships naturally.

---

# ORM

## Prisma

Purpose

Database access layer.

Reason

- Type-safe queries
- Schema-first development
- Excellent migrations
- Strong TypeScript support
- Great developer experience

Prisma should remain the only component responsible for communicating with PostgreSQL.

Business logic should never directly depend on SQL queries.

---

# Authentication

## Auth.js

Purpose

Authentication and session management.

Reason

- Native Next.js integration
- Secure session handling
- Flexible provider support
- Production-ready

Authentication should remain centralized.

Protected routes must always verify the authenticated user.

---

# Validation

## Zod

Purpose

Runtime validation.

Reason

- TypeScript-first
- Reliable parsing
- Reusable schemas
- Excellent integration with forms

Every external input should be validated before entering the application.

Never trust client-side validation alone.

---

# Forms

## React Hook Form

Purpose

Form state management.

Reason

- Excellent performance
- Easy validation
- Minimal re-renders
- Strong Zod integration

All complex forms should use React Hook Form.

---

# Image Storage

Version 1 Development

Store uploaded images locally during development.

Production

Abstract file storage behind a service so future migration to:

- Cloudinary
- AWS S3
- Supabase Storage

does not require changes to business logic.

The application should never tightly couple business logic to a storage provider.

---

# Development Environment

Local Development

- Next.js Development Server
- PostgreSQL (Local)
- Prisma
- Environment Variables

Production

- Vercel
- Managed PostgreSQL
- External Object Storage

Development and production environments should behave consistently whenever possible.

---

# Technology Selection Principles

New libraries should only be introduced when they provide meaningful value.

Before adding a dependency, ask:

- Does the framework already solve this problem?
- Can an existing library solve it?
- Will this dependency be maintained?
- Does it improve developer experience?
- Is the additional complexity justified?

Avoid unnecessary dependencies.

Every library should earn its place in the project.

---

# Technology Checklist

Before introducing any technology, verify:

✓ Production-ready

✓ Well documented

✓ Actively maintained

✓ Strong TypeScript support

✓ Compatible with Next.js

✓ Compatible with long-term project goals

If any criterion is not satisfied, reconsider the decision before adoption.

# Application Architecture

KArt follows a layered architecture.

Each layer has a single responsibility and communicates only with adjacent layers.

Business logic must remain independent from UI implementation.

The architecture prioritizes:

- Maintainability
- Testability
- Scalability
- Separation of concerns

---

# Architectural Overview

Every request should follow this flow:

```

UI (Page / Component)
↓
Server Action / Route Handler
↓
Service Layer
↓
Repository Layer
↓
Prisma ORM
↓
PostgreSQL

```

No layer should skip another layer unless explicitly documented.

---

# Layer Responsibilities

## Presentation Layer

Purpose

Responsible for displaying information and handling user interactions.

Includes:

- Pages
- Layouts
- Components
- Forms
- Client-side interactions

Responsibilities

- Display data
- Trigger actions
- Handle loading states
- Display validation errors
- Display success messages

Must Never

- Access the database
- Contain business rules
- Call Prisma directly

---

## Server Layer

Purpose

Receive requests from the presentation layer.

Includes

- Server Actions
- Route Handlers

Responsibilities

- Authenticate users
- Validate requests
- Call services
- Return responses

Server Actions should remain thin.

Business logic belongs inside Services.

---

## Service Layer

Purpose

Contains business rules.

Examples

ArtworkService

CollectionService

OrderService

CommissionService

StoryService

Responsibilities

- Business validation
- Permission checks
- Workflow orchestration
- Data transformations
- Calling repositories

Services should never contain UI logic.

Services should remain independent from React.

---

## Repository Layer

Purpose

Responsible for database communication.

Repositories abstract Prisma.

Responsibilities

- Database queries
- CRUD operations
- Transactions
- Query optimization

Repositories should not contain business logic.

---

## Data Layer

Prisma is the only component responsible for database interaction.

No other layer should directly communicate with PostgreSQL.

This provides:

- Centralized data access
- Easier testing
- Cleaner architecture

---

# Dependency Rules

Allowed

Presentation

↓

Server

↓

Service

↓

Repository

↓

Prisma

↓

Database

Forbidden

Component → Prisma

Component → Database

Server Action → Prisma

Page → Database

Repository → UI

Service → React Component

Business rules should never appear inside UI components.

---

# Folder Ownership

Each folder owns a specific responsibility.

Example

app/

UI and routing.

---

components/

Reusable interface components.

---

actions/

Server Actions.

Only request handling.

---

services/

Business logic.

---

repositories/

Database access.

---

lib/

Utilities.

Shared helper functions.

---

prisma/

Database schema.

Migrations.

Prisma client.

---

types/

Shared TypeScript types.

---

schemas/

Zod validation schemas.

---

hooks/

Reusable React hooks.

Client-side only.

---

# Business Logic Rules

Business logic should exist exactly once.

Examples

Correct

Artwork availability rules inside ArtworkService.

Incorrect

Availability logic duplicated across:

- Components
- Server Actions
- Pages

Duplication increases maintenance cost.

---

# Database Design Philosophy

The database should model real-world relationships.

Entities should represent business concepts.

Examples

User

Artwork

Collection

Order

Commission

Story

Relationships should remain explicit.

Avoid storing duplicated information.

---

# Schema Design Principles

Prefer normalization.

Avoid redundant data.

Use foreign keys to model relationships.

Use meaningful table names.

Prefer nullable fields only when appropriate.

Future features should extend the schema rather than replace it.

---

# Primary Keys

Every table should use UUIDs.

Reasons

- Safer public identifiers

- Easier distributed systems

- Better future scalability

Avoid integer IDs for externally exposed resources.

---

# Timestamps

Every major entity should include

createdAt

updatedAt

Where appropriate

publishedAt

completedAt

soldAt

deletedAt (soft delete)

Time information should always use UTC.

---

# Soft Deletes

Avoid permanently deleting valuable information.

Instead use:

deletedAt

Soft deletion is preferred for:

Artwork

Stories

Orders

Commissions

Collections

Hard deletion should only occur when absolutely necessary.

---

# Transactions

Whenever multiple database operations must succeed together, use Prisma transactions.

Examples

Creating an order.

Updating inventory.

Publishing artwork with related records.

Transactions preserve data consistency.

---

# Validation Strategy

Validation occurs in multiple layers.

Client

Immediate feedback.

↓

Server

Security validation.

↓

Service

Business rule validation.

Never rely on client-side validation alone.

---

# Error Handling Philosophy

Errors should be:

Predictable

Helpful

Recoverable

Secure

Users should receive understandable messages.

Internal implementation details must never be exposed.

---

# Logging

Version 1

Console logging is acceptable during development.

Production

Replace with structured logging.

Logs should include

Timestamp

Action

User ID (when authenticated)

Error message

Relevant metadata

Never log:

Passwords

Secrets

Tokens

Sensitive personal information

---

# Configuration

Application configuration belongs inside environment variables.

Examples

Database URL

Authentication secret

Storage credentials

API keys

Never hardcode secrets.

---

# API Philosophy

Although Version 1 primarily uses Server Actions, all business logic should remain reusable.

If REST APIs are introduced later, they should call the same Service layer.

Avoid duplicating business logic across multiple interfaces.

---

# Engineering Standards

Every new feature should satisfy:

Clear responsibility.

Minimal duplication.

Reusable implementation.

Predictable behavior.

Simple maintenance.

Future scalability.

Readable code.

---

# Architecture Checklist

Before implementing new functionality, verify:

✓ Is each layer respecting its responsibility?

✓ Is business logic isolated?

✓ Is database access centralized?

✓ Is validation performed?

✓ Is authorization checked?

✓ Is duplication avoided?

✓ Is the implementation scalable?

✓ Would another developer understand this immediately?

If any answer is "No", reconsider the implementation before merging changes.

# Frontend Engineering Standards

The frontend should provide a consistent, accessible, responsive, and maintainable user experience.

Every interface should reflect the design philosophy defined in `product.md`.

The frontend exists to present information and collect user input.

Business logic should remain outside the UI.

---

# React Philosophy

KArt follows a Server-First architecture.

Whenever possible:

- Prefer Server Components.
- Use Client Components only when interactivity is required.

Examples requiring Client Components:

- Forms
- Dialogs
- Dropdowns
- Theme switching
- File uploads
- Interactive galleries

Examples that should remain Server Components:

- Gallery pages
- Artwork pages
- Story pages
- Collection pages
- Static layouts

Reducing unnecessary client-side JavaScript improves performance and simplifies the application.

---

# Component Philosophy

Components should be:

- Small
- Reusable
- Predictable
- Composable
- Easy to understand

Avoid creating components that attempt to solve too many problems.

One component should have one primary responsibility.

---

# Component Categories

## UI Components

Reusable building blocks.

Examples:

- Button
- Card
- Badge
- Input
- Dialog
- Modal
- Avatar

These should contain no business logic.

---

## Feature Components

Represent functionality for a specific feature.

Examples:

- ArtworkCard
- ArtworkGallery
- StoryPreview
- CommissionForm
- OrderTable

Feature components may compose multiple UI components.

---

## Layout Components

Responsible for page structure.

Examples:

- Header
- Footer
- Sidebar
- Navigation
- Section
- Container

Layouts should remain reusable across multiple pages.

---

# Component Design Rules

Components should:

Receive data through props.

Avoid hidden side effects.

Remain reusable.

Use descriptive names.

Avoid unnecessary state.

Prefer composition over deeply nested conditionals.

---

# State Management

KArt intentionally minimizes global state.

State should exist at the lowest possible level.

Priority:

1. Server State
2. URL State
3. Local Component State
4. Global State

Avoid introducing global state unless absolutely necessary.

---

# Global State

Use global state only for application-wide concerns.

Examples:

- Theme
- Authentication status
- Sidebar state
- User preferences

Business data should not be stored in global state.

---

# Forms

All significant forms should use:

React Hook Form

+

Zod

Forms should provide:

- Immediate validation feedback
- Helpful error messages
- Loading indicators
- Disabled submit state
- Success confirmation

Every form should remain accessible.

---

# Validation Messages

Validation should explain:

- What went wrong.
- Why it happened.
- How the user can fix it.

Avoid vague messages.

Bad

Invalid input.

Good

Artwork title must contain at least three characters.

---

# Loading States

Every asynchronous operation should provide visual feedback.

Examples:

- Skeleton loaders
- Loading buttons
- Placeholder cards
- Progress indicators

Never leave users wondering whether an action is processing.

---

# Empty States

Every list should gracefully handle empty data.

Examples:

No artworks yet.

No collections created.

No stories published.

Empty states should encourage meaningful next actions.

---

# Error States

Errors should:

Explain the problem.

Avoid technical jargon.

Provide recovery options.

Example:

Unable to publish artwork.

Please try again.

If the problem persists, contact support.

---

# Styling Standards

Tailwind CSS is the primary styling solution.

Guidelines:

Use design tokens.

Maintain spacing consistency.

Avoid arbitrary values whenever possible.

Extract repeated utility combinations into reusable components.

Do not mix multiple styling systems.

---

# Responsive Design

Desktop is the primary design target.

However, every feature must work on:

Desktop

Tablet

Mobile

Layouts should adapt naturally.

Avoid hiding important functionality on smaller screens.

---

# Breakpoints

Use Tailwind defaults unless a strong reason exists.

Design should be mobile-friendly without becoming mobile-only.

Desktop should remain the richest experience.

---

# Icons

Use Lucide React exclusively.

Icons should:

Support understanding.

Improve usability.

Remain visually consistent.

Avoid decorative icons without purpose.

---

# Images

Images represent the primary content of KArt.

Requirements:

Responsive loading.

Proper dimensions.

Descriptive alt text.

Optimized delivery.

Lazy loading where appropriate.

Artwork images should always receive higher visual priority than interface graphics.

---

# Animations

Motion should communicate meaning.

Good uses:

Hover feedback.

Page transitions.

Dialog appearance.

Loading indicators.

Image fade-in.

Avoid:

Large parallax effects.

Continuous animations.

Distracting transitions.

Animations should never compete with artwork.

---

# Accessibility Standards

Every component should support:

Keyboard navigation.

Visible focus states.

Screen readers.

Sufficient color contrast.

Semantic HTML.

Proper labels.

Accessibility is a core requirement.

Not an optional enhancement.

---

# SEO Standards

Public pages should include:

Meaningful page titles.

Meta descriptions.

Open Graph metadata.

Twitter cards.

Canonical URLs.

Structured data where appropriate.

Artwork pages should be optimized for sharing.

---

# Performance Standards

Optimize for:

Minimal JavaScript.

Server rendering.

Image optimization.

Code splitting.

Font optimization.

Avoid unnecessary client-side rendering.

Performance should remain a first-class concern.

---

# Design Consistency

Every screen should feel like it belongs to the same product.

Typography.

Spacing.

Buttons.

Forms.

Cards.

Dialogs.

Navigation.

All should follow shared design patterns.

Consistency is more valuable than novelty.

---

# Frontend Checklist

Before completing any UI implementation, verify:

✓ Responsive on all supported devices.

✓ Accessible.

✓ Consistent with design system.

✓ Uses reusable components.

✓ Minimal client-side JavaScript.

✓ Proper loading state.

✓ Proper empty state.

✓ Helpful error handling.

✓ Semantic HTML.

✓ Optimized images.

✓ Clean, readable code.

If any item is incomplete, the feature is not considered production-ready.

# Security & Production Standards

Security is a fundamental requirement of KArt.

Every feature should be designed assuming that incoming data is untrusted.

Security should be built into the application from the beginning rather than added after development.

---

# Security Philosophy

KArt follows the principle of least privilege.

Users should only have access to the data and functionality necessary for their role.

Never trust:

- Client-side validation
- Request payloads
- URL parameters
- Hidden form fields

All validation and authorization must occur on the server.

---

# Authentication

Authentication is handled using Auth.js.

Responsibilities include:

- Secure login
- Session management
- User identity
- Protected routes

Authentication determines **who the user is**.

Authentication alone never grants permission to perform actions.

---

# Authorization

Authorization determines **what a user is allowed to do**.

Every protected action must verify that the authenticated user has permission to perform it.

Examples:

An artist can:

- Create artwork
- Edit artwork
- Delete artwork
- View Studio pages

Visitors can:

- Browse artwork
- Read stories
- Submit commission requests
- Submit purchase requests

Visitors must never access Studio functionality.

---

# Route Protection

All Studio routes must require authentication.

Public routes should remain accessible without authentication.

Protected pages must redirect unauthenticated users to the login page.

Authorization checks should occur on the server.

---

# Input Validation

Every external input must be validated using Zod.

Validation applies to:

- Forms
- Server Actions
- Route Handlers
- URL parameters
- Query parameters

Client-side validation improves user experience.

Server-side validation ensures security.

---

# File Upload Security

Uploaded files must be validated before storage.

Validation should include:

- File type
- File size
- Allowed extensions
- Image integrity

Reject unsupported file formats.

Store uploaded files outside the application source code.

Never trust filenames supplied by users.

---

# Environment Variables

Sensitive configuration belongs in environment variables.

Examples:

DATABASE_URL

AUTH_SECRET

STORAGE_KEYS

API_KEYS

Never commit secrets to version control.

Provide an example `.env.example` file without real credentials.

---

# Password Security

Passwords should never be stored directly.

Password hashing should always use secure industry-standard algorithms provided by the authentication library.

Passwords should never be:

Logged

Returned in responses

Stored in plain text

---

# Error Security

Error messages should help users without revealing internal implementation details.

Bad:

Database connection failed.

Good:

Something went wrong. Please try again later.

Detailed errors should only appear in server logs.

---

# Rate Limiting

Version 1 should be designed so rate limiting can be introduced without architectural changes.

Future rate limiting should protect:

- Login
- Commission requests
- Contact forms
- Purchase requests
- File uploads

---

# Data Protection

Only collect information required by the application.

Avoid unnecessary personal information.

Sensitive information should remain protected throughout the application lifecycle.

---

# Session Management

Sessions should:

Expire appropriately.

Remain secure.

Be invalidated on logout.

Use secure cookies in production.

Avoid storing sensitive information inside client-accessible storage.

---

# Performance Philosophy

Performance is a feature.

The application should feel fast even as content grows.

Every optimization should improve user experience without sacrificing maintainability.

---

# Rendering Strategy

Prefer:

Server Components

Server Rendering

Static Rendering when appropriate

Client Components only when interactivity is required.

Reduce unnecessary client-side JavaScript.

---

# Image Optimization

Artwork images should use the Next.js Image component whenever practical.

Requirements:

Responsive images.

Lazy loading.

Optimized formats.

Appropriate dimensions.

Prioritize visible artwork images.

---

# Data Fetching

Only request the data required for a page.

Avoid:

Over-fetching

Repeated queries

Unnecessary client requests

Prefer server-side data fetching whenever possible.

---

# Database Performance

Optimize queries before optimizing hardware.

Guidelines:

Select only required fields.

Avoid duplicate queries.

Use pagination for large datasets.

Create indexes for frequently queried columns.

Monitor query performance as the project grows.

---

# Caching Strategy

Future caching should support:

Artwork pages.

Collections.

Stories.

Public homepage.

Avoid caching personalized Studio content unless explicitly required.

---

# Scalability

The architecture should support growth without major redesign.

Future growth includes:

More artworks.

More visitors.

More collections.

Larger image libraries.

Additional features.

Scalability should be achieved through clean architecture rather than premature optimization.

---

# Storage Strategy

Business logic should never depend directly on a storage provider.

Create an abstraction layer for file storage.

Version 1:

Local storage during development.

Future:

Cloudinary

AWS S3

Supabase Storage

Migration should require configuration changes rather than business logic changes.

---

# Logging Strategy

Development

Console logging is acceptable.

Production

Use structured logging.

Every important event should include:

Timestamp

Action

User ID (if authenticated)

Result

Relevant metadata

Never log:

Passwords

Secrets

Tokens

Sensitive personal information

---

# Monitoring

Future production deployments should support:

Application monitoring.

Performance monitoring.

Error tracking.

Usage analytics.

Monitoring should identify problems before users report them.

---

# Backup Strategy

The database should support regular backups.

Uploaded assets should also be backed up.

Recovery procedures should be documented.

Business-critical information should never rely on a single storage location.

---

# Deployment Strategy

Development

Local machine.

↓

Testing

Preview deployment.

↓

Production

Vercel

Managed PostgreSQL

External Storage

Every deployment should be reproducible.

Avoid manual production changes.

---

# Environment Separation

Maintain separate environments for:

Development

Testing

Production

Configuration should change through environment variables rather than source code modifications.

---

# Production Readiness Checklist

Before every production deployment verify:

✓ Authentication works.

✓ Authorization is enforced.

✓ Validation exists.

✓ Secrets are protected.

✓ Environment variables are configured.

✓ Database migrations have been applied.

✓ Images load correctly.

✓ Error handling is complete.

✓ Responsive design verified.

✓ Accessibility verified.

✓ Performance acceptable.

✓ Logging enabled.

✓ No debug code remains.

Only after completing this checklist should a deployment be considered production-ready.

# Code Quality Standards

Every line of code should improve the project.

Code is written once but read many times.

Prioritize:

- Readability
- Maintainability
- Simplicity
- Consistency

Avoid clever solutions that make future maintenance difficult.

If a simpler implementation exists without sacrificing quality, prefer the simpler solution.

---

# Clean Code Principles

Follow these principles throughout the project.

## Single Responsibility

Each file, function, and component should have one clear responsibility.

Avoid files that perform multiple unrelated tasks.

---

## Meaningful Naming

Names should clearly communicate purpose.

Good

ArtworkCard

CommissionRequestForm

ArtworkRepository

StoryService

Bad

Data

Helper

Util

Thing

Manager

Names should eliminate the need for additional explanation.

---

## Small Functions

Functions should perform one task.

Prefer multiple small functions over one large function.

Functions should remain easy to understand without excessive scrolling.

---

## Avoid Duplication

Business logic should exist only once.

If logic is repeated:

Extract it.

Reuse it.

Maintain one source of truth.

---

## Composition Over Duplication

Prefer building reusable components by composing smaller pieces.

Avoid copying existing components to create similar functionality.

---

# Naming Conventions

Maintain consistency throughout the codebase.

## Components

PascalCase

Examples

ArtworkCard

StoryPreview

NavigationMenu

---

## Files

Match the exported component or module whenever practical.

---

## Variables

camelCase

---

## Constants

UPPER_SNAKE_CASE only for true constants.

---

## Database Models

Singular nouns.

Examples

User

Artwork

Collection

Story

Order

Commission

---

## Database Fields

camelCase

Examples

createdAt

updatedAt

publishedAt

primaryImage

---

## Routes

Use lowercase.

Prefer descriptive paths.

Examples

/gallery

/shop

/stories

/studio/artworks

---

# Import Standards

Group imports consistently.

1. Framework imports

2. Third-party libraries

3. Internal modules

4. Relative imports

Remove unused imports immediately.

Avoid circular dependencies.

---

# File Organization

Files should remain easy to navigate.

Prefer one responsibility per file.

Avoid creating extremely large files.

When a file becomes difficult to navigate, split responsibilities into smaller modules.

---

# Comments

Code should explain itself whenever possible.

Use comments only when explaining:

Business decisions

Complex algorithms

Important architectural reasoning

Avoid comments that simply repeat the code.

Bad

// increment counter

counter++

Good

// Maintain artwork ordering after deletion.

---

# Documentation

Major modules should include documentation describing:

Purpose

Responsibilities

Important assumptions

Expected behavior

Architecture should be documented rather than relying on tribal knowledge.

---

# Git Workflow

Use meaningful commit messages.

Good examples

feat: add artwork publishing workflow

fix: prevent duplicate commission submissions

refactor: extract artwork service

docs: update technical steering

Avoid generic messages such as:

update

changes

fix

work

---

# Branching Strategy

For personal development:

main

Production-ready code.

feature/*

New functionality.

fix/*

Bug fixes.

refactor/*

Internal improvements.

Future contributors should follow the same convention.

---

# Testing Philosophy

Version 1 prioritizes manual testing.

Before marking any feature complete verify:

Happy path

Validation errors

Empty states

Loading states

Authorization

Responsive layout

Accessibility

As the application grows, automated testing can be introduced.

Architecture should remain testable from the beginning.

---

# Code Reviews

Before merging any feature ask:

Is the code readable?

Does it duplicate logic?

Can another developer understand it quickly?

Does it follow project architecture?

Is validation complete?

Is authorization enforced?

Does it introduce unnecessary complexity?

Every review should prioritize long-term maintainability.

---

# Refactoring

Refactoring is encouraged when it improves:

Readability

Maintainability

Reusability

Consistency

Do not refactor solely for personal preference.

Every refactor should provide measurable improvement.

---

# Dependency Management

Before adding a dependency ask:

Does Next.js already solve this?

Can existing project code solve it?

Is the dependency actively maintained?

Does it improve developer experience?

Does it reduce complexity?

Avoid dependency bloat.

---

# AI Coding Guidelines

AI assistants contributing to KArt must follow these rules.

Understand the existing architecture before generating code.

Reuse existing patterns.

Avoid introducing new architectural styles.

Never bypass Services or Repositories.

Do not duplicate business logic.

Prefer consistency over novelty.

Respect documented folder responsibilities.

Avoid generating unnecessary abstractions.

Generate production-quality code rather than prototype code.

When uncertain, follow the existing implementation instead of inventing a new pattern.

---

# Common Anti-Patterns

Avoid the following.

Business logic inside React components.

Prisma queries inside UI.

Large components exceeding a single responsibility.

Deeply nested conditional rendering.

Repeated validation logic.

Repeated database queries.

Copy-pasted components.

Unused dependencies.

Unused state.

Magic numbers.

Hardcoded secrets.

Excessive use of any.

Large utility files containing unrelated functions.

Introducing libraries without clear justification.

Every anti-pattern increases future maintenance cost.

---

# Engineering Review Checklist

Every completed feature should satisfy:

Architecture

✓ Correct layer responsibilities

✓ Business logic isolated

✓ Repositories used correctly

✓ Services remain framework-independent

Code Quality

✓ Readable

✓ Maintainable

✓ Reusable

✓ Minimal duplication

✓ Meaningful naming

Security

✓ Authentication verified

✓ Authorization verified

✓ Validation complete

✓ Sensitive information protected

Frontend

✓ Responsive

✓ Accessible

✓ Loading state

✓ Empty state

✓ Error state

Database

✓ Efficient queries

✓ Proper relationships

✓ Transactions where required

✓ No duplicated data

Deployment

✓ Environment variables configured

✓ No debug code

✓ Production ready

Only after satisfying this checklist should a feature be considered complete.

---

# Technical Decision Framework

When multiple implementation approaches exist, evaluate them using the following priorities.

1. Correctness

The solution must work reliably.

2. Maintainability

Future developers should understand it quickly.

3. Simplicity

Prefer the simplest effective solution.

4. Consistency

Match existing architecture and coding standards.

5. Scalability

Support future growth without unnecessary redesign.

6. Performance

Optimize only after correctness and maintainability.

Do not sacrifice readability for premature optimization.

---

# Final Engineering Statement

KArt is intended to demonstrate professional software engineering rather than simply technical capability.

Every architectural decision, coding standard, dependency, and implementation should contribute to a codebase that is:

- Clean
- Maintainable
- Secure
- Scalable
- Consistent
- Production-ready

Technology choices may evolve over time, but these engineering principles should remain stable.

When uncertainty exists, choose the implementation that improves clarity, maintainability, and long-term sustainability.

The goal is not to write the most code.

The goal is to build software that another engineer would enjoy working on.