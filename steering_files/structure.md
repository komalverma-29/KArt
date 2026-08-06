# KArt Project Structure

> Version: 1.0
> Project: KArt
> Document Type: Project Structure
> Status: Active

---

# Purpose

This document defines the organizational structure of the KArt codebase.

Its purpose is to ensure that every file has a clear location, every folder has a defined responsibility, and the project remains maintainable as it grows.

This document complements:

- `product.md` — defines what KArt is.
- `tech.md` — defines how KArt is built.
- `structure.md` — defines where everything belongs.

Every contributor should consult this document before adding new files or directories.

---

# Structure Philosophy

The structure of KArt should make the codebase easy to understand, navigate, and extend.

A developer unfamiliar with the project should be able to locate any feature without unnecessary searching.

The project prioritizes:

- Predictability
- Consistency
- Separation of concerns
- Feature organization
- Scalability
- Low coupling
- High cohesion

The folder structure should reflect the architecture of the application rather than the order in which features were developed.

---

# Organizational Principles

## Principle 1 — One Responsibility Per Folder

Every folder should have one clearly defined responsibility.

Examples:

- Routes belong in `app`
- Business logic belongs in `services`
- Database access belongs in `repositories`
- Validation belongs in `schemas`

Avoid folders that mix unrelated concerns.

---

## Principle 2 — Features Own Their Logic

Each business feature should own its supporting files.

Examples:

Artwork

Collection

Order

Commission

Story

User

As new functionality is introduced, it should extend the appropriate feature rather than introducing duplicate structures.

---

## Principle 3 — Shared Only When Truly Shared

Code should only be placed in shared folders when it is genuinely reusable.

Avoid moving code into shared folders simply to reduce file count.

Premature abstraction often increases complexity.

---

## Principle 4 — Predictable Navigation

Developers should be able to predict where a file belongs.

If multiple locations appear equally valid, the structure should be reconsidered.

---

## Principle 5 — Scalable Growth

The project should support years of growth without requiring major restructuring.

New features should integrate naturally into the existing organization.

---

# Root Directory

The project uses the following top-level structure.

```text
kart/

├── specs/
├── steering_files/
├── prisma/
├── public/
├── src/
├── .env.example
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
```

---

# Root Directory Responsibilities

## steering_files/

Steering documents, per the Authority Hierarchy in `development_rules.md`.

Contains:

- `product.md`
- `tech.md`
- `structure.md`
- `development_rules.md`

These define what KArt is, how it is built, where things belong, and how contributors work. They take priority over the contents of `specs/`.

Application code should never be placed here.

---

## specs/

Specification documents, per the Authority Hierarchy in `development_rules.md`.

Contains:

- `requirements.md`
- `design.md`
- `tasks.md`

These implement the steering documents and must never contradict them. Architecture Decision Records (ADRs), if introduced later, also belong here.

Application code should never be placed here.

---

## prisma/

Database schema.

Responsibilities:

- Prisma schema
- Database migrations
- Seed scripts (future)

This folder is owned exclusively by Prisma.

---

## public/

Static assets.

Examples:

- Logos
- Favicon
- Static illustrations
- Public icons

Artwork uploaded by users should not be stored here in production.

---

## src/

Contains all application source code.

Every application feature belongs somewhere inside this directory.

No production application code should exist outside `src`.

---

# Source Structure

```text
src/

├── app/
├── components/
├── features/
├── services/
├── repositories/
├── schemas/
├── types/
├── hooks/
├── lib/
├── config/
├── constants/
├── styles/
└── generated/ (if required)
```

---

# Why src?

Keeping application code inside `src` provides a clear separation between source code, configuration, documentation, and generated assets.

It also keeps the project organized as additional tooling is introduced.

---

# App Router Organization

The application uses the Next.js App Router.

Routes are grouped by purpose rather than by feature.

```text
app/

(public)/
(studio)/
(auth)/
api/
```

---

# Public Route Group

Contains all pages visible to visitors.

Examples:

- Home
- Gallery
- Collections
- Shop
- Artwork Details
- Stories
- About
- Commissions
- Contact

These routes should never expose administrative functionality.

---

# Studio Route Group

Contains authenticated artist functionality.

Examples:

- Dashboard
- Artworks
- Collections
- Orders
- Shop
- Stories
- Insights
- Settings

Every route inside this group requires authentication.

---

# Auth Route Group

Contains authentication-related pages.

Examples:

- Sign In
- Sign Out
- Authentication callbacks

