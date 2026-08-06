# KArt Technical Design Document

> Version: 1.0
> Project: KArt
> Document Type: Design
> Status: Draft
> Derived From: product.md, tech.md, structure.md, development_rules.md, requirements.md (SRS)

---

# 1. Purpose & Scope

This document translates the KArt Software Requirements Specification (SRS) into a concrete technical design.

It defines:

- System architecture
- Domain model
- Database schema
- API design (Server Actions / Route Handlers)
- UI architecture
- Folder organization
- Component responsibilities
- State management strategy
- Validation strategy
- Security considerations
- Key sequence diagrams

This document does not define implementation tasks. It defines **what the system looks like**, not the order in which it will be built.

Every design decision in this document complies with the steering documents:

- `product.md` — product vision, principles, and experience philosophy
- `tech.md` — technology stack and engineering architecture
- `structure.md` — folder ownership and naming conventions
- `development_rules.md` — workflow and collaboration rules

Where this document appears to conflict with a steering document, the steering document takes precedence, per the Authority Hierarchy defined in `development_rules.md`.

---

# 2. Design Principles

The design is guided directly by the product principles in `product.md`, translated into technical terms:

| Product Principle | Design Implication |
|---|---|
| Artwork Above Everything | Artwork entity is the aggregation root; all other entities reference it. |
| The Quiet Interface | Server Components by default; minimal client JavaScript; no unnecessary global state. |
| Simplicity Without Limitation | Only required fields are mandatory; optional fields default to empty/null. |
| Creation Before Commerce | Shop and Orders are separate modules that reference Artwork rather than replacing the Gallery experience. |
| Build Once, Grow Forever | Layered architecture (Presentation → Server → Service → Repository → Prisma) isolates business logic from framework and storage choices. |
| Respect the Artist | Studio workflows minimize steps: draft → publish → archive, in-place editing, minimal required fields. |

The architecture follows the **layered architecture** mandated by `tech.md`:

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

No layer skips another. Dependencies point downward only.

---

# 3. System Architecture

## 3.1 High-Level Architecture

KArt is a single Next.js 15 (App Router) application serving two experiences from one codebase and one database:

```
                         ┌─────────────────────────────┐
                         │        Next.js App          │
                         │                              │
   Visitor  ───────────▶ │  (public) route group        │
                         │  Server Components (read)    │
                         │  Server Actions (contact,     │
                         │   commission, purchase forms) │
                         │                              │
   Artist   ───────────▶ │  (studio) route group        │
   (authenticated)       │  Server + Client Components  │
                         │  Server Actions (CRUD)        │
                         │                              │
                         │  (auth) route group           │
                         │  Auth.js                      │
                         │                              │
                         │  api/ route handlers          │
                         │  (webhooks, uploads, future    │
                         │   public API)                 │
                         └───────────────┬──────────────┘
                                         │
                              Service Layer (business logic)
                                         │
                            Repository Layer (Prisma queries)
                                         │
                                    PostgreSQL
                                         │
                              File Storage Abstraction
                        (local dev → Cloudinary/S3 in future)
```

## 3.2 Why This Architecture

- **Single deployable unit**: satisfies `tech.md`'s decision to avoid a separate backend in Version 1, reducing deployment complexity.
- **Server-first rendering**: satisfies the Quiet Interface and performance principles — public pages are Server Components, minimizing client JavaScript.
- **Shared Service layer**: Server Actions used by the Studio and any future Route Handlers (public API) call the same Services, avoiding logic duplication (per `tech.md` API Philosophy).
- **Storage abstraction**: image storage is isolated behind a `StorageService` interface so Version 1 can use local disk storage while the Studio, Services, and database schema remain unchanged when migrating to Cloudinary/S3 (`product.md` Principle 7 — Build Once, Grow Forever).

## 3.3 Request Flow Examples

**Public read (Gallery page):**
`GalleryPage (Server Component)` → `ArtworkService.getPublishedArtworks()` → `ArtworkRepository.findPublished()` → Prisma → PostgreSQL → rendered HTML.

**Studio write (Publish artwork):**
`PublishButton (Client Component)` → `publishArtworkAction (Server Action)` → auth check → `ArtworkService.publish()` (business validation: requires primary image) → `ArtworkRepository.update()` → Prisma transaction → revalidate cache → UI updates.

---

# 4. Domain Model

## 4.1 Core Entities

| Entity | Description | Owns Lifecycle |
|---|---|---|
| Artist (User) | The single platform owner. | No |
| Category | Mandatory classification for artwork. | Active / Archived |
| Collection | Optional curated grouping of artwork. | Draft / Published / Archived |
| Artwork | The primary content entity. | Draft / Published / Archived |
| ArtworkImage | An image belonging to an artwork. | N/A |
| Story | Editorial content, optionally related to artwork. | Draft / Published / Archived |
| Order | A purchase request submitted by a visitor. | Pending → ... → Delivered / Cancelled |
| OrderItem | A line item (artwork) within an order. | N/A |
| Payment | Manually tracked payment record for an order. | Pending → Paid / Refunded |
| Commission | A custom artwork request submitted by a visitor. | New → ... → Completed / Cancelled |
| ContactMessage | A general inquiry submitted by a visitor. | New → Read → Replied → Closed |
| ActivityLog | System-recorded event, powers Dashboard "Recent Activity". | N/A |

## 4.2 Entity Relationship Diagram (Conceptual)

```
Artist (1) ── manages ──▶ (n) Artwork
Artist (1) ── manages ──▶ (n) Category
Artist (1) ── manages ──▶ (n) Collection
Artist (1) ── manages ──▶ (n) Story

Category (1) ──▶ (n) Artwork              [mandatory, one category per artwork]
Collection (n) ──▶ (n) Artwork            [optional, many-to-many]
Story (n) ──▶ (n) Artwork                 [optional, many-to-many "related artwork"]

Artwork (1) ──▶ (n) ArtworkImage          [exactly one marked primary]

Artwork (1) ──▶ (n) OrderItem
Order (1) ──▶ (n) OrderItem
Order (1) ──▶ (1) Payment
Order (1) ──▶ (n) OrderStatusHistory

Commission (1) ──▶ (n) CommissionImage
Commission (1) ──▶ (n) CommissionStatusHistory
```

This directly mirrors SRS Section 2.10 (Relationship Overview) and Business Rules BR-007, BR-008, BR-011, BR-012.

## 4.3 Content Lifecycle State Machine

Applies to Artwork, Collection, and Story (SRS §2.8, BR-005):

```
        create
          │
          ▼
      ┌────────┐   publish    ┌───────────┐   archive   ┌──────────┐
      │  Draft │ ───────────▶ │ Published │ ──────────▶ │ Archived │
      └────────┘ ◀─────────── └───────────┘ ◀─────────── └──────────┘
          ▲          unpublish                  restore
          │                                          │
          └──────────────── restore ─────────────────┘

  Any state ──▶ Soft Deleted ──▶ Permanently Deleted (explicit confirmation required)
```

## 4.4 Order Status State Machine

```
Pending → Confirmed → Awaiting Payment → Paid → Preparing Shipment → Shipped → Delivered
   │                                                                              ▲
   └──────────────────────────────▶ Cancelled ◀──────────────────────────────────┘
                                  (terminal; cannot transition to Delivered)
```

## 4.5 Commission Status State Machine

```
New → Under Review → Accepted → In Progress → Completed
                 │
                 └──▶ Declined (terminal)
New/Under Review/Accepted/In Progress ──▶ Cancelled (terminal)
```

## 4.6 Payment Status State Machine

```
Pending → Paid → Refunded
```

