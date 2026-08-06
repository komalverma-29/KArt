# KArt Implementation Tasks

> Version: 1.0
> Project: KArt
> Document Type: Implementation Tasks
> Status: Draft
> Derived From: design.md (Design Document) and requirements.md (SRS)

---

# Purpose

This document breaks the KArt Version 1 design into an ordered, hierarchical implementation plan.

It does not introduce any functionality beyond what is defined in `design.md` and the SRS. It does not redesign architecture, folder structure, or data model — it sequences the work required to build what has already been designed.

Structure: **Epic → Feature → Task → Subtask**

- **Epic** — a implementation phase (maps to a layer or a group of related SRS modules).
- **Feature** — a single SRS module (e.g., Artwork Management, Order Management).
- **Task** — a unit of work within one architectural layer (schema, repository, service, validation, action, UI).
- **Subtask** — a concrete implementation step within a task.

Every Feature and every major Task cites the SRS Functional Requirement (FR-), Business Rule (BR-), or Non-Functional Requirement (NFR-) it satisfies, and the design.md section it implements.

---

# Notes on Traceability

- FR IDs are copied verbatim from the SRS. The SRS uses the prefix `FR-COM-` for **two different modules**: Section 4.10 "Commission Management" (FR-COM-001 … FR-COM-010) and Section 6 "Common Functional Behaviors" (FR-COM-001 … FR-COM-014). This document disambiguates them as `FR-COM-00x (Commission)` and `FR-COM-00x (Common)` respectively — this is a documentation artifact of the SRS itself, not a design or task numbering error.
- "design.md §N" references point to the corresponding section of the Design Document.
- Tasks are ordered so that dependencies are always satisfied: **Database → Repository → Service → Validation Schema → Server Action / Route Handler → UI**, per the layered architecture in design.md §3.

---

# Epic 0 — Project Foundation & Environment Setup

Establishes the base project so every later Epic has a working foundation. No SRS functional requirement is implemented in this Epic; it is purely scaffolding required by `tech.md` and `structure.md`.

## Feature 0.1 — Project Scaffolding

- [ ] Task 0.1.1 — Initialize Next.js 15 (App Router) + TypeScript project
  - [ ] Subtask: Configure `tsconfig.json` (strict mode, path aliases per structure.md §Path Aliases)
  - [ ] Subtask: Install Tailwind CSS v4 and configure design tokens per product.md Visual Identity
  - [ ] Subtask: Install and configure shadcn/ui, Lucide React
- [ ] Task 0.1.2 — Create base folder structure exactly as defined in design.md §9
  - [ ] Subtask: Create `app/(public)`, `app/(studio)`, `app/(auth)`, `app/api`
  - [ ] Subtask: Create `components/{ui,layout,gallery,studio,forms,feedback,shared}`
  - [ ] Subtask: Create `features/`, `services/`, `repositories/`, `schemas/`, `types/`, `hooks/`, `lib/`, `config/`, `constants/`, `styles/`
- [ ] Task 0.1.3 — Environment configuration
  - [ ] Subtask: Create `.env.example` documenting `DATABASE_URL`, `AUTH_SECRET`, storage config keys (design.md §13.5)
  - [ ] Subtask: Configure `lib/prisma.ts`, `lib/logger.ts`, `lib/utils.ts` stubs

**Acceptance Criteria**
- Project builds successfully with no functional pages.
- Folder layout matches design.md §9 exactly.
- No secrets committed to version control.

## Feature 0.2 — Database & ORM Setup

- [ ] Task 0.2.1 — Provision local PostgreSQL instance
- [ ] Task 0.2.2 — Initialize Prisma (`prisma/schema.prisma`, datasource, generator)

**Acceptance Criteria**
- `prisma migrate dev` runs successfully against an empty schema.

---

# Epic 1 — Database Schema & Domain Model

Implements the full Prisma schema from design.md §5 in dependency order: enums → independent entities → dependent/join entities. **Nothing in Epic 2 onward may begin until the corresponding model in this Epic is migrated.**

## Feature 1.1 — Enums

- [ ] Task 1.1.1 — Define `ContentStatus`, `CategoryStatus`, `Availability` (design.md §5)
- [ ] Task 1.1.2 — Define `OrderStatus`, `PaymentStatus` (`PENDING`, `PAID`, `REFUNDED` — no `AWAITING_PAYMENT`, per design.md §4.6/§5.1 rationale), `PaymentMethod`
- [ ] Task 1.1.3 — Define `CommissionStatus`, `ContactStatus`
- [ ] Task 1.1.4 — Define `ActivityType` enum, scoped exactly to the eight values in design.md §5 (`ARTWORK_CREATED`, `ARTWORK_PUBLISHED`, `ARTWORK_ARCHIVED`, `STORY_PUBLISHED`, `COLLECTION_CREATED`, `CATEGORY_CREATED`, `ORDER_RECEIVED`, `COMMISSION_REQUEST_RECEIVED`) per FR-DASH-003

**Acceptance Criteria**
- All enum values match design.md §5 exactly; no additional values introduced.

## Feature 1.2 — Core Entities

- [ ] Task 1.2.1 — `Artist` model (design.md §5) — supports FR-SET-*, FR-AUTH-*, BR-001
- [ ] Task 1.2.2 — `Category` model — supports FR-CAT-*, BR-008
- [ ] Task 1.2.3 — `Collection` model — supports FR-COL-*, BR-007
- [ ] Task 1.2.4 — `Artwork` model, including `categoryId` FK and indexes (`status+availability`, `categoryId`) — supports FR-ART-*, BR-004

**Acceptance Criteria**
- Each model matches its design.md §5 definition field-for-field, including UUID primary keys, `createdAt`/`updatedAt`, and `deletedAt` where soft delete applies (BR-013).

## Feature 1.3 — Artwork-Dependent Entities

- [ ] Task 1.3.1 — `ArtworkImage` model, including `altText` (accessibility, NFR-ACC-002), `displayOrder`, `isPrimary` — supports FR-ART-014, FR-ART-015, FR-ART-016
- [ ] Task 1.3.2 — `Tag` and `ArtworkTag` join model — supports FR-ART-013 (Tags field)
- [ ] Task 1.3.3 — `ArtworkCollection` join model, including `displayOrder` for per-collection artwork arrangement — supports FR-COL-009, FR-COL-010, BR-007
- [ ] Task 1.3.4 — `Story` model and `StoryArtwork` join model — supports FR-STORY-*, FR-STORY-011