Authentication logic should remain isolated from business features.

---

# API Routes

Route Handlers should only be created when HTTP endpoints are required.

Examples:

- Webhooks
- Third-party integrations
- Future public APIs

Avoid creating Route Handlers for functionality that can be handled with Server Actions.

---

# Module Ownership

Every major business concept owns a dedicated module.

Initial modules include:

- Artwork
- Collection
- Story
- Order
- Commission
- User
- Shop

Each module should evolve independently while following shared architectural rules.

---

# Directory Ownership Rules

Every directory has an owner.

Only that directory is responsible for its concern.

Example:

`services/`

Owns business logic.

It does not own UI.

It does not own database queries.

Likewise,

`repositories/`

Owns persistence.

It does not contain business rules.

Clearly defined ownership reduces coupling and prevents architectural drift.

---

# Structure Goals

The structure should make it easy to answer questions such as:

- Where does this file belong?
- Which module owns this logic?
- Can this code be reused?
- Is this responsibility already implemented elsewhere?

If the answer is unclear, the structure should be improved before the project grows further.

# Source Directory Structure

The `src` directory contains all application source code.

```
src/
├── app/
├── components/
├── features/
├── services/
├── repositories/
├── schemas/
├── types/
├── hooks/
├── lib/
├── config/
├── constants/
├── styles/
└── generated/
```

Every folder has a clearly defined responsibility.

Code should never be placed into a folder simply because it "fits."

---

# app/

Purpose

Owns routing and page composition.

Responsibilities

- Routes
- Layouts
- Route groups
- Metadata
- Loading UI
- Error pages

Example

```
app/

(public)/
(studio)/
(auth)/

layout.tsx
page.tsx
loading.tsx
error.tsx
not-found.tsx
```

The App Router should only coordinate pages.

Business logic should never be implemented here.

---

# components/

Purpose

Contains reusable interface components.

Structure

```
components/

ui/
layout/
gallery/
studio/
shared/
feedback/
forms/
```

---

## ui/

Low-level reusable components.

Examples

```
Button

Input

Card

Dialog

Badge

Avatar

Tooltip
```

These components should never contain business logic.

---

## layout/

Shared layout components.

Examples

```
Header

Footer

Container

Sidebar

Navigation

Section
```

These components define page structure.

---

## gallery/

Components shared by gallery-related pages.

Examples

```
ArtworkCard

ArtworkGrid

ArtworkPreview

ArtworkCarousel

ArtworkFilter
```

These components should remain presentation-focused.

---

## studio/

Studio-specific reusable components.

Examples

```
ArtworkTable

SidebarNavigation

StatsCard

QuickActions

OrderCard
```

Studio components should not contain business rules.

---

## forms/

Reusable form building blocks.

Examples

```
ImageUploader

RichTextEditor

PriceInput

TagSelector

AvailabilitySelector
```

Business validation belongs inside schemas and services.

---

## feedback/

User feedback components.

Examples

```
LoadingSpinner

EmptyState

ErrorState

SuccessBanner

Skeleton
```

Every asynchronous feature should use these components consistently.

---

## shared/

Reusable components that do not belong to another category.

Examples

```
Logo

ThemeToggle

ThemeProvider

Breadcrumb
```

Only place components here if they are genuinely shared.

---

# features/

Purpose

Contains feature-specific UI and logic.

Structure

```
features/

artworks/
collections/
stories/
shop/
orders/
commissions/
users/
```

Each feature owns its supporting files.

Example

```
features/

artworks/

components/
hooks/
utils/
constants/
```

Feature folders should not contain database access.

---

# services/

Purpose

Contains business logic.

Structure

```
services/

artwork/
collection/
story/
order/
commission/
user/
```

Example

```
services/

artwork/

ArtworkService.ts
ArtworkPublishingService.ts
ArtworkPricingService.ts
```

Responsibilities

- Business rules
- Workflows
- Permission checks
- Data transformation

Services should never:

- Render UI
- Call React hooks
- Access browser APIs

---

# repositories/

Purpose

Owns database communication.

Structure

```
repositories/

artwork/
collection/
story/
order/
commission/
user/
```

Example

```
ArtworkRepository.ts

OrderRepository.ts
```

Responsibilities

- Prisma queries
- CRUD operations
- Transactions
- Database optimization

Repositories must never contain business logic.

---

# schemas/

Purpose

Contains Zod validation schemas.

Structure

```
schemas/

artwork/
collection/
story/
order/
commission/
auth/
shared/
```