`Pending` and `Awaiting Payment` are not modeled as separate `Payment` states in this design. The SRS does not document a distinct business meaning between the two for the payment record itself (FR-PAY-001 creates the payment as `Pending` the moment an order is placed, before any payment has been requested or received). The "instructions have been sent, funds are awaited" step is already represented on the **Order** by `OrderStatus.AWAITING_PAYMENT` (SRS §4.8, FR-ORDER-004); duplicating it on `Payment` would track the same business fact twice. `PaymentStatus` therefore uses `PENDING` as the single "not yet paid" state, satisfying FR-PAY-004's supported values without redundant modeling.

---

# 5. Database Schema

PostgreSQL via Prisma, following `tech.md` schema principles: UUID primary keys, `createdAt`/`updatedAt` on every major entity, soft delete via `deletedAt`, normalized relationships.

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

enum ContentStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum CategoryStatus {
  ACTIVE
  ARCHIVED
}

enum Availability {
  AVAILABLE
  RESERVED
  SOLD
  NOT_FOR_SALE
  COMMISSION_AVAILABLE
}

enum OrderStatus {
  PENDING
  CONFIRMED
  AWAITING_PAYMENT
  PAID
  PREPARING_SHIPMENT
  SHIPPED
  DELIVERED
  CANCELLED
}

enum PaymentStatus {
  PENDING
  PAID
  REFUNDED
}

enum PaymentMethod {
  BANK_TRANSFER
  UPI
  CASH
  OTHER
}

enum CommissionStatus {
  NEW
  UNDER_REVIEW
  ACCEPTED
  DECLINED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum ContactStatus {
  NEW
  READ
  REPLIED
  CLOSED
}

// ─────────────────────────────────────────────
// Artist / Settings
// ─────────────────────────────────────────────

model Artist {
  id                   String   @id @default(uuid())
  email                String   @unique
  passwordHash         String

  fullName             String
  profilePhoto         String?
  biography            String?
  artistStatement      String?
  careerHighlights     String?
  phone                String?

  contactEmail         String?
  studioAddress        String?

  websiteTitle         String   @default("KArt")
  websiteDescription   String?
  copyrightText        String?

  instagramUrl         String?
  facebookUrl          String?
  twitterUrl           String?
  linkedinUrl          String?
  youtubeUrl           String?
  otherWebsiteUrl      String?

  notifyOnOrder        Boolean  @default(true)
  notifyOnCommission   Boolean  @default(true)
  notifyOnContact      Boolean  @default(true)

  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}

// ─────────────────────────────────────────────
// Category
// ─────────────────────────────────────────────

model Category {
  id          String         @id @default(uuid())
  name        String         @unique
  slug        String         @unique
  description String?
  status      CategoryStatus @default(ACTIVE)

  artworks    Artwork[]

  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  deletedAt   DateTime?
}

// ─────────────────────────────────────────────
// Collection
// ─────────────────────────────────────────────

model Collection {
  id            String         @id @default(uuid())
  name          String
  slug          String         @unique
  description   String?
  coverImageUrl String?
  featured      Boolean        @default(false)
  status        ContentStatus  @default(DRAFT)

  artworks      ArtworkCollection[]

  publishedAt   DateTime?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  deletedAt     DateTime?
}

// ─────────────────────────────────────────────
// Artwork
// ─────────────────────────────────────────────

model Artwork {
  id           String         @id @default(uuid())
  title        String
  slug         String         @unique
  description  String?
  story        String?

  categoryId   String
  category     Category       @relation(fields: [categoryId], references: [id])

  collections  ArtworkCollection[]
  images       ArtworkImage[]
  tags         ArtworkTag[]
  stories      StoryArtwork[]
  orderItems   OrderItem[]

  availability Availability   @default(AVAILABLE)
  forSale      Boolean        @default(false)
  price        Decimal?       @db.Decimal(10, 2)
  featured     Boolean        @default(false)
  status       ContentStatus  @default(DRAFT)

  publishedAt  DateTime?
  archivedAt   DateTime?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  deletedAt    DateTime?

  @@index([status, availability])
  @@index([categoryId])
}

model ArtworkImage {
  id           String   @id @default(uuid())
  artworkId    String
  artwork      Artwork  @relation(fields: [artworkId], references: [id], onDelete: Cascade)

  url          String
  altText      String?
  displayOrder Int      @default(0)
  isPrimary    Boolean  @default(false)

  createdAt    DateTime @default(now())

  @@index([artworkId])
}

model Tag {
  id       String       @id @default(uuid())
  name     String       @unique
  artworks ArtworkTag[]
}

model ArtworkTag {
  artworkId String
  tagId     String
  artwork   Artwork @relation(fields: [artworkId], references: [id], onDelete: Cascade)
  tag       Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([artworkId, tagId])
}

// Join table: Artwork <-> Collection (many-to-many)
model ArtworkCollection {
  artworkId    String
  collectionId String
  artwork      Artwork    @relation(fields: [artworkId], references: [id], onDelete: Cascade)
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)

  // Position of this artwork within this specific collection, set
  // independently of the artwork's image order and its position in
  // any other collection it also belongs to (FR-COL, Collection Management).
  displayOrder Int        @default(0)

  @@id([artworkId, collectionId])
}

// ─────────────────────────────────────────────
// Story
// ─────────────────────────────────────────────

model Story {
  id            String         @id @default(uuid())
  title         String
  slug          String         @unique
  content       String
  featuredImage String?
  featured      Boolean        @default(false)
  status        ContentStatus  @default(DRAFT)

  relatedArtworks StoryArtwork[]

  publishedAt   DateTime?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  deletedAt     DateTime?
}

// Join table: Story <-> Artwork (many-to-many)
model StoryArtwork {
  storyId   String
  artworkId String
  story     Story   @relation(fields: [storyId], references: [id], onDelete: Cascade)
  artwork   Artwork @relation(fields: [artworkId], references: [id], onDelete: Cascade)

  @@id([storyId, artworkId])
}

// ─────────────────────────────────────────────
// Order / Payment
// ─────────────────────────────────────────────

model Order {
  id               String        @id @default(uuid())
  orderNumber      String        @unique

  customerName     String
  customerEmail    String
  customerPhone    String?
  shippingAddress  String
  customerNotes    String?

  status           OrderStatus   @default(PENDING)
  totalAmount      Decimal       @db.Decimal(10, 2)

  internalNotes    String?

  items            OrderItem[]
  payment          Payment?
  statusHistory    OrderStatusHistory[]

  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
  deletedAt        DateTime?

  @@index([status])
  @@index([customerEmail])
}

model OrderItem {
  id            String   @id @default(uuid())
  orderId       String
  order         Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)

  artworkId     String?
  artwork       Artwork? @relation(fields: [artworkId], references: [id], onDelete: SetNull)

  // Snapshots preserve historical accuracy per BR-012 even if
  // the artwork is later edited, archived, or deleted.
  artworkTitle  String
  unitPrice     Decimal  @db.Decimal(10, 2)
  quantity      Int      @default(1)

  @@index([orderId])
}

model OrderStatusHistory {
  id        String      @id @default(uuid())
  orderId   String
  order     Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  status    OrderStatus
  note      String?
  changedAt DateTime    @default(now())

  @@index([orderId])
}

model Payment {
  id                   String        @id @default(uuid())
  orderId              String        @unique
  order                Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)

  status               PaymentStatus @default(PENDING)
  method               PaymentMethod?
  paymentReference     String?
  amount               Decimal       @db.Decimal(10, 2)
  paymentDate          DateTime?
  notes                String?

  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt

  @@index([status])
}