**Acceptance Criteria**
- `ArtworkImage.displayOrder` and `ArtworkCollection.displayOrder` are distinct fields with independent semantics, matching design.md §5.1.
- Every artwork can be validated to have at most one `isPrimary` image at the service layer (enforced in Epic 3, not the database).

## Feature 1.4 — Commerce Entities

- [ ] Task 1.4.1 — `Order`, `OrderItem` models, including price/title snapshots — supports FR-ORDER-*, BR-012
- [ ] Task 1.4.2 — `OrderStatusHistory` model — supports FR-ORDER-004
- [ ] Task 1.4.3 — `Payment` model (1:1 with Order), including `paymentReference` (vendor-neutral naming, design.md §5.1) — supports FR-PAY-*, BR-014

**Acceptance Criteria**
- `OrderItem.artworkId` is nullable with `onDelete: SetNull`; `artworkTitle` and `unitPrice` are always populated at creation time (BR-012).
- `Payment` is created automatically whenever an `Order` is created (enforced in Epic 4 service layer, schema only guarantees the 1:1 relation here).

## Feature 1.5 — Commission & Contact Entities

- [ ] Task 1.5.1 — `Commission`, `CommissionImage`, `CommissionStatusHistory` models — supports FR-COM-* (Commission)
- [ ] Task 1.5.2 — `ContactMessage` model — supports FR-CONTACT-*

## Feature 1.6 — Activity Log

- [ ] Task 1.6.1 — `ActivityLog` model referencing `ActivityType` enum — supports FR-DASH-003, NFR-LOG-001

## Feature 1.7 — Migration & Seed

- [ ] Task 1.7.1 — Generate initial migration covering all models in Features 1.1–1.6
- [ ] Task 1.7.2 — Write a minimal development seed script (one Artist account, no fabricated content) to unblock local development

**Acceptance Criteria**
- `prisma migrate dev` produces a single coherent initial migration.
- Prisma Client generates without errors.
- Schema exactly matches design.md §5 (field names, types, relations, indexes) with no additions or omissions.

---

# Epic 2 — Authentication & Authorization

Implements SRS §4.1 and design.md §6/§7.1/§13.1–13.2. Must complete before any Studio Feature (Epics 3–8) since every Studio Server Action requires a working auth check.

## Feature 2.1 — Auth Infrastructure

- [ ] Task 2.1.1 — Repository: `repositories/settings/ArtistRepository.ts` (find by email, update password hash) — shared by Auth and Settings domains per design.md §6
- [ ] Task 2.1.2 — Configure Auth.js with Credentials provider (`lib/auth.ts`)
  - [ ] Subtask: Configure secure, HTTP-only session cookies
  - [ ] Subtask: Configure session inactivity expiry (FR-AUTH-003)
- [ ] Task 2.1.3 — Service: `AuthService` wrapping Auth.js — validates credentials, never returns password hash (design.md §6, §13.1)

## Feature 2.2 — Login

**References:** FR-AUTH-001, FR-AUTH-002, FR-AUTH-003, VAL-AUTH-001..003

- [ ] Task 2.2.1 — Validation: `schemas/auth/LoginSchema.ts` (email required/valid, password required)
- [ ] Task 2.2.2 — Route Handler: `/api/auth/[...nextauth]` (design.md §7.2)
- [ ] Task 2.2.3 — UI: `(auth)/login/page.tsx` — masked password input, client + server validation, generic error message on failure (FR-AUTH-002, "Invalid email or password.")
- [ ] Task 2.2.4 — Redirect authenticated users to `/studio/dashboard` on success (FR-AUTH-001)

**Acceptance Criteria**
- Invalid credentials are rejected with a generic message; no indication of whether the email exists.
- Successful login redirects to the Dashboard and establishes a session.

## Feature 2.3 — Session & Route Protection

**References:** FR-AUTH-003, FR-AUTH-005, BR-003, NFR-SEC-001, NFR-SEC-003

- [ ] Task 2.3.1 — `middleware.ts` guarding all `(studio)` routes at the edge (design.md §13.2)
- [ ] Task 2.3.2 — `(studio)/layout.tsx` server-side session re-check (defense in depth)
- [ ] Task 2.3.3 — Shared Server Action auth guard used by every Studio Server Action (design.md §7.1 rule: "authenticate → validate → call Service")

**Acceptance Criteria**
- Any unauthenticated request to a Studio route is redirected to `/login` before rendering.
- Any Studio Server Action invoked without a valid session returns `{ success: false }` and performs no data mutation.

## Feature 2.4 — Logout

**References:** FR-AUTH-004

- [ ] Task 2.4.1 — Logout Server Action: destroy session, invalidate tokens, redirect to `/login`

## Feature 2.5 — Password Change

**References:** FR-AUTH-006, VAL-AUTH-004, VAL-AUTH-005

- [ ] Task 2.5.1 — Validation: `schemas/auth/ChangePasswordSchema.ts` (current password, new password policy, confirmation match)
- [ ] Task 2.5.2 — Service: `AuthService.changePassword()` — verifies current password, hashes new password
- [ ] Task 2.5.3 — Server Action: `changePasswordAction`
- [ ] Task 2.5.4 — UI: password change form inside Studio Settings (built out fully in Epic 8)

**Acceptance Criteria**
- Password change fails if current password is incorrect.
- User remains authenticated after a successful change.

## Feature 2.6 — Forgot / Reset Password

**References:** FR-AUTH-007

- [ ] Task 2.6.1 — Service: generate time-limited reset token, invalidate on use or expiry
- [ ] Task 2.6.2 — `lib/email.ts` — send reset link (transactional email integration point)
- [ ] Task 2.6.3 — Server Actions: `requestPasswordResetAction` (public), `resetPasswordAction` (token-based, public)
- [ ] Task 2.6.4 — UI: `(auth)/forgot-password/page.tsx`, `(auth)/reset-password/page.tsx`

**Acceptance Criteria**
- Expired or already-used reset links are rejected with a clear message.

## Feature 2.7 — Remember Me (Optional)

**References:** FR-AUTH-008

- [ ] Task 2.7.1 — Configurable persistent session option on login form, without weakening cookie security flags

---

# Epic 3 — Content Management

Implements the four publishable/organizational content modules. Category has no draft/publish lifecycle (Active/Archived only); Artwork, Collection, and Story share the Draft → Published → Archived lifecycle (BR-005) and the Common Behaviors defined in Epic 10 (search, filter, sort, pagination, soft delete) — those cross-cutting behaviors are implemented once in Epic 10 and wired into each module's list views here.

**Dependency order within this Epic:** Category → Artwork (depends on Category) → Collection (depends on Artwork) → Story (depends on Artwork).