Examples

```
CreateArtworkSchema

UpdateArtworkSchema

CommissionRequestSchema
```

Schemas define the shape of external input.

---

# types/

Purpose

Contains shared TypeScript types.

Examples

```
Artwork.ts

Order.ts

Collection.ts

Commission.ts

ApiResponse.ts
```

Avoid duplicating types across features.

Shared types belong here.

Feature-specific types should remain inside the feature folder.

---

# hooks/

Purpose

Contains reusable React hooks.

Examples

```
useDebounce

useImageUpload

useLocalStorage

useMediaQuery
```

Rules

Hooks should:

- Be reusable
- Be independent
- Avoid business logic

Do not create hooks for one-time use.

---

# lib/

Purpose

Contains infrastructure and framework integrations.

Examples

```
auth.ts

prisma.ts

cloudinary.ts

logger.ts

email.ts

utils.ts
```

The `lib` folder is **not** a miscellaneous folder.

Every file inside should provide infrastructure shared across the application.

---

# config/

Purpose

Application configuration.

Examples

```
site.ts

navigation.ts

theme.ts

metadata.ts
```

Configuration should remain static.

Avoid placing business logic here.

---

# constants/

Purpose

Shared constants.

Examples

```
roles.ts

routes.ts

artwork.ts

pagination.ts
```

Only true constants belong here.

Dynamic values should not.

---

# styles/

Purpose

Global styling.

Examples

```
globals.css

theme.css

animations.css
```

Component-specific styles should remain inside components whenever practical.

---

# generated/

Purpose

Generated code.

Examples

```
Prisma Client

Generated Types
```

Never manually edit generated files.

Regenerate them instead.

---

# Folder Boundaries

Each folder owns one responsibility.

Folder | Owns | Must Never Own
------ | ---- | ---------------
app | Routing | Business Logic
components | UI | Database Access
features | Feature UI | Prisma Queries
services | Business Rules | React Components
repositories | Database | Business Logic
schemas | Validation | UI
types | Shared Types | Business Logic
hooks | Reusable Hooks | Database Access
lib | Infrastructure | Feature Logic
config | Configuration | Dynamic Data

Violating these boundaries creates unnecessary coupling.

---

# Structure Checklist

Before creating a new file ask:

✓ Does a folder already own this responsibility?

✓ Can an existing module be extended?

✓ Is this feature-specific or shared?

✓ Does this follow existing organization?

✓ Will another developer immediately know where to find it?

If the answer is "No", reconsider the file placement before creating it.

# Naming Standards

Consistency is more important than personal preference.

Every file, folder, component, and module should follow the same naming conventions.

Developers should never have to guess how something should be named.

---

# Folder Naming

Folders should use:

lowercase

Examples

```
artworks
collections
commissions
orders
stories
users
gallery
```

Avoid:

```
Artwork
ArtworkModule
MyFolder
misc
```

Folder names should describe the responsibility they contain.

---

# File Naming

File names should clearly describe their contents.

Examples

```
ArtworkCard.tsx
ArtworkGrid.tsx
ArtworkRepository.ts
ArtworkService.ts
CreateArtworkSchema.ts
useImageUpload.ts
```

Avoid vague names.

Bad

```
helper.ts
utils.ts
service.ts
temp.ts
new.ts
```

---

# Component Naming

React components use PascalCase.

Examples

```
ArtworkCard
ArtworkGallery
ArtworkPreview
CommissionForm
StudioSidebar
```

One file should export one primary component.

---

# Hook Naming

Hooks must begin with **use**.

Examples

```
useDebounce
useImageUpload
useMediaQuery
useArtworkFilters
```

Hooks should describe behavior rather than implementation.

---

# Service Naming

Services should clearly describe their domain.

Examples

```
ArtworkService
OrderService
CommissionService
StoryService
```

If responsibilities grow, split services.

Example

```
ArtworkPublishingService
ArtworkPricingService
ArtworkImageService
```

Avoid creating one massive service.

---

# Repository Naming

Repositories correspond directly to business entities.

Examples

```
ArtworkRepository
CollectionRepository
OrderRepository
```

Repositories should never include unrelated database operations.

---

# Schema Naming

Validation schemas should describe the operation they validate.

Examples

```
CreateArtworkSchema
UpdateArtworkSchema
DeleteArtworkSchema
CommissionRequestSchema
```

Avoid generic schema names.

---

# Type Naming

Interfaces and types should represent business concepts.

Examples