// ─────────────────────────────────────────────
// Commission
// ─────────────────────────────────────────────

model Commission {
  id                      String            @id @default(uuid())
  requestNumber           String            @unique

  customerName            String
  customerEmail           String
  customerPhone           String?

  subject                 String
  description             String
  budget                  Decimal?          @db.Decimal(10, 2)
  preferredCompletionDate DateTime?

  status                  CommissionStatus  @default(NEW)
  internalNotes           String?

  referenceImages         CommissionImage[]
  statusHistory           CommissionStatusHistory[]

  createdAt               DateTime          @default(now())
  updatedAt                DateTime          @updatedAt
  deletedAt               DateTime?

  @@index([status])
}

model CommissionImage {
  id           String     @id @default(uuid())
  commissionId String
  commission   Commission @relation(fields: [commissionId], references: [id], onDelete: Cascade)
  url          String
  createdAt    DateTime   @default(now())
}

model CommissionStatusHistory {
  id           String            @id @default(uuid())
  commissionId String
  commission   Commission        @relation(fields: [commissionId], references: [id], onDelete: Cascade)
  status       CommissionStatus
  note         String?
  changedAt    DateTime          @default(now())
}

// ─────────────────────────────────────────────
// Contact
// ─────────────────────────────────────────────

model ContactMessage {
  id            String        @id @default(uuid())
  senderName    String
  senderEmail   String
  subject       String
  message       String

  status        ContactStatus @default(NEW)
  internalNotes String?

  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  deletedAt     DateTime?

  @@index([status])
}

// ─────────────────────────────────────────────
// Activity Log (Dashboard "Recent Activity")
// ─────────────────────────────────────────────

// Limited to the activities explicitly listed in FR-DASH-003.
enum ActivityType {
  ARTWORK_CREATED
  ARTWORK_PUBLISHED
  ARTWORK_ARCHIVED
  STORY_PUBLISHED
  COLLECTION_CREATED
  CATEGORY_CREATED
  ORDER_RECEIVED
  COMMISSION_REQUEST_RECEIVED
}

model ActivityLog {
  id          String       @id @default(uuid())
  type        ActivityType
  description String
  metadata    Json?
  createdAt   DateTime     @default(now())

  @@index([createdAt])
}
```

## 5.1 Schema Design Notes

- **Snapshots in `OrderItem`** (`artworkTitle`, `unitPrice`) satisfy BR-012: order history remains immutable even if the referenced artwork is edited or archived. `artworkId` is nullable with `onDelete: SetNull` so permanent artwork deletion never orphans or blocks an order record.
- **`Category` deletion** is restricted at the Service layer (not the database) — categories with assigned artwork cannot be deleted, satisfying BR-008 and VAL-CAT-004, while the DB relation itself uses a required foreign key to guarantee referential integrity.
- **`Payment` is 1:1 with `Order`**, auto-created when an order is created (FR-PAY-001).
- **Soft delete** (`deletedAt`) is present on every entity that supports it per BR-013: Artwork, Category, Collection, Story, Order, Commission, ContactMessage. Repositories always filter `deletedAt: null` by default; a separate repository method exposes soft-deleted records for restore/permanent-delete flows.
- **`ArtworkTag`/`Tag`** are normalized rather than storing a string array, keeping tag search/filtering efficient and consistent with the "prefer normalization" principle in `tech.md`.
- **Decimal type** is used for all monetary fields to avoid floating-point rounding issues.
- **`Payment.paymentReference`** (formerly `transactionReference`) intentionally uses vendor-neutral naming. Version 1 tracks payments manually only (BR-014, `tech.md` §Backend); the field stores whatever reference the artist records by hand (a UTR number, bank reference, or receipt number per FR-PAY-006) and must not imply an online payment gateway integration.
- **`ArtworkImage.altText`** supports NFR-ACC-002 (descriptive alternative text). It is stored per image rather than per artwork so each image in a multi-image artwork (FR-ART-014) can be described accurately.
- **Positional fields renamed to `displayOrder`** (`ArtworkImage.displayOrder`, `ArtworkCollection.displayOrder`) to make their purpose explicit and avoid confusion with the unrelated `Order`/`OrderItem` purchase-order entities.
- **`ArtworkCollection.displayOrder`** lets the artist arrange an artwork's position within each collection independently of that same artwork's image ordering or its position in any other collection it belongs to, supporting the "Control display order" capability described for Collection Management in `structure.md`.
- **`ActivityLog.type`** is a typed `ActivityType` enum rather than a free-form string, preventing inconsistent or invalid event names while logging (NFR-LOG-001). Its values are limited to the activities explicitly listed in FR-DASH-003.

---

# 6. Service & Repository Layer Design

Per `structure.md`, each business domain owns a `services/<domain>` and `repositories/<domain>` module.

| Domain | Service | Repository | Key Responsibilities |
|---|---|---|---|
| Artwork | `ArtworkService`, `ArtworkPublishingService`, `ArtworkImageService` | `ArtworkRepository` | CRUD, publish/unpublish/archive/restore, primary image rule, duplicate artwork |
| Category | `CategoryService` | `CategoryRepository` | CRUD, archive/restore, prevent deletion when in use |
| Collection | `CollectionService` | `CollectionRepository` | CRUD, publish lifecycle, artwork assignment, cover image fallback |
| Story | `StoryService` | `StoryRepository` | CRUD, publish lifecycle, related artwork linking |
| Shop | `ShopService` | (reuses `ArtworkRepository`) | Purchase eligibility checks (BR-011), shop listing/filtering |
| Order | `OrderService` | `OrderRepository` | Order creation from purchase request, status transitions, history |
| Payment | `PaymentService` | `PaymentRepository` | Payment record creation, status updates |
| Commission | `CommissionService` | `CommissionRepository` | Request intake, status workflow, reference image handling |
| Contact | `ContactService` | `ContactRepository` | Message intake, status workflow |
| Settings | `SettingsService` | `SettingsRepository` | Artist profile / site configuration |
| Dashboard | `DashboardService` | (reuses multiple repositories) | Aggregated statistics, recent activity |
| Insights | `InsightsService` | (reuses Artwork/Order/Commission repositories) | Content summary, popular artwork, recent orders/commissions summary (product.md Insights, SRS §4.13) |
| Auth | `AuthService` (wraps Auth.js) | `ArtistRepository` | Login validation, password change, session |
| Activity | `ActivityLogService` | `ActivityLogRepository` | Records events consumed by Dashboard |

**Rule enforced throughout:** Services never import React or Next.js request/response objects; they receive plain data and return plain data/typed results, keeping them framework-independent and unit-testable (`tech.md` Service Layer rules).

## 6.1 Representative Service Contracts

```ts
// services/artwork/ArtworkService.ts

interface ArtworkService {
  create(input: CreateArtworkInput): Promise<Artwork>;
  update(id: string, input: UpdateArtworkInput): Promise<Artwork>;
  getById(id: string): Promise<Artwork | null>;
  getBySlug(slug: string): Promise<Artwork | null>;
  list(filters: ArtworkFilters, pagination: Pagination): Promise<Paginated<Artwork>>;
  listPublished(filters: PublicArtworkFilters, pagination: Pagination): Promise<Paginated<Artwork>>;
  publish(id: string): Promise<Artwork>;      // throws if no primary image (VAL-ART-005)
  unpublish(id: string): Promise<Artwork>;
  archive(id: string): Promise<Artwork>;
  restore(id: string): Promise<Artwork>;
  softDelete(id: string): Promise<void>;
  permanentDelete(id: string, confirmed: boolean): Promise<void>;
  duplicate(id: string): Promise<Artwork>;
}
```

```ts
// services/shop/ShopService.ts