## Feature 3.1 — Category Management

**References:** FR-CAT-001..010, BR-008, BR-013

- [ ] Task 3.1.1 — Repository: `CategoryRepository` (CRUD, unique-name lookup, artwork-count aggregation, active/archived filters)
- [ ] Task 3.1.2 — Service: `CategoryService`
  - [ ] Subtask: Enforce unique category name (VAL-CAT-002)
  - [ ] Subtask: Block permanent deletion while artwork is assigned (VAL-CAT-004, BR-008)
  - [ ] Subtask: Archive/restore logic (FR-CAT-004, FR-CAT-005)
- [ ] Task 3.1.3 — Validation: `CreateCategorySchema`, `UpdateCategorySchema`
- [ ] Task 3.1.4 — Server Actions: `createCategoryAction`, `updateCategoryAction`, `archiveCategoryAction`, `restoreCategoryAction`, `deleteCategoryAction`
- [ ] Task 3.1.5 — Studio UI: category list (name, artwork count, status, dates), create/edit form, archive/restore/delete controls with confirmation dialogs

**Acceptance Criteria**
- Duplicate category names are rejected with a field-specific error.
- Deleting a category with assigned artwork is blocked with a clear explanatory message.
- Archived categories cannot be assigned to new or existing artwork (VAL-CAT-003).

## Feature 3.2 — Artwork Management

**References:** FR-ART-001..024, BR-004, BR-005, BR-006, BR-007, BR-008, BR-009, BR-010, BR-013

- [ ] Task 3.2.1 — Repository: `ArtworkRepository` (CRUD, published/draft/archived filters, category/collection/tag joins, search)
- [ ] Task 3.2.2 — Repository: `ArtworkImageRepository` (add/remove/reorder images, set primary)
- [ ] Task 3.2.3 — Service: `ArtworkService`
  - [ ] Subtask: Create with Draft default status (FR-ART-001)
  - [ ] Subtask: Update editable fields (FR-ART-002)
  - [ ] Subtask: Category assignment validation — required, must be Active (FR-ART-017, VAL-ART-002, VAL-ART-006)
  - [ ] Subtask: Collection assignment (many-to-many) (FR-ART-018)
  - [ ] Subtask: Pricing rule — price required only when `forSale` is true, must not be negative (FR-ART-021, VAL-ART-003, VAL-ART-004)
  - [ ] Subtask: Featured flag toggling (FR-ART-019)
  - [ ] Subtask: Availability transitions (FR-ART-020)
  - [ ] Subtask: Duplicate artwork — new ID, Draft status, copies editable fields, excludes publication metadata (FR-ART-024)
- [ ] Task 3.2.4 — Service: `ArtworkPublishingService`
  - [ ] Subtask: `publish()` — requires exactly one primary image before publish is allowed (VAL-ART-005); requires `altText` present on that image (design.md §15.2); records `publishedAt` (FR-ART-005)
  - [ ] Subtask: `unpublish()` — reverts to Draft, existing orders unaffected (FR-ART-006)
  - [ ] Subtask: `archive()` / `restore()` (FR-ART-007, FR-ART-008)
  - [ ] Subtask: `softDelete()` / `permanentDelete()` with required confirmation flag (FR-ART-009, BR-013)
- [ ] Task 3.2.5 — Service: `ArtworkImageService`
  - [ ] Subtask: Upload validation delegated to `StorageService` (file type, size, integrity) (FR-ART-016)
  - [ ] Subtask: Multiple image support, reordering via `displayOrder` (FR-ART-014)
  - [ ] Subtask: Exactly-one-primary-image invariant (FR-ART-015)
- [ ] Task 3.2.6 — `services/storage/StorageService.ts` + `LocalStorageProvider.ts` abstraction (design.md §3.2, §13.4)
- [ ] Task 3.2.7 — Validation: `CreateArtworkSchema`, `UpdateArtworkSchema` (conditional price-required-when-forSale rule, design.md §12.1)
- [ ] Task 3.2.8 — Server Actions: `createArtworkAction`, `updateArtworkAction`, `saveArtworkDraftAction`, `publishArtworkAction`, `unpublishArtworkAction`, `archiveArtworkAction`, `restoreArtworkAction`, `softDeleteArtworkAction`, `permanentDeleteArtworkAction`, `duplicateArtworkAction`, `uploadArtworkImageAction`, `reorderArtworkImagesAction`, `setPrimaryArtworkImageAction`, `removeArtworkImageAction`
- [ ] Task 3.2.9 — Route Handler: `/api/uploads/artwork` (multipart image upload, design.md §7.2)
- [ ] Task 3.2.10 — Studio UI: `ArtworkForm` (title, description, story, category select, collection multi-select, availability selector, price input, featured toggle, tags), `ImageUploader` (drag/drop, reorder, set primary, alt text field), publish/unpublish/archive/restore/delete controls with confirmation dialogs

**Acceptance Criteria**
- Publishing without a primary image is prevented with a clear message (VAL-ART-005).
- Marking artwork "For Sale" without a price is prevented; price cannot be negative.
- Unpublishing removes the artwork from all public views immediately without breaking existing order history (BR-012).
- Duplicating an artwork produces a new Draft artwork with a new identifier.

## Feature 3.3 — Collection Management

**References:** FR-COL-001..015, BR-005, BR-006, BR-007, BR-009, BR-013

- [ ] Task 3.3.1 — Repository: `CollectionRepository` (CRUD, artwork assignment with `displayOrder`, published/draft/archived/featured filters)
- [ ] Task 3.3.2 — Service: `CollectionService`
  - [ ] Subtask: Create as Draft by default (FR-COL-001)
  - [ ] Subtask: Publish/archive/restore lifecycle (FR-COL-005, FR-COL-006, FR-COL-007); only Published artwork inside a Published collection is publicly visible (VAL-COL-004)
  - [ ] Subtask: Assign/remove artwork, prevent duplicate assignment (FR-COL-009, FR-COL-010, VAL-COL-003)
  - [ ] Subtask: Reorder artwork within a collection via `ArtworkCollection.displayOrder`, independent of image order and of the artwork's order in other collections (design.md §5.1)
  - [ ] Subtask: Cover image fallback — first published artwork's primary image if none set (FR-COL-011)
  - [ ] Subtask: Featured flag (FR-COL-012)