```
Artwork
Collection
Order
Commission
ArtworkStatus
AvailabilityType
```

Avoid unnecessary prefixes.

Bad

```
IArtwork
TArtwork
```

---

# Constants Naming

Constants should be descriptive.

Examples

```
ARTWORK_CATEGORIES

MAX_UPLOAD_SIZE

SUPPORTED_IMAGE_TYPES

DEFAULT_PAGE_SIZE
```

Magic numbers should never appear inside business logic.

---

# Import Organization

Imports should always follow the same order.

```
Framework

↓

Third-party libraries

↓

Internal aliases

↓

Relative imports
```

Example

```ts
import Image from "next/image";

import { z } from "zod";

import { ArtworkService } from "@/services/artwork";

import "./styles.css";
```

Maintain one blank line between groups.

---

# Path Aliases

Prefer aliases over deep relative imports.

Good

```ts
import { ArtworkCard } from "@/components/gallery";
```

Avoid

```ts
import ArtworkCard from "../../../../components/gallery";
```

Aliases improve readability and simplify refactoring.

---

# Barrel Files

Use `index.ts` only when it improves discoverability.

Appropriate

```
components/ui/index.ts

services/index.ts
```

Avoid creating unnecessary barrel files that hide project structure.

---

# Shared vs Feature Code

Before creating shared code ask:

Can another feature realistically reuse this?

If not, keep it inside the feature.

Examples

Shared

```
Button

Input

Dialog

ImageUploader

LoadingSpinner
```

Feature-specific

```
ArtworkGallery

ArtworkPricingForm

CommissionStatusCard
```

Premature sharing increases complexity.

---

# Asset Organization

Static assets belong inside `public`.

Examples

```
public/

logo.svg

favicon.ico

placeholder.jpg

icons/
```

Feature-specific images used during development should remain close to the feature until they become shared assets.

---

# Environment Files

Environment files belong at the project root.

```
.env.local

.env.example
```

Never commit secrets.

Every required variable should be documented inside `.env.example`.

---

# Documentation Organization

Documentation belongs inside:

```
steering_files/
specs/
```

Structure

```
steering_files/

  product.md
  tech.md
  structure.md
  development_rules.md

specs/

  requirements.md
  design.md
  tasks.md
```

Avoid mixing documentation with application code.

---

# Dependency Rules

Dependencies should always point downward through the architecture.

Allowed

```
Component

↓

Service

↓

Repository

↓

Prisma
```

Forbidden

```
Repository

↓

Component
```

or

```
Service

↓

React Hook
```

Lower layers must never depend on higher layers.

---

# Circular Dependencies

Circular dependencies are prohibited.

Bad

```
ArtworkService

↓

OrderService

↓

ArtworkService
```

If circular dependencies appear, reconsider module boundaries.

---

# Internal Module Communication

Modules should communicate through Services.

Example

Artwork needs Orders

Correct

```
ArtworkService

↓

OrderService
```

Incorrect

```
ArtworkRepository

↓

OrderRepository

↓

ArtworkRepository
```

Business coordination belongs in Services.

---

# File Growth Strategy

When a file exceeds a reasonable level of complexity:

Split it by responsibility.

Examples

```
ArtworkService

↓

ArtworkPublishingService

ArtworkPricingService

ArtworkImageService
```

Favor small, focused modules over large multi-purpose files.

---

# Code Ownership

Each module owns its internal implementation.

Other modules should interact only through public interfaces.

Avoid reaching into another module's internal files.

---

# Structure Consistency Checklist

Before creating a file verify:

✓ Correct folder

✓ Correct naming

✓ Correct responsibility

✓ Correct dependency direction

✓ No duplication

✓ No circular dependency

✓ Appropriate level of sharing

✓ Consistent with existing modules

Every new file should strengthen the project's organization rather than weaken it.

# Growth Strategy

The structure of KArt is designed to support long-term growth.

New features should integrate into the existing architecture rather than introducing new organizational patterns.

Whenever possible, extend existing modules before creating new ones.

Growth should be incremental and predictable.

---

# Adding New Features

Every new feature should follow the existing project structure.

Example workflow:

1. Identify the business domain.

2. Determine whether an existing module owns the functionality.

3. Extend the module if appropriate.

4. Create new files only when responsibilities become too large.

Avoid creating new top-level folders without a clear architectural reason.

---

# Module Expansion

Business modules are expected to grow over time.

Example

Artwork module today

- Artwork
- Gallery
- Availability