interface ShopService {
  listAvailableForSale(filters: ShopFilters, pagination: Pagination): Promise<Paginated<Artwork>>;
  isPurchasable(artworkId: string): Promise<boolean>; // Published && forSale && Available (BR-011)
  createOrderFromRequest(input: PurchaseRequestInput): Promise<Order>;
}
```

```ts
// services/order/OrderService.ts

interface OrderService {
  getById(id: string): Promise<OrderWithDetails | null>;
  list(filters: OrderFilters, pagination: Pagination): Promise<Paginated<Order>>;
  updateStatus(id: string, status: OrderStatus, note?: string): Promise<Order>;
  cancel(id: string): Promise<Order>; // blocks transition to Delivered afterward
  addInternalNote(id: string, note: string): Promise<Order>;
}
```

---

# 7. API Design

Per `tech.md`, KArt uses **Server Actions** as the primary interface for mutations originating from within the application, and **Route Handlers** only where an HTTP endpoint is genuinely required (file uploads, auth callbacks, future public API, webhooks).

## 7.1 Server Actions by Module

All actions live under `src/features/<module>/actions` (or a top-level `src/actions/<module>` module per `structure.md`'s dependency rules — actions are part of the Server layer, not Services). Every action:

1. Authenticates (for Studio actions) via Auth.js session.
2. Validates input with the matching Zod schema.
3. Delegates to the Service layer.
4. Returns a typed result: `{ success: true, data }` or `{ success: false, error }`.
5. Triggers `revalidatePath`/`revalidateTag` for affected public pages.

### Artwork

| Action | Auth Required | Description |
|---|---|---|
| `createArtworkAction` | Yes | FR-ART-001 |
| `updateArtworkAction` | Yes | FR-ART-002 |
| `saveArtworkDraftAction` | Yes | FR-ART-004 |
| `publishArtworkAction` | Yes | FR-ART-005 |
| `unpublishArtworkAction` | Yes | FR-ART-006 |
| `archiveArtworkAction` | Yes | FR-ART-007 |
| `restoreArtworkAction` | Yes | FR-ART-008 |
| `softDeleteArtworkAction` | Yes | FR-ART-009 |
| `permanentDeleteArtworkAction` | Yes | FR-ART-009, requires `confirm: true` |
| `duplicateArtworkAction` | Yes | FR-ART-024 |
| `uploadArtworkImageAction` | Yes | FR-ART-014, delegates to `ArtworkImageService` + `StorageService` |
| `reorderArtworkImagesAction` | Yes | FR-ART-014 |
| `setPrimaryArtworkImageAction` | Yes | FR-ART-015 |
| `removeArtworkImageAction` | Yes | FR-ART-014 |

### Category

| Action | Auth | Description |
|---|---|---|
| `createCategoryAction` | Yes | FR-CAT-001 |
| `updateCategoryAction` | Yes | FR-CAT-003 |
| `archiveCategoryAction` | Yes | FR-CAT-004 |
| `restoreCategoryAction` | Yes | FR-CAT-005 |
| `deleteCategoryAction` | Yes | FR-CAT-006, blocked if artwork assigned |

### Collection

| Action | Auth | Description |
|---|---|---|
| `createCollectionAction` | Yes | FR-COL-001 |
| `updateCollectionAction` | Yes | FR-COL-003 |
| `publishCollectionAction` | Yes | FR-COL-005 |
| `archiveCollectionAction` | Yes | FR-COL-006 |
| `restoreCollectionAction` | Yes | FR-COL-007 |
| `deleteCollectionAction` | Yes | FR-COL-008 |
| `assignArtworkToCollectionAction` | Yes | FR-COL-009 |
| `removeArtworkFromCollectionAction` | Yes | FR-COL-010 |
| `reorderArtworksInCollectionAction` | Yes | Updates `ArtworkCollection.displayOrder`; supports Collection Management "Control display order" |

### Story

| Action | Auth | Description |
|---|---|---|
| `createStoryAction` / `updateStoryAction` | Yes | FR-STORY-001, 003 |
| `publishStoryAction` / `unpublishStoryAction` | Yes | FR-STORY-005, 006 |
| `archiveStoryAction` / `restoreStoryAction` | Yes | FR-STORY-007, 008 |
| `deleteStoryAction` | Yes | FR-STORY-009 |

### Shop / Order / Payment

| Action | Auth | Description |
|---|---|---|
| `submitPurchaseRequestAction` | No (public) | FR-SHOP-006, creates Order + Payment |
| `updateOrderStatusAction` | Yes | FR-ORDER-004 |
| `cancelOrderAction` | Yes | FR-ORDER-005 |
| `addOrderNoteAction` | Yes | FR-ORDER-006 |
| `updatePaymentStatusAction` | Yes | FR-PAY-004 |
| `recordPaymentDetailsAction` | Yes | FR-PAY-005, 006, 007 |

### Commission

| Action | Auth | Description |
|---|---|---|
| `submitCommissionRequestAction` | No (public) | FR-COM-001 |
| `updateCommissionStatusAction` | Yes | FR-COM-004 |
| `addCommissionNoteAction` | Yes | FR-COM-005 |
| `deleteCommissionAction` | Yes | FR-COM-010 |

### Contact

| Action | Auth | Description |
|---|---|---|
| `submitContactMessageAction` | No (public) | FR-CONTACT-001 |
| `updateContactStatusAction` | Yes | FR-CONTACT-004 |
| `addContactNoteAction` | Yes | FR-CONTACT-005 |
| `deleteContactMessageAction` | Yes | FR-CONTACT-008 |

### Settings & Auth

| Action | Auth | Description |
|---|---|---|
| `updateProfileAction` | Yes | FR-SET-001 |
| `updateSocialLinksAction` | Yes | FR-SET-002 |
| `updateContactInfoAction` | Yes | FR-SET-003 |
| `updateWebsiteInfoAction` | Yes | FR-SET-004 |
| `updateNotificationPreferencesAction` | Yes | FR-SET-006 |
| `updateAboutInfoAction` | Yes | FR-SET-007 |
| `changePasswordAction` | Yes | FR-AUTH-006 |
| `requestPasswordResetAction` | No (public) | FR-AUTH-007 |
| `resetPasswordAction` | No (token-based) | FR-AUTH-007 |

## 7.2 Route Handlers

Route Handlers are used only where Server Actions are not suitable:

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | Auth.js session, login, logout, callbacks |
| `/api/uploads/artwork` | POST | Multipart image upload for artwork (large binary payloads) |
| `/api/uploads/commission-reference` | POST | Visitor-submitted reference images |
| `/api/uploads/story` | POST | Story featured image upload |
| `/api/health` | GET | Deployment health check |

Future (documented for extensibility, not implemented in V1):

| Route | Purpose |
|---|---|
| `/api/v1/artworks` | Public read-only API |
| `/api/webhooks/payment-provider` | Future payment gateway integration |

## 7.3 Response Contract

All Server Actions return a discriminated union so client components can handle results without throwing:

```ts
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string; fieldErrors?: Record<string, string[]> } };
```

Route Handlers return standard HTTP status codes with a consistent JSON error envelope:

```json
{ "error": { "message": "Something went wrong. Please try again later." } }
```

Internal error details are never included in the response body (NFR-SEC / Error Security in `tech.md`).

---

# 8. UI Architecture

## 8.1 Route Map

Following `structure.md`'s App Router organization:

```
app/
├── (public)/
│   ├── page.tsx                       # Home            FR-HOME
│   ├── gallery/page.tsx                # Gallery          FR-GALLERY
│   ├── gallery/[slug]/page.tsx         # Artwork Details  FR-ARTPAGE
│   ├── collections/page.tsx            # Collections list FR-COLPAGE-001
│   ├── collections/[slug]/page.tsx     # Collection detail FR-COLPAGE-002
│   ├── shop/page.tsx                   # Shop listing     FR-SHOP-001..003
│   ├── shop/[slug]/page.tsx            # Shop artwork detail + purchase FR-SHOP-004..008
│   ├── stories/page.tsx                # Stories list     FR-STORYPAGE-001
│   ├── stories/[slug]/page.tsx         # Story detail     FR-STORYPAGE-002
│   ├── about/page.tsx                  # About            FR-ABOUT-001
│   ├── commissions/page.tsx            # Commission form  FR-COMPAGE
│   ├── contact/page.tsx                # Contact          FR-CONTACTPAGE
│   ├── layout.tsx                      # Public shell (Header, Footer, Nav)
│   └── not-found.tsx
│
├── (studio)/
│   ├── layout.tsx                      # Studio shell (Sidebar nav, auth guard)
│   ├── dashboard/page.tsx              # FR-DASH
│   ├── insights/page.tsx               # FR-INSIGHT
│   ├── artworks/page.tsx               # List/search/filter
│   ├── artworks/new/page.tsx           # Create
│   ├── artworks/[id]/page.tsx          # Edit/view
│   ├── categories/page.tsx
│   ├── collections/page.tsx
│   ├── collections/[id]/page.tsx
│   ├── stories/page.tsx
│   ├── stories/[id]/page.tsx
│   ├── orders/page.tsx
│   ├── orders/[id]/page.tsx            # includes Payment panel
│   ├── commissions/page.tsx
│   ├── commissions/[id]/page.tsx
│   ├── messages/page.tsx
│   ├── messages/[id]/page.tsx
│   └── settings/page.tsx
│
├── (auth)/
│   ├── login/page.tsx                  # FR-AUTH-001
│   ├── forgot-password/page.tsx        # FR-AUTH-007
│   └── reset-password/page.tsx         # FR-AUTH-007
│
├── api/
│   ├── auth/[...nextauth]/route.ts
│   ├── uploads/artwork/route.ts
│   ├── uploads/commission-reference/route.ts
│   ├── uploads/story/route.ts
│   └── health/route.ts
│
├── layout.tsx                          # Root layout (fonts, theme, providers)
├── loading.tsx
└── error.tsx
```

The Studio route group requires authentication at the `layout.tsx` level (`middleware.ts` additionally guards `/studio/*` at the edge for defense in depth), satisfying BR-003 and FR-AUTH-005.

## 8.2 Rendering Strategy Per Route

| Route Category | Rendering | Rationale |
|---|---|---|
| Public content pages (Home, Gallery, Artwork Details, Collections, Stories, About) | Server Components, statically/ISR-cached where possible | Performance, SEO, minimal JS (`product.md` Quiet Interface) |
| Public forms (Shop purchase, Commission, Contact) | Server Component shell + Client Component form (React Hook Form) | Interactivity required only for the form itself |
| Studio list/detail pages | Server Component for initial data + Client Components for interactive tables/filters | Fast initial load, rich interaction where needed |
| Studio editors (Artwork/Story/Collection forms) | Client Components | Complex form state, image upload, live validation |

## 8.3 Page Composition Examples

**Gallery Page (`(public)/gallery/page.tsx`)**
```
GalleryPage (Server Component)
 ├─ PageHeader
 ├─ GalleryFilters (Client Component: category/collection/availability + search)
 ├─ ArtworkGrid (Server Component, streamed)
 │    └─ ArtworkCard × n
 ├─ Pagination (Client Component)
 └─ EmptyState (if no results)
```

**Artwork Studio Editor (`(studio)/artworks/[id]/page.tsx`)**
```
ArtworkEditorPage (Server Component: fetches artwork + categories + collections)
 └─ ArtworkForm (Client Component)
      ├─ ImageUploader (drag/drop, reorder, set primary)
      ├─ RichTextEditor (story/description)
      ├─ CategorySelect
      ├─ CollectionMultiSelect (TagSelector-based)
      ├─ AvailabilitySelector
      ├─ PriceInput (conditional on forSale)
      ├─ FeaturedToggle
      └─ FormActions (Save Draft / Publish / Archive / Delete)
```

## 8.4 Design System Alignment

All UI implementation must follow `product.md`'s Visual Identity, Typography, Color Philosophy, and Motion Design sections. The `components/ui` layer wraps shadcn/ui primitives themed to KArt's neutral, editorial palette rather than shadcn defaults, per `tech.md`'s note that shadcn components should be customized rather than used unmodified.

---

# 9. Folder Organization

Applying `structure.md` to KArt's actual modules:

```
kart/
├── steering_files/
│   ├── product.md
│   ├── tech.md
│   ├── structure.md
│   └── development_rules.md
├── specs/
│   ├── requirements.md
│   ├── design.md
│   └── tasks.md
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
│   ├── logo.svg
│   ├── favicon.ico
│   └── icons/
└── src/
    ├── app/
    │   ├── (public)/...
    │   ├── (studio)/...
    │   ├── (auth)/...
    │   └── api/...
    ├── components/
    │   ├── ui/                # Button, Input, Card, Dialog, Badge, Avatar, Tooltip
    │   ├── layout/             # Header, Footer, Container, Sidebar, Navigation, Section
    │   ├── gallery/            # ArtworkCard, ArtworkGrid, ArtworkPreview, ArtworkCarousel, ArtworkFilter
    │   ├── studio/             # ArtworkTable, SidebarNavigation, StatsCard, QuickActions, OrderCard
    │   ├── forms/              # ImageUploader, RichTextEditor, PriceInput, TagSelector, AvailabilitySelector
    │   ├── feedback/           # LoadingSpinner, EmptyState, ErrorState, SuccessBanner, Skeleton
    │   └── shared/             # Logo, ThemeToggle, ThemeProvider, Breadcrumb
    ├── features/
    │   ├── artworks/
    │   │   ├── actions/        # Server Actions
    │   │   ├── components/     # Feature-specific UI (ArtworkForm, PublishDialog)
    │   │   ├── hooks/
    │   │   └── constants/
    │   ├── categories/
    │   ├── collections/
    │   ├── stories/
    │   ├── shop/
    │   ├── orders/
    │   ├── payments/
    │   ├── commissions/
    │   ├── contact/
    │   ├── dashboard/
    │   ├── settings/
    │   └── auth/
    ├── services/
    │   ├── artwork/  { ArtworkService.ts, ArtworkPublishingService.ts, ArtworkImageService.ts }
    │   ├── category/ { CategoryService.ts }
    │   ├── collection/ { CollectionService.ts }
    │   ├── story/    { StoryService.ts }
    │   ├── shop/     { ShopService.ts }
    │   ├── order/    { OrderService.ts }
    │   ├── payment/  { PaymentService.ts }
    │   ├── commission/ { CommissionService.ts }
    │   ├── contact/  { ContactService.ts }
    │   ├── settings/ { SettingsService.ts }
    │   ├── dashboard/ { DashboardService.ts }
    │   ├── activity/ { ActivityLogService.ts }
    │   └── storage/  { StorageService.ts, LocalStorageProvider.ts }
    ├── repositories/
    │   ├── artwork/ { ArtworkRepository.ts, ArtworkImageRepository.ts }
    │   ├── category/ { CategoryRepository.ts }
    │   ├── collection/ { CollectionRepository.ts }
    │   ├── story/ { StoryRepository.ts }
    │   ├── order/ { OrderRepository.ts, OrderItemRepository.ts }
    │   ├── payment/ { PaymentRepository.ts }
    │   ├── commission/ { CommissionRepository.ts }
    │   ├── contact/ { ContactRepository.ts }
    │   ├── settings/ { ArtistRepository.ts }
    │   └── activity/ { ActivityLogRepository.ts }
    ├── schemas/
    │   ├── artwork/ { CreateArtworkSchema.ts, UpdateArtworkSchema.ts }
    │   ├── category/ { CreateCategorySchema.ts, UpdateCategorySchema.ts }
    │   ├── collection/ ...
    │   ├── story/ ...
    │   ├── order/ { PurchaseRequestSchema.ts, UpdateOrderStatusSchema.ts }
    │   ├── payment/ { UpdatePaymentSchema.ts }
    │   ├── commission/ { CommissionRequestSchema.ts }
    │   ├── contact/ { ContactMessageSchema.ts }
    │   ├── auth/ { LoginSchema.ts, ChangePasswordSchema.ts, ResetPasswordSchema.ts }
    │   └── shared/ { PaginationSchema.ts, IdSchema.ts }
    ├── types/
    │   ├── Artwork.ts
    │   ├── Collection.ts
    │   ├── Category.ts
    │   ├── Story.ts
    │   ├── Order.ts
    │   ├── Payment.ts
    │   ├── Commission.ts
    │   ├── ContactMessage.ts
    │   └── ApiResponse.ts
    ├── hooks/
    │   ├── useDebounce.ts
    │   ├── useImageUpload.ts
    │   ├── useMediaQuery.ts
    │   └── useArtworkFilters.ts
    ├── lib/
    │   ├── auth.ts
    │   ├── prisma.ts
    │   ├── storage.ts
    │   ├── logger.ts
    │   ├── email.ts
    │   └── utils.ts
    ├── config/
    │   ├── site.ts
    │   ├── navigation.ts
    │   └── theme.ts
    ├── constants/
    │   ├── roles.ts
    │   ├── routes.ts
    │   ├── artwork.ts
    │   └── pagination.ts
    ├── styles/
    │   └── globals.css
    └── generated/               # Prisma Client output
```

This mapping satisfies every rule in `structure.md`'s Folder Boundaries table: `app` owns routing only, `services` owns business rules, `repositories` own persistence, `schemas` own validation, and feature folders never contain direct database access.

---

# 10. Component Responsibilities

| Layer | Responsibility | Must Never Do |
|---|---|---|
| `app/**/page.tsx` | Compose Server Components, fetch initial data via Services, define metadata | Contain business rules or Prisma calls |
| `components/ui/*` | Purely presentational, no business logic, no data fetching | Know about Artwork/Order/etc. domain concepts |
| `components/gallery/*` | Present artwork data passed via props (e.g., `ArtworkCard` renders an `Artwork` prop) | Fetch data themselves; call Server Actions directly for mutations |
| `components/studio/*` | Present Studio data structures (tables, stat cards); may trigger Server Actions via feature hooks | Contain validation or business rules |
| `components/forms/*` | Reusable input primitives (`ImageUploader`, `PriceInput`) | Contain domain-specific validation (that lives in `schemas`) |
| `features/<domain>/components/*` | Feature-specific composition (e.g., `ArtworkForm`, `PublishConfirmationDialog`) wiring `components/*` primitives to Server Actions | Bypass Services by calling Prisma or fetch directly |
| `features/<domain>/actions/*` | Thin Server layer: authenticate, validate with Zod, call Service, revalidate cache | Contain business rules (those live in Services) |
| `services/<domain>/*` | All business rules, workflow orchestration, permission checks | Render UI, call React hooks, touch `fetch`/`Request` |
| `repositories/<domain>/*` | Prisma queries, transactions | Contain business rules (e.g., "primary image required to publish") |

---

# 11. State Management Strategy

Per `tech.md`'s state priority order — Server State → URL State → Local Component State → Global State — applied concretely:

| State | Mechanism | Example |
|---|---|---|
| Content data (artworks, orders, etc.) | Server state, fetched in Server Components via Services | Gallery listing, Studio dashboard stats |
| Filters, search, pagination, sort | URL search params (`?category=x&sort=newest&page=2`) | Gallery filters, Studio artwork list filters — shareable, back-button friendly, satisfies FR-COM-004 ("pagination shall maintain active filters") |
| Form state | React Hook Form (local, uncontrolled where possible) | Artwork editor, Commission form, Settings forms |
| Transient UI state (dialog open, tab selected, image carousel index) | `useState` within the owning Client Component | Publish confirmation dialog, image gallery viewer |
| Optimistic UI feedback for mutations | `useTransition` / `useOptimistic` around Server Action calls | Order status update, artwork publish toggle |
| Cross-cutting app state | React Context, used sparingly | Theme (light/dark if introduced), Studio sidebar collapsed state |

**No client-side global data store (e.g., Redux/Zustand) is introduced in Version 1.** Server Components plus targeted Client Components satisfy every requirement without it, consistent with `product.md` Principle 6 (Simplicity Without Limitation) and `tech.md`'s explicit minimization of global state.

Revalidation strategy: mutating Server Actions call `revalidatePath` for the specific public routes affected (e.g., publishing an artwork revalidates `/gallery`, `/gallery/[slug]`, `/`, and any collection pages it belongs to) so the Public Website reflects Studio changes without manual visitor refresh dependency, satisfying BR-016.

---

# 12. Validation Strategy

Three layers, per `tech.md` §"Validation Strategy" and reinforced by FR-COM-013:

```
Client (React Hook Form + Zod resolver)
        │  immediate, user-facing feedback
        ▼
Server Action (Zod .parse on raw input)
        │  security boundary — never trust the client
        ▼
Service Layer (business-rule validation)
        │  e.g., "primary image required before publish",
        │        "price required only when forSale is true",
        │        "category must be Active to be assigned"
        ▼
Repository / Database (foreign keys, unique constraints, NOT NULL)
        final integrity backstop
```

## 12.1 Representative Schemas

```ts
// schemas/artwork/CreateArtworkSchema.ts
export const CreateArtworkSchema = z.object({
  title: z.string().min(1, "Artwork title must contain at least three characters.").min(3),
  description: z.string().optional(),
  story: z.string().optional(),
  categoryId: z.string().uuid("Please select a category."),
  collectionIds: z.array(z.string().uuid()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  availability: z.nativeEnum(Availability).default("AVAILABLE"),
  forSale: z.boolean().default(false),
  price: z.number().positive("Price cannot be negative or zero.").optional(),
  featured: z.boolean().default(false),
}).refine(
  (data) => !data.forSale || (data.forSale && data.price !== undefined),
  { message: "Price is required when artwork is marked for sale.", path: ["price"] }
);
```

```ts
// schemas/order/PurchaseRequestSchema.ts
export const PurchaseRequestSchema = z.object({
  artworkId: z.string().uuid(),
  customerName: z.string().min(1, "Full name is required."),
  customerEmail: z.string().email("Please enter a valid email address."),
  customerPhone: z.string().optional(),
  shippingAddress: z.string().min(1, "Shipping address is required."),
  notes: z.string().optional(),
});
```

```ts
// schemas/commission/CommissionRequestSchema.ts
export const CommissionRequestSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  subject: z.string().min(1),
  description: z.string().min(1),
  budget: z.number().positive().optional(),
  preferredCompletionDate: z.coerce.date()
    .refine((d) => d >= new Date(), "Preferred completion date cannot be in the past.")
    .optional(),
});
```

Validation error messages follow `product.md`/`tech.md` guidance: specific, human-readable, and actionable (e.g., "Artwork title must contain at least three characters." rather than "Invalid input.").

---

# 13. Security Considerations

## 13.1 Authentication

- Auth.js (Credentials provider) with a single Artist account (BR-001).
- Passwords hashed with bcrypt (industry-standard, provided by Auth.js adapters) — never logged, never returned in any response (NFR-SEC-002).
- Sessions use secure, HTTP-only cookies; session expiry configured for inactivity timeout (FR-AUTH-003).
- "Remember Me" (FR-AUTH-008), if enabled, extends session lifetime without weakening cookie security flags.

## 13.2 Authorization

- Every Studio Server Action begins with a session check (`getServerSession`) before any Service call. A missing/invalid session short-circuits with a generic `Unauthorized` result.
- `middleware.ts` additionally protects the `(studio)` route group at the edge, redirecting unauthenticated requests to `/login` before any Server Component renders (FR-AUTH-005, defense in depth).
- Authorization checks live in the Server layer (thin) and are re-verified inside Services for actions with business consequences (e.g., only an authenticated context may call `ArtworkService.publish`).
- Single-role model in V1: no granular RBAC is required, but the Service layer signature already accepts an `actorId`/session context parameter so multi-artist/team-role authorization (`product.md` Future Vision) can be added without redesigning callers.

## 13.3 Input Validation & Injection Protection

- All external input (forms, Server Action payloads, query params) passes through Zod schemas before reaching a Service (NFR-SEC-004).
- Prisma's parameterized queries eliminate SQL injection risk; raw SQL is not used.
- User-generated rich text (Story content, Artwork description) is sanitized before storage/render to prevent stored XSS; the `RichTextEditor` component uses an allow-listed sanitizer.

## 13.4 File Upload Security

- `StorageService` validates, before persisting any upload:
  - File type (allow-list: JPEG, PNG, WebP for artwork/commission images)
  - Maximum file size (configured constant, e.g. `MAX_UPLOAD_SIZE`)
  - Image integrity (re-encoded via a server-side image library rather than trusting the original bytes)
- Uploaded filenames are never trusted; the system generates a new UUID-based filename and stores the original name only as metadata.
- Files are stored outside `src` (local `/uploads` in development; external object storage in production), never inside application source.

## 13.5 Secrets & Configuration

- `DATABASE_URL`, `AUTH_SECRET`, storage credentials, and any API keys live only in environment variables; `.env.example` documents required keys without real values.
- No secret is ever logged or included in error responses returned to the client.

## 13.6 Error Handling Security

- User-facing error messages are generic and actionable ("Unable to publish artwork. Please try again.").
- Full error detail (stack trace, query, internal identifiers) is written only to server-side structured logs, never returned to the client (NFR-SEC / `tech.md` Error Security).

## 13.7 Rate Limiting Readiness

- Public mutation actions (`submitPurchaseRequestAction`, `submitCommissionRequestAction`, `submitContactMessageAction`, `requestPasswordResetAction`) are isolated in dedicated Server Action functions so a future rate-limiting middleware can target them individually without refactoring (BR/NFR future compatibility, `tech.md` §Rate Limiting).

## 13.8 Data Protection

- Only fields explicitly required by SRS §4 are collected from visitors (e.g., no unnecessary personal data).
- Public queries (`ArtworkRepository.findPublished`, etc.) select only fields safe for public exposure; internal fields (`internalNotes`, `deletedAt`, payment details) are excluded at the repository query level, not filtered post-fetch, so they can never leak through an oversight (BR-015).

---

# 14. Sequence Diagrams

## 14.1 Studio Login

```
Artist          LoginPage        Server Action        Auth.js          ArtistRepository
  │                  │                  │                 │                    │
  │ submit creds     │                  │                 │                    │
  │─────────────────▶│                  │                 │                    │
  │                  │ loginAction()    │                 │                    │
  │                  │─────────────────▶│                 │                    │
  │                  │                  │ validate(email) │                    │
  │                  │                  │────────────────▶│                    │
  │                  │                  │                 │ findByEmail()      │
  │                  │                  │                 │───────────────────▶│
  │                  │                  │                 │◀───────────────────│
  │                  │                  │ compare hash    │                    │
  │                  │                  │◀────────────────│                    │
  │                  │                  │ create session  │                    │
  │                  │                  │────────────────▶│                    │
  │                  │◀─────────────────│  session cookie │                    │
  │◀─────────────────│ redirect /studio/dashboard          │                    │
```

## 14.2 Publish Artwork

```
Artist        ArtworkForm      publishArtworkAction   ArtworkPublishingService   ArtworkRepository   Cache
  │               │                    │                        │                     │              │
  │ click Publish │                    │                        │                     │              │
  │──────────────▶│                    │                        │                     │              │
  │               │ call action(id)    │                        │                     │              │
  │               │───────────────────▶│                        │                     │              │
  │               │                    │ auth check (session)   │                     │              │
  │               │                    │ publish(id)             │                     │              │
  │               │                    │───────────────────────▶│                     │              │
  │               │                    │                        │ hasPrimaryImage()?  │              │
  │               │                    │                        │────────────────────▶│              │
  │               │                    │                        │◀────────────────────│              │
  │               │                    │                        │  [if false] throw ValidationError  │
  │               │                    │                        │  [if true] update(status=PUBLISHED, │
  │               │                    │                        │            publishedAt=now())       │
  │               │                    │                        │────────────────────▶│              │
  │               │                    │                        │◀────────────────────│              │
  │               │                    │◀───────────────────────│                     │              │
  │               │                    │ revalidatePath(/gallery, /gallery/[slug], /)  │              │
  │               │                    │─────────────────────────────────────────────────────────────▶│
  │               │◀───────────────────│ { success: true }      │                     │              │
  │◀──────────────│ show success toast │                        │                     │              │
```

## 14.3 Purchase Request → Order Creation

```
Visitor      ShopArtworkPage   submitPurchaseRequestAction   ShopService   OrderRepository   PaymentRepository
  │               │                       │                       │              │                  │
  │ submit form   │                       │                       │              │                  │
  │──────────────▶│                       │                       │              │                  │
  │               │ call action(input)    │                       │              │                  │
  │               │──────────────────────▶│                       │              │                  │
  │               │                       │ zod validate           │              │                  │
  │               │                       │ createOrderFromRequest()             │                  │
  │               │                       │──────────────────────▶│              │                  │
  │               │                       │                       │ isPurchasable(artworkId)?         │
  │               │                       │                       │  [Published && ForSale &&         │
  │               │                       │                       │   Available] BR-011                │
  │               │                       │                       │ create Order + OrderItem snapshot │
  │               │                       │                       │─────────────▶│                  │
  │               │                       │                       │◀─────────────│                  │
  │               │                       │                       │ create Payment (status=PENDING)   │
  │               │                       │                       │──────────────────────────────────▶│
  │               │                       │                       │◀──────────────────────────────────│
  │               │                       │◀──────────────────────│              │                  │
  │               │◀──────────────────────│ { orderNumber }        │              │                  │
  │◀──────────────│ show confirmation      │                       │              │                  │
```

## 14.4 Commission Request Workflow

```
Visitor    CommissionPage   submitCommissionRequestAction   CommissionService   CommissionRepository   ActivityLogService
  │             │                     │                            │                    │                     │
  │ submit form │                     │                            │                    │                     │
  │────────────▶│                     │                            │                    │                     │
  │             │ call action(input)  │                            │                    │                     │
  │             │────────────────────▶│                            │                    │                     │
  │             │                     │ zod validate                │                    │                     │
  │             │                     │ create(input, status=NEW)   │                    │                     │
  │             │                     │───────────────────────────▶│                    │                     │
  │             │                     │                            │────────────────────▶│                     │
  │             │                     │                            │◀────────────────────│                     │
  │             │                     │◀───────────────────────────│                    │                     │
  │             │                     │ log(COMMISSION_REQUEST_RECEIVED) │               │                     │
  │             │                     │────────────────────────────────────────────────────────────────────────▶│
  │             │◀────────────────────│ { requestNumber }           │                    │                     │
  │◀────────────│ show confirmation    │                            │                    │                     │
```

Later, from the Studio: `Artist → updateCommissionStatusAction → CommissionService.updateStatus() → CommissionRepository.update() + insert CommissionStatusHistory row`.

## 14.5 Image Upload (Artwork)

```
Artist    ImageUploader    /api/uploads/artwork    StorageService    ArtworkImageService    ArtworkImageRepository
  │             │                    │                     │                  │                      │
  │ select file │                    │                     │                  │                      │
  │────────────▶│                    │                     │                  │                      │
  │             │ POST multipart      │                     │                  │                      │
  │             │───────────────────▶│                     │                  │                      │
  │             │                    │ auth check           │                  │                      │
  │             │                    │ validate(type,size)  │                  │                      │
  │             │                    │──────────────────────▶│                  │                      │
  │             │                    │                     │ re-encode/verify │                      │
  │             │                    │                     │ store(uuid-name) │                      │
  │             │                    │◀──────────────────────│                  │                      │
  │             │                    │ attachToArtwork(artworkId, url)          │                      │
  │             │                    │──────────────────────────────────────────▶│                      │
  │             │                    │                                          │──────────────────────▶│
  │             │                    │                                          │◀──────────────────────│
  │             │◀───────────────────│ { imageUrl }                             │                      │
  │◀────────────│ preview + reorder UI│                                          │                      │
```

---

# 15. Non-Functional Design Considerations

## 15.1 Performance

- Server Components + static/ISR rendering for public content pages satisfy NFR-PERF-001 (page load < 3s target).
- `next/image` used for all artwork images: responsive `sizes`, lazy loading below the fold, priority loading for the primary hero/gallery image (NFR-PERF-003, `tech.md` Image Optimization).
- Repository queries select only required fields (`select` in Prisma) and use indexes defined in §5 (`status+availability`, `categoryId`, `customerEmail`) to keep Studio and Gallery queries fast as data grows (NFR-PERF, Database Performance).
- Pagination (`FR-COM-004`) is applied to every list endpoint from V1, even before data volume requires it, to avoid future rework.

## 15.2 Accessibility

- `components/ui` primitives are built on shadcn/ui, which provides accessible defaults (keyboard nav, ARIA attributes, focus management) — customized styling must preserve these behaviors (NFR-ACC-001..003).
- All artwork images store descriptive alt text via `ArtworkImage.altText` (§5). The Studio encourages descriptive alt text for accessibility. Alt text remains optional in Version 1 but should be provided whenever possible, so public images can better satisfy NFR-ACC-002.

## 15.3 Responsive Design

- Tailwind's default breakpoints structure every layout; Studio tables collapse to stacked cards below `md`; the Gallery grid reduces column count from 4 (desktop) → 2 (tablet) → 1 (mobile) (NFR-RESP-001/002).

## 15.4 Logging & Monitoring

- `lib/logger.ts` provides a structured logging interface used by all Services for significant events (order created, payment status changed, publish/unpublish, auth failures) — satisfying NFR-LOG-001 while never logging sensitive data (passwords, tokens, full card/payment credentials — none of which V1 collects, per BR-014).
- `ActivityLogService` writes a subset of these events to the `ActivityLog` table specifically to power the Dashboard's "Recent Activity" feed (FR-DASH-003).

## 15.5 Extensibility Hooks (per Build Once, Grow Forever)

| Future Capability | Design Hook Already Present |
|---|---|
| Online payment gateway | `PaymentService`/`Payment` model isolated from `OrderService`; a gateway webhook can update `Payment.status` without touching Order logic. |
| Customer accounts | `Order`/`Commission` already store customer contact info independently of any `User`-like entity; a `Customer` model can be introduced and linked without restructuring existing tables. |
| Multiple artists | `Artist` is already a distinct model rather than a hardcoded config; Artwork/Category/etc. can gain an `artistId` foreign key later. Service method signatures already anticipate an actor/session context. |
| Print-on-demand / digital downloads | New `ArtworkVariant`-style model can attach to existing `Artwork` without schema breakage, since `Artwork` is the aggregation root. |
| Public API | Route Handlers already documented as the mechanism (§7.2); they would call the same Services used by Server Actions, per `tech.md`'s API Philosophy. |

---

# 16. Requirements Traceability Summary

This design covers all SRS modules end-to-end:

| SRS Section | Design Coverage |
|---|---|
| 4.1 Authentication & Authorization | §6 AuthService, §7.1 Auth actions, §13.1–13.2 |
| 4.2 Dashboard | §6 DashboardService/ActivityLogService, §8.1 route, §15.4 |
| 4.3 Artwork Management | §5 Artwork/ArtworkImage schema, §6 ArtworkService family, §7.1, §14.2, §14.5 |
| 4.4 Category Management | §5 Category schema, §6 CategoryService, §7.1 |
| 4.5 Collection Management | §5 Collection/ArtworkCollection schema, §6 CollectionService, §7.1 |
| 4.6 Story Management | §5 Story/StoryArtwork schema, §6 StoryService, §7.1 |
| 4.7 Shop Management | §5 (reuses Artwork), §6 ShopService, §7.1, §14.3 |
| 4.8 Order Management | §5 Order/OrderItem/OrderStatusHistory, §6 OrderService, §7.1 |
| 4.9 Payment Tracking | §5 Payment, §6 PaymentService, §7.1 |
| 4.10 Commission Management | §5 Commission/CommissionImage/CommissionStatusHistory, §6 CommissionService, §14.4 |
| 4.11 Contact Management | §5 ContactMessage, §6 ContactService |
| 4.12 Settings | §5 Artist, §6 SettingsService |
| 4.13 Insights | §6 InsightsService, §8.1 route, reuses Artwork/Order/Commission repositories |
| 5. Public Website | §8 UI Architecture, route map |
| 6. Common Functional Behaviors | §11 State Management (pagination/filter/sort via URL state), §12 Validation, soft-delete pattern in §5.1 |
| 7. Non-Functional Requirements | §15 |
| 8. Business Rules | Enforced throughout §4–§13, cross-referenced inline |

All Version 1 acceptance workflows defined in SRS §9 (Artwork, Collection, Story, Purchase, Commission, Contact) are realized end-to-end by the sequence diagrams in §14 and the layered architecture in §3.

---

# 17. Design Compliance Statement

This design intentionally:

- Introduces no functionality outside the documented SRS scope (`development_rules.md` — AI must never invent features).
- Uses only the technologies specified in `tech.md`.
- Follows the folder ownership rules defined in `structure.md` without exception.
- Preserves every product principle from `product.md`, particularly Artwork Above Everything, The Quiet Interface, and Build Once, Grow Forever.
- Leaves clear, documented extension points for every feature explicitly deferred to future versions, without implementing any of them prematurely.

Any implementation built from this design should be reviewed against the Engineering Review Checklist in `tech.md` and the Structure Consistency Checklist in `structure.md` before being considered complete.