- [ ] Task 3.3.3 — Validation: `CreateCollectionSchema`, `UpdateCollectionSchema`
- [ ] Task 3.3.4 — Server Actions: `createCollectionAction`, `updateCollectionAction`, `publishCollectionAction`, `archiveCollectionAction`, `restoreCollectionAction`, `deleteCollectionAction`, `assignArtworkToCollectionAction`, `removeArtworkFromCollectionAction`, `reorderArtworksInCollectionAction`
- [ ] Task 3.3.5 — Studio UI: collection list, create/edit form, artwork assignment + drag-to-reorder UI, cover image picker

**Acceptance Criteria**
- A collection may be published even with zero artworks assigned (VAL-COL-004 scenario table).
- Removing an artwork from a collection does not affect the artwork itself.
- Reordering artwork within one collection has no effect on its position in any other collection.

## Feature 3.4 — Story Management

**References:** FR-STORY-001..014, BR-005, BR-006, BR-009, BR-013

- [ ] Task 3.4.1 — Repository: `StoryRepository` (CRUD, related-artwork joins, published/draft/archived/featured filters)
- [ ] Task 3.4.2 — Service: `StoryService`
  - [ ] Subtask: Create as Draft (FR-STORY-001)
  - [ ] Subtask: Publish/unpublish/archive/restore lifecycle, `publishedAt` recorded on publish (FR-STORY-005..008)
  - [ ] Subtask: Related artwork linking — only Published artwork displayed publicly (FR-STORY-011)
  - [ ] Subtask: Featured flag (FR-STORY-010)
- [ ] Task 3.4.3 — Validation: `CreateStorySchema`, `UpdateStorySchema` (title + content required, VAL-STORY-001/002)
- [ ] Task 3.4.4 — Server Actions: `createStoryAction`, `updateStoryAction`, `publishStoryAction`, `unpublishStoryAction`, `archiveStoryAction`, `restoreStoryAction`, `deleteStoryAction`
- [ ] Task 3.4.5 — Route Handler: `/api/uploads/story` (featured image upload)
- [ ] Task 3.4.6 — Studio UI: story list, `RichTextEditor`-based create/edit form (sanitized per design.md §13.3), related artwork selector, featured image uploader

**Acceptance Criteria**
- Publishing a story with empty title or content is prevented.
- Story content is sanitized before storage/render to prevent stored XSS (design.md §13.3).

---

# Epic 4 — Commerce & Fulfillment

Implements the Shop, Order, and Payment modules. **Dependency order:** Shop (purchase eligibility, depends on published Artwork from Epic 3) → Order (created by Shop) → Payment (created automatically with Order).

## Feature 4.1 — Shop

**References:** FR-SHOP-001..010, BR-004, BR-006, BR-010, BR-011

- [ ] Task 4.1.1 — Service: `ShopService`
  - [ ] Subtask: `listAvailableForSale()` — Published + For Sale artwork only (FR-SHOP-001)
  - [ ] Subtask: `isPurchasable()` — Published && forSale && Available (BR-011, FR-SHOP-005)
  - [ ] Subtask: `createOrderFromRequest()` — validates eligibility, delegates to `OrderService`/`OrderRepository`, auto-creates `Payment` (FR-SHOP-006, FR-PAY-001)
- [ ] Task 4.1.2 — Validation: `PurchaseRequestSchema` (customer name, valid email, shipping address required; VAL-SHOP-001..004)
- [ ] Task 4.1.3 — Server Action: `submitPurchaseRequestAction` (public)
- [ ] Task 4.1.4 — Studio-facing read: shop listing reuses `ArtworkRepository`/`ArtworkService` filtered views (no separate storage)

**Acceptance Criteria**
- An artwork missing any of Published / For Sale / Available never exposes a purchase action or accepts a purchase request.
- A successful submission creates exactly one `Order` and exactly one associated `Payment` (status `PENDING`).

## Feature 4.2 — Order Management

**References:** FR-ORDER-001..011, BR-012

- [ ] Task 4.2.1 — Repository: `OrderRepository`, `OrderItemRepository` (CRUD, snapshot writes, status filters, search by ID/customer/email)
- [ ] Task 4.2.2 — Service: `OrderService`
  - [ ] Subtask: `updateStatus()` — records `OrderStatusHistory` entry, prevents invalid transitions (FR-ORDER-004)
  - [ ] Subtask: `cancel()` — cancelled orders cannot later transition to Delivered (FR-ORDER-005)
  - [ ] Subtask: `addInternalNote()` — Studio-only visibility (FR-ORDER-006)
  - [ ] Subtask: Preserve customer info and snapshot data even if related artwork is later archived/deleted (BR-012, FR-ORDER-007, FR-ORDER-008)
- [ ] Task 4.2.3 — Validation: `UpdateOrderStatusSchema`
- [ ] Task 4.2.4 — Server Actions: `updateOrderStatusAction`, `cancelOrderAction`, `addOrderNoteAction`
- [ ] Task 4.2.5 — Studio UI: order list (ID, customer, status, payment status, total, date), order detail page (customer info, items, shipping address, notes, status history, embedded Payment panel), status update control, cancel confirmation dialog

**Acceptance Criteria**
- Every order created through the Shop appears in the Studio order list with status `Pending`.
- Cancelling an order preserves the order and customer record; it does not delete data.
- Order search/filter/sort behaviors follow the Common Behaviors defined in Epic 10.

## Feature 4.3 — Payment Tracking

**References:** FR-PAY-001..011, BR-014

- [ ] Task 4.3.1 — Repository: `PaymentRepository` (CRUD, status/method/date filters, search by payment/order ID, customer, `paymentReference`)
- [ ] Task 4.3.2 — Service: `PaymentService`
  - [ ] Subtask: Auto-create Payment record (`status = PENDING`) whenever an Order is created (FR-PAY-001)
  - [ ] Subtask: `updateStatus()` across `PENDING → PAID → REFUNDED` (design.md §4.6 simplified state machine — no `AWAITING_PAYMENT` on Payment; that stage lives on `OrderStatus`) (FR-PAY-004)
  - [ ] Subtask: Record method, `paymentReference`, payment date, notes (FR-PAY-005..008)
  - [ ] Subtask: Reflect payment status changes onto the associated order where applicable (FR-PAY-004 acceptance criteria)
- [ ] Task 4.3.3 — Validation: `UpdatePaymentSchema` (amount non-negative VAL-PAY-002, payment date not in the future VAL-PAY-003, `paymentReference` optional VAL-PAY-004)
- [ ] Task 4.3.4 — Server Actions: `updatePaymentStatusAction`, `recordPaymentDetailsAction`
- [ ] Task 4.3.5 — Studio UI: payment list, payment detail panel (embedded within Order detail per design.md §8.1), status/method/date/reference fields, private notes field