Future

- Prints
- Digital Downloads
- Licensing
- Certificates
- Analytics

All of these remain part of the Artwork domain.

Do not separate them into unrelated modules unless responsibilities fundamentally change.

---

# Refactoring Rules

Refactoring is encouraged when it improves:

- Readability
- Maintainability
- Separation of concerns
- Reusability
- Consistency

Refactoring should never change business behavior unless explicitly intended.

Large refactors should occur incrementally.

---

# Folder Evolution

Folders should evolve naturally.

Example

Instead of

```
services/

ArtworkService.ts
```

Eventually

```
services/

artwork/

ArtworkService.ts

ArtworkPublishingService.ts

ArtworkPricingService.ts

ArtworkImageService.ts
```

Splitting by responsibility is preferred over creating very large files.

---

# Shared Code Evolution

Code should become shared only after repeated use.

Recommended process

Feature-specific

↓

Used in two places

↓

Evaluate

↓

Move to shared location

Avoid premature abstraction.

---

# AI Contribution Rules

AI-generated code must follow the documented architecture.

AI should:

Read existing patterns before generating code.

Reuse existing modules whenever possible.

Follow established naming conventions.

Respect folder ownership.

Prefer extending existing files over creating duplicates.

Keep implementations simple and readable.

Generate production-quality code.

AI must never:

Introduce new architectural styles.

Bypass Services or Repositories.

Place business logic inside UI components.

Duplicate validation.

Create miscellaneous folders.

Ignore documented project standards.

Consistency is more important than novelty.

---

# Contributor Guidelines

Every contributor should understand:

- Product goals
- Technical architecture
- Folder responsibilities
- Naming conventions
- Engineering principles

New contributors should review:

1. product.md

2. tech.md

3. structure.md

before implementing new functionality.

---

# Common Structural Anti-Patterns

Avoid:

Large "utils" folders.

Large "helpers" folders.

Business logic inside components.

Database queries inside pages.

Copy-pasted modules.

Circular dependencies.

Feature code inside shared folders.

Multiple files owning the same responsibility.

Creating folders named:

misc

temp

new

old

backup

These names do not communicate responsibility.

---

# Review Checklist

Before merging any feature, verify:

Architecture

✓ Correct folder placement

✓ Correct dependency direction

✓ Single responsibility

✓ Consistent naming

Modules

✓ Existing module reused where appropriate

✓ No duplicate implementations

✓ Clear ownership

Frontend

✓ UI separated from business logic

✓ Reusable components extracted

✓ Shared components remain generic

Backend

✓ Services contain business rules

✓ Repositories contain persistence logic

✓ Validation implemented

Database

✓ Correct entity ownership

✓ Efficient queries

✓ Proper relationships

Maintainability

✓ Readable structure

✓ Predictable organization

✓ Minimal coupling

✓ High cohesion

If any item fails, reconsider the implementation before merging.

---

# Structure Decision Framework

When deciding where new code belongs, apply the following order:

1. Responsibility

Which layer owns this concern?

2. Existing Module

Can an existing module be extended?

3. Reusability

Should this remain feature-specific or become shared?

4. Simplicity

Which placement keeps the structure easiest to understand?

5. Consistency

Does this match existing project organization?

Always prefer consistency over personal preference.

---

# Future Evolution

Version 1 establishes the foundation of KArt.

Future versions may introduce:

- Multi-artist support
- Customer accounts
- Print management
- Inventory tracking
- Digital downloads
- Payments
- Notifications
- Reviews
- Wishlist
- Admin roles
- Internationalization
- Analytics

The existing structure should support these additions without major reorganization.

---

# Definition of a Well-Structured Project

A well-structured project allows any developer to answer the following questions immediately:

- Where should a new file be created?
- Which module owns this functionality?
- Where does business logic belong?
- Where is validation performed?
- Where is database access implemented?
- What can be safely reused?
- What should remain isolated?

If these questions cannot be answered easily, the structure should be improved.

---

# Final Structural Statement

The structure of KArt is intentionally designed to scale from a personal artist portfolio into a complete artist business platform.

Folders exist to communicate responsibility, not simply to organize files.

Every directory, module, and file should have a clear purpose that aligns with the product vision and technical architecture.

As the project grows, new functionality should strengthen the existing structure rather than compete with it.

A clean structure is not achieved by having fewer files.

A clean structure is achieved when every file has an obvious home, every responsibility has a clear owner, and every contributor can confidently extend the project without introducing confusion.