**Acceptance Criteria**
- A payment record cannot be created independent of an order; the 1:1 relationship is always maintained.
- Payment notes are never exposed on any public route (BR-015).

---

# Epic 5 — Commission Management

**References:** FR-COM-001..010 (Commission), BR-006, BR-013, BR-015 (Commission Workflow)

- [ ] Task 5.1 — Repository: `CommissionRepository` (CRUD, reference images, status history, search/filter by status/date/name/email/subject)
- [ ] Task 5.2 — Service: `CommissionService`
  - [ ] Subtask: `create()` — default status `New` (FR-COM-001)
  - [ ] Subtask: `updateStatus()` — records `CommissionStatusHistory`, supports New/Under Review/Accepted/Declined/In Progress/Completed/Cancelled (FR-COM-004)
  - [ ] Subtask: Internal notes, Studio-only visibility (FR-COM-005)
  - [ ] Subtask: Reference image handling via `StorageService` (FR-COM-006)
  - [ ] Subtask: Soft delete / permanent delete with confirmation (FR-COM-010, BR-013)
  - [ ] Subtask: Explicitly does **not** auto-create an Order or Artwork on acceptance (BR-015 — out of scope for V1)
- [ ] Task 5.3 — Validation: `CommissionRequestSchema` (name/email/subject/description required; preferred completion date not in the past — VAL-COM-001..005)
- [ ] Task 5.4 — Server Actions: `submitCommissionRequestAction` (public), `updateCommissionStatusAction`, `addCommissionNoteAction`, `deleteCommissionAction`
- [ ] Task 5.5 — Route Handler: `/api/uploads/commission-reference`
- [ ] Task 5.6 — Studio UI: commission list, detail page (customer info, description, budget, preferred date, reference images, notes, status history), status update control
- [ ] Task 5.7 — Activity logging: emit `COMMISSION_REQUEST_RECEIVED` on submission (design.md §14.4)

**Acceptance Criteria**
- Submitting a commission request never creates an Order or Artwork record.
- A confirmation message is shown to the visitor on successful submission (FR-COMPAGE-002).
- Preferred completion dates in the past are rejected client- and server-side.

---

# Epic 6 — Contact Management

**References:** FR-CONTACT-001..008, BR-006, BR-013

- [ ] Task 6.1 — Repository: `ContactRepository` (CRUD, search by name/email/subject, status/date filters)
- [ ] Task 6.2 — Service: `ContactService`
  - [ ] Subtask: `create()` — default status `New` (FR-CONTACT-001)
  - [ ] Subtask: `updateStatus()` — New/Read/Replied/Closed (FR-CONTACT-004)
  - [ ] Subtask: Internal notes, Studio-only visibility (FR-CONTACT-005)
  - [ ] Subtask: Soft delete / permanent delete with confirmation (FR-CONTACT-008)
- [ ] Task 6.3 — Validation: `ContactMessageSchema` (name/email/subject/message required — VAL-CONTACT-001..004)
- [ ] Task 6.4 — Server Actions: `submitContactMessageAction` (public), `updateContactStatusAction`, `addContactNoteAction`, `deleteContactMessageAction`
- [ ] Task 6.5 — Studio UI: message list, detail page, status control

**Acceptance Criteria**
- Submitting the contact form with any required field missing is rejected with field-specific validation messages.
- A confirmation message is shown to the visitor on successful submission.

---

# Epic 7 — Studio Dashboard

**References:** FR-DASH-001..007

Depends on Epics 3–6 (statistics and recent activity aggregate data from Artwork, Category, Collection, Story, Order, Commission).

- [ ] Task 7.1 — Service: `ActivityLogService` — `record(type: ActivityType, description, metadata?)`, `listRecent(limit)`
- [ ] Task 7.2 — Wire activity logging calls into the publish/create actions from Epics 3–6 for all eight `ActivityType` events (design.md §5, FR-DASH-003)
- [ ] Task 7.3 — Service: `DashboardService`
  - [ ] Subtask: Aggregate counts — total/draft/published/archived artworks, total collections/categories/stories, pending orders, pending commission requests (FR-DASH-002)
  - [ ] Subtask: `getRecentActivity()` sorted newest-first with timestamps (FR-DASH-003)
  - [ ] Subtask: `getPendingWork()` — draft artwork, pending orders, pending commissions, awaiting-payment orders (FR-DASH-005)
- [ ] Task 7.4 — Studio UI: `(studio)/dashboard/page.tsx`
  - [ ] Subtask: Statistics cards (`StatsCard`) — FR-DASH-002
  - [ ] Subtask: Recent Activity feed — FR-DASH-003
  - [ ] Subtask: `QuickActions` shortcuts (Create Artwork/Story/Collection/Category, View Orders, View Commission Requests) — FR-DASH-004
  - [ ] Subtask: Pending Work section with links to relevant Studio pages — FR-DASH-005
  - [ ] Subtask: Empty-state onboarding guidance when no content exists — FR-DASH-006
  - [ ] Subtask: Responsive layout (desktop multi-column, tablet adjusted, mobile stacked) — FR-DASH-007

**Acceptance Criteria**
- Dashboard loads within the performance target in NFR-PERF-002.
- All statistics reflect live data with no manual refresh required beyond normal navigation.
- Dashboard performs no direct content mutation; every action redirects to its owning module.

---

## Feature 7.2 — Insights

**References:** FR-INSIGHT-001..005

Depends on `ArtworkRepository` (Epic 3), `OrderRepository` (Epic 4), `CommissionRepository` (Epic 5).

- [ ] Task 7.5 — Service: `InsightsService`
  - [ ] Subtask: `getContentSummary()` — total/published/draft artworks, total collections, total stories (FR-INSIGHT-001)
  - [ ] Subtask: `getPopularArtwork(limit)` — top published artwork by view count, with recency fallback when view data is unavailable (FR-INSIGHT-002)
  - [ ] Subtask: `getRecentOrders(limit)` — most recent orders with status and date (FR-INSIGHT-003)
  - [ ] Subtask: `getRecentCommissions(limit)` — most recent commission requests with status and date (FR-INSIGHT-004)
- [ ] Task 7.6 — Studio UI: `(studio)/insights/page.tsx`
  - [ ] Subtask: Content summary cards — FR-INSIGHT-001
  - [ ] Subtask: Popular Artwork list, linking to the Artwork editor — FR-INSIGHT-002
  - [ ] Subtask: Recent Orders list, linking to Order detail — FR-INSIGHT-003
  - [ ] Subtask: Recent Commissions list, linking to Commission detail — FR-INSIGHT-004
  - [ ] Subtask: Empty state per section when no data exists — FR-INSIGHT-005

**Acceptance Criteria**
- Insights is entirely read-only; every entry links out to its owning module rather than allowing inline edits.
- Insights remains a lightweight summary — no charts, date-range filtering, or export functionality (product.md Principle 6, SRS §4.13).

---

# Epic 8 — Settings

**References:** FR-SET-001..008, BR-003

Depends on `ArtistRepository` from Epic 2.

- [ ] Task 8.1 — Service: `SettingsService` wrapping `ArtistRepository`
  - [ ] Subtask: Profile fields — name, photo, biography, email, phone (FR-SET-001)
  - [ ] Subtask: Social links — Instagram/Facebook/X/LinkedIn/YouTube/Other, empty links ignored (FR-SET-002)
  - [ ] Subtask: Public contact info — contact email, phone, studio address (FR-SET-003)
  - [ ] Subtask: Website info — title, description, copyright text (FR-SET-004)
  - [ ] Subtask: Notification preferences — order/commission/contact toggles (FR-SET-006)
  - [ ] Subtask: About page content — biography, artist statement, career highlights (FR-SET-007)
- [ ] Task 8.2 — Validation: `UpdateProfileSchema`, `UpdateSocialLinksSchema` (valid URLs — VAL-SET-004), `UpdateContactInfoSchema` (valid email — VAL-SET-002), `UpdateWebsiteInfoSchema` (title required — VAL-SET-003), `NotificationPreferencesSchema`, `AboutInfoSchema`
- [ ] Task 8.3 — Server Actions: `updateProfileAction`, `updateSocialLinksAction`, `updateContactInfoAction`, `updateWebsiteInfoAction`, `updateNotificationPreferencesAction`, `updateAboutInfoAction`
- [ ] Task 8.4 — Studio UI: `(studio)/settings/page.tsx` with sectioned forms; embed the password change form from Epic 2 Feature 2.5

**Acceptance Criteria**
- Invalid data (bad email/URL) prevents saving and displays a field-specific error.
- Successful updates display a confirmation message and persist after page refresh (FR-SET-008).
- Failed saves preserve the user's unsaved input.

---

# Epic 9 — Public Website

Read-oriented experience. Depends on Epics 3–8 for underlying data (only Published content is ever queried — BR-006). No Studio functionality is exposed anywhere in this Epic (BR-002, non-negotiable per product.md).

## Feature 9.1 — Navigation & Layout

**References:** FR-WEB-001..003

- [ ] Task 9.1.1 — `components/layout/Header.tsx`, `Navigation.tsx` — Home/Gallery/Collections/Stories/Shop/About/Contact, active-page highlighting
- [ ] Task 9.1.2 — `components/layout/Footer.tsx` — copyright, social links, contact info, quick nav, sourced from Settings (Epic 8)
- [ ] Task 9.1.3 — Responsive navigation — collapsible mobile menu
- [ ] Task 9.1.4 — `app/(public)/layout.tsx` composing Header/Footer around all public routes

**Acceptance Criteria**
- Navigation and footer render identically across all public pages and reflect current Settings data.

## Feature 9.2 — Home

**References:** FR-HOME-001..006

- [ ] Task 9.2.1 — `(public)/page.tsx` (Server Component) — hero, Featured Artwork, Featured Collections, Featured Stories, About preview, Commission/Contact CTAs
- [ ] Task 9.2.2 — Query only Published + Featured records (BR-006, BR-009)

**Acceptance Criteria**
- Draft or Archived content never appears on the homepage under any condition.

## Feature 9.3 — Gallery & Artwork Details

**References:** FR-GALLERY-001..005, FR-ARTPAGE-001..005

- [ ] Task 9.3.1 — `(public)/gallery/page.tsx` — browse Published artwork; search by title; filter by category/collection/availability; sort newest/oldest/alphabetical
- [ ] Task 9.3.2 — `components/gallery/ArtworkGrid.tsx`, `ArtworkCard.tsx` (primary image, title, category, availability)
- [ ] Task 9.3.3 — `(public)/gallery/[slug]/page.tsx` — full detail (images, description, story, category, collections, availability, price if applicable); 404 for non-Published artwork
- [ ] Task 9.3.4 — `components/gallery/ArtworkCarousel.tsx` — image gallery with thumbnail selection
- [ ] Task 9.3.5 — Purchase action shown only when Published && forSale && Available (FR-ARTPAGE-004, BR-011) — links into Shop purchase flow (Epic 4)
- [ ] Task 9.3.6 — Related collections links (FR-ARTPAGE-005)

**Acceptance Criteria**
- Attempting to access a Draft or Archived artwork's public URL returns a not-found response.
- Availability displayed always matches the current Studio-set value with no caching lag beyond the revalidation strategy in design.md §11.

## Feature 9.4 — Collections

**References:** FR-COLPAGE-001..003

- [ ] Task 9.4.1 — `(public)/collections/page.tsx` — Published collections (cover image, name, artwork count, description)
- [ ] Task 9.4.2 — `(public)/collections/[slug]/page.tsx` — collection detail with only Published artwork, ordered by `ArtworkCollection.displayOrder`
- [ ] Task 9.4.3 — Navigation from collection artwork into Artwork Details page

## Feature 9.5 — Stories

**References:** FR-STORYPAGE-001..003

- [ ] Task 9.5.1 — `(public)/stories/page.tsx` — Published stories (featured image, title, date, preview)
- [ ] Task 9.5.2 — `(public)/stories/[slug]/page.tsx` — full content, related Published artwork links

## Feature 9.6 — Shop

**References:** FR-SHOP-001..010 (public-facing portion; Studio/Order/Payment portions covered in Epic 4)

- [ ] Task 9.6.1 — `(public)/shop/page.tsx` — listing, filters (category/collection/price range/availability), search by title
- [ ] Task 9.6.2 — `(public)/shop/[slug]/page.tsx` — artwork detail, order summary, purchase form (Client Component using React Hook Form + `PurchaseRequestSchema`)
- [ ] Task 9.6.3 — Order confirmation view — order reference number, note that payment instructions follow separately (FR-SHOP-008)

**Acceptance Criteria**
- The purchase action is unavailable the moment an artwork's availability changes away from Available.

## Feature 9.7 — About

**References:** FR-ABOUT-001

- [ ] Task 9.7.1 — `(public)/about/page.tsx` sourced from Settings (Epic 8): photo, biography, statement, career highlights, social links

## Feature 9.8 — Contact

**References:** FR-CONTACTPAGE-001..002

- [ ] Task 9.8.1 — `(public)/contact/page.tsx` — public contact info display + contact form (Client Component, `ContactMessageSchema`, Epic 6 action)

## Feature 9.9 — Commission Request

**References:** FR-COMPAGE-001..002

- [ ] Task 9.9.1 — `(public)/commissions/page.tsx` — commission info + request form (Client Component, `CommissionRequestSchema`, Epic 5 action) + confirmation message

**Acceptance Criteria for Epic 9 overall**
- No page under `(public)` renders any Studio-only data (internal notes, payment details, draft/archived content, analytics) — BR-015.
- Every public list view supports the Common Behaviors defined in Epic 10 where specified by its FR (search/filter/sort/pagination).
- All pages are responsive across desktop, tablet, and mobile (NFR-RESP-001).

---

# Epic 10 — Cross-Cutting Common Behaviors

Implements SRS §6 (Common Functional Behaviors) as shared, reusable building blocks consumed by the module-specific list/detail views built in Epics 3–6 and 9. Building these as shared primitives avoids duplicating logic across modules (tech.md Principle 6 — Reusability).

## Feature 10.1 — Search, Filter, Sort, Pagination

**References:** FR-COM-001..004 (Common)

- [ ] Task 10.1.1 — Shared `PaginationSchema` and pagination helper (`schemas/shared/PaginationSchema.ts`)
- [ ] Task 10.1.2 — URL-search-param-driven filter/sort/search state (design.md §11) — shared hook(s) in `hooks/useArtworkFilters.ts` and equivalent per-module hooks
- [ ] Task 10.1.3 — Ensure pagination preserves active filters and search queries across page changes (FR-COM-004 (Common) acceptance criteria)
- [ ] Task 10.1.4 — Apply to every applicable Repository method built in Epics 1–6 (list methods accept filter/sort/pagination parameters consistently)

## Feature 10.2 — Draft / Publish / Archive / Restore Workflow

**References:** FR-COM-005..008 (Common), BR-005

- [ ] Task 10.2.1 — Shared lifecycle-transition contract (used by `ArtworkPublishingService`, `CollectionService`, `StoryService` from Epic 3)
- [ ] Task 10.2.2 — Shared Studio UI pattern: status badge + lifecycle action buttons, consistent across Artwork/Collection/Story editors

## Feature 10.3 — Soft Delete / Permanent Delete

**References:** FR-COM-009..010 (Common), BR-013

- [ ] Task 10.3.1 — Shared repository pattern: default queries exclude `deletedAt != null`; explicit "trash" queries expose soft-deleted records for restore/permanent-delete flows (design.md §5.1)
- [ ] Task 10.3.2 — Shared `ConfirmationDialog` component requiring explicit confirmation before permanent delete (FR-COM-010 (Common), FR-COM-012 (Common))

## Feature 10.4 — Empty States & Confirmation Dialogs

**References:** FR-COM-011..012 (Common)

- [ ] Task 10.4.1 — `components/feedback/EmptyState.tsx` — reusable across every list view built in Epics 3–9
- [ ] Task 10.4.2 — `components/feedback/{LoadingSpinner,ErrorState,SuccessBanner,Skeleton}.tsx`
- [ ] Task 10.4.3 — Shared `ConfirmationDialog` wired to Delete/Permanent Delete/Archive/Restore/Publish/Unpublish actions across all modules

## Feature 10.5 — Validation & Audit Information

**References:** FR-COM-013..014 (Common)

- [ ] Task 10.5.1 — Confirm every form built in Epics 2–9 uses React Hook Form + Zod with clear, field-specific error messages (design.md §12)
- [ ] Task 10.5.2 — Confirm `createdAt`/`updatedAt` are system-managed and never exposed as editable fields in any Studio form

**Acceptance Criteria (Epic 10 overall)**
- No module in Epics 3–6 or 9 re-implements search/filter/sort/pagination/lifecycle/soft-delete/confirmation logic independently; all consume the shared primitives built here.

---

# Epic 11 — Security Hardening

Cross-cutting pass applied after core functionality (Epics 2–9) exists, verifying design.md §13 end to end. No new functional behavior is introduced.

- [ ] Task 11.1 — Verify every Studio Server Action performs an auth check before calling its Service (NFR-SEC-001, NFR-SEC-003)
- [ ] Task 11.2 — Verify every external input path (forms, Server Actions, Route Handlers, query params) is validated with Zod before reaching a Service (NFR-SEC-004)
- [ ] Task 11.3 — Verify password hashing (bcrypt via Auth.js), and that password hashes/tokens are never logged or returned in any response (NFR-SEC-002)
- [ ] Task 11.4 — Verify file upload validation (type, size, integrity, generated filenames) on all three upload Route Handlers (design.md §13.4)
- [ ] Task 11.5 — Verify Story/Artwork description rich-text sanitization prevents stored XSS (design.md §13.3)
- [ ] Task 11.6 — Verify public repository queries select only public-safe fields, excluding `internalNotes`, `deletedAt`, payment details at the query level (BR-015)
- [ ] Task 11.7 — Verify generic, non-revealing error messages are returned to clients; detailed errors go only to server logs (design.md §13.6)
- [ ] Task 11.8 — Confirm environment variable usage for all secrets; verify `.env.example` is complete and no secret is committed (design.md §13.5)
- [ ] Task 11.9 — Enforce HTTPS in production configuration (NFR-SEC-005)
- [ ] Task 11.10 — Structure isolated Server Action entry points for future rate limiting on public mutation actions, without implementing rate limiting itself in V1 (design.md §13.7)

**Acceptance Criteria**
- A security review against design.md §13 and NFR-SEC-* passes with no unresolved findings before Epic 13 (QA) sign-off.

---

# Epic 12 — Non-Functional Readiness

Implements the remaining non-functional requirements not already covered incidentally in earlier Epics.

## Feature 12.1 — Performance

**References:** NFR-PERF-001..003

- [ ] Task 12.1.1 — Confirm public content pages use Server Components / static or ISR rendering where applicable (design.md §8.2)
- [ ] Task 12.1.2 — Apply `next/image` with responsive `sizes`, lazy loading, and priority loading for above-the-fold artwork images
- [ ] Task 12.1.3 — Verify Repository `select` statements avoid over-fetching; confirm indexes from design.md §5 are in place and used by common query paths

## Feature 12.2 — Accessibility

**References:** NFR-ACC-001..003

- [ ] Task 12.2.1 — Keyboard navigation audit across Studio and Public UI
- [ ] Task 12.2.2 — Confirm every rendered artwork/story/collection image uses its stored `altText` (design.md §5.1); Studio forms require `altText` before publish is allowed
- [ ] Task 12.2.3 — Color contrast audit against the product.md palette

## Feature 12.3 — Responsive Design

**References:** NFR-RESP-001..002

- [ ] Task 12.3.1 — Verify Gallery grid and Studio tables adapt across desktop/tablet/mobile breakpoints (design.md §15.3)

## Feature 12.4 — Logging & Monitoring Readiness

**References:** NFR-LOG-001

- [ ] Task 12.4.1 — Verify `lib/logger.ts` structured logging is used for order creation, payment status changes, publish/unpublish events, and auth failures, with no sensitive data logged

## Feature 12.5 — SEO

**References:** design.md §15 / product.md, SRS §7.5-adjacent (SEO Standards)

- [ ] Task 12.5.1 — Metadata, Open Graph, Twitter cards, canonical URLs for public content pages

## Feature 12.6 — Deployment Readiness

**References:** NFR-BACKUP-001..002, tech.md Deployment Strategy

- [ ] Task 12.6.1 — Configure Vercel deployment, managed PostgreSQL, environment variable separation across Development/Testing/Production
- [ ] Task 12.6.2 — Document backup/recovery procedure for the managed database and uploaded assets

**Acceptance Criteria (Epic 12 overall)**
- The Production Readiness Checklist in tech.md is fully satisfied.

---

# Epic 13 — QA & Version 1 Acceptance

Final verification against SRS §9 (Version 1 Acceptance Criteria). No implementation work; verification only.

## Feature 13.1 — Core Workflow Verification

**References:** SRS §9.2

- [ ] Task 13.1.1 — Verify Artwork workflow end-to-end: Create → Save Draft → Publish → appears publicly → Archive → Restore
- [ ] Task 13.1.2 — Verify Collection workflow: Create → Assign Artwork → Publish → visible publicly → Archive → Restore
- [ ] Task 13.1.3 — Verify Story workflow: Create → Draft → Publish → visible publicly
- [ ] Task 13.1.4 — Verify Purchase workflow: Browse Shop → View Artwork → Submit Purchase Request → Order Created → Status Updated → Payment Tracked → Order Completed
- [ ] Task 13.1.5 — Verify Commission workflow: Submit → Review → Accept/Decline → Close
- [ ] Task 13.1.6 — Verify Contact workflow: Submit → Stored → Reviewed → Closed

## Feature 13.2 — Public Website Verification

**References:** SRS §9.3

- [ ] Task 13.2.1 — Confirm only Published content is ever publicly reachable (direct URL attempts to Draft/Archived content fail)
- [ ] Task 13.2.2 — Confirm Featured content and availability states render correctly
- [ ] Task 13.2.3 — Cross-device check: Desktop, Tablet, Mobile

## Feature 13.3 — Studio Verification

**References:** SRS §9.4

- [ ] Task 13.3.1 — Confirm full CRUD + lifecycle + soft delete across all Studio modules
- [ ] Task 13.3.2 — Confirm manual payment tracking and commission/contact/order management function completely

## Feature 13.4 — Security & Data Integrity Verification

**References:** SRS §9.5, §9.6

- [ ] Task 13.4.1 — Confirm Studio requires authentication and visitors cannot reach any Studio route
- [ ] Task 13.4.2 — Confirm referential integrity across Artwork↔Category, Artwork↔Collections, Artwork↔Orders, Story↔Related Artwork with no orphaned records

## Feature 13.5 — Performance Verification

**References:** SRS §9.7

- [ ] Task 13.5.1 — Verify page load and Studio interaction times against NFR-PERF-001/002 under normal load

## Feature 13.6 — Definition of Done Sign-Off

**References:** SRS §9.9, tech.md Engineering Review Checklist, structure.md Structure Consistency Checklist

- [ ] Task 13.6.1 — Confirm every mandatory FR in the SRS has a corresponding implemented and verified task in this document
- [ ] Task 13.6.2 — Confirm every applicable BR is enforced (traced against design.md §16 Requirements Traceability Summary)
- [ ] Task 13.6.3 — Confirm the application builds successfully with no critical defects outstanding
- [ ] Task 13.6.4 — Confirm out-of-scope items (SRS §9.8: multi-artist, customer accounts, online payments, print-on-demand, homepage builder, etc.) remain unimplemented

**Acceptance Criteria**
- KArt Version 1 is considered complete only when every checklist item in Features 13.1–13.6 passes, per SRS §9.9's Definition of Done.

---

# Dependency Summary

```
Epic 0  Foundation
   │
   ▼
Epic 1  Database Schema  ────────────────────────────────────────────┐
   │                                                                  │
   ▼                                                                  │
Epic 2  Auth (needs Artist model)                                    │
   │                                                                  │
   ▼                                                                  │
Epic 3  Content Management (Category → Artwork → Collection → Story) │
   │                                                                  │
   ▼                                                                  │
Epic 4  Commerce (Shop → Order → Payment)                             │
   │                                                                  │
   ▼                                                                  │
Epic 5  Commission        Epic 6  Contact       (parallel, both depend on Epic 1+2)
   │                          │
   ▼                          ▼
Epic 7  Dashboard & Insights (depends on Epics 3–6 data)
   │
   ▼
Epic 8  Settings (depends on Epic 2 ArtistRepository)
   │
   ▼
Epic 9  Public Website (depends on Epics 3–8 published data)
   │
   ▼
Epic 10 Common Behaviors (built alongside Epics 3–9, consumed by all list/detail views)
   │
   ▼
Epic 11 Security Hardening (verification pass over Epics 2–9)
   │
   ▼
Epic 12 Non-Functional Readiness (verification + finishing pass)
   │
   ▼
Epic 13 QA & Version 1 Acceptance (final sign-off)
```

Within every Feature, the internal task order is always: **Schema (Epic 1) → Repository → Service → Validation Schema → Server Action / Route Handler → UI**, matching the layered architecture mandated by design.md §3 and tech.md.

---

# Explicit Non-Goals for This Task List

Per design.md §17 and SRS §1.6/§9.8, the following are intentionally **not** included as tasks anywhere in this document, and must not be added during implementation:

- Multi-artist / multi-user support
- Customer accounts or visitor authentication
- Online payment gateway integration
- Print-on-demand or digital downloads
- Auctions, reviews/ratings, wishlists, messaging system
- Inventory management
- Mobile application
- Public API (beyond the documented extension point in design.md §7.2, which is not implemented in V1)
- AI-generated artwork or content
- Homepage builder
- Multi-language / internationalization beyond English
- Team collaboration features

Any future work in these areas requires a new design pass and is out of scope for this tasks.md.