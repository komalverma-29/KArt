# KArt Development Rules

> Version: 1.0
> Project: KArt
> Document Type: Development Rules
> Status: Active

---

# Purpose

This document defines how contributors should work on KArt.

It does not define the product, technology, or project structure.

Instead, it defines the workflow, decision-making process, and collaboration rules that every contributor must follow.

These rules apply equally to:

- Human developers
- AI coding assistants
- Future contributors

---

# Authority Hierarchy

When multiple sources of information exist, resolve conflicts using the following priority.

1. Explicit User Instructions

The latest approved user instruction always has the highest priority.

↓

2. Steering Documents

- product.md
- tech.md
- structure.md
- development_rules.md

↓

3. Specification Documents

- requirements.md
- design.md
- tasks.md

↓

4. Existing Implementation

Existing code should be followed unless it conflicts with higher-priority documents.

---

# Development Philosophy

Development should prioritize long-term quality over short-term speed.

Every contribution should improve at least one of the following:

- Maintainability
- Readability
- Consistency
- Scalability
- Developer Experience

Avoid changes that solve today's problem while making future development more difficult.

---

# Contributor Responsibilities

Every contributor is responsible for:

- Understanding the current task.
- Respecting project standards.
- Keeping changes focused.
- Preserving architectural consistency.
- Leaving the project in a better state than before.

Contributors should think of themselves as maintaining a long-term product rather than completing isolated tasks.

# Development Workflow

Every contribution should follow the same workflow regardless of its size.

Skipping steps to save time often increases long-term maintenance cost.

The recommended workflow is:

Understand

↓

Plan

↓

Implement

↓

Review

↓

Test

↓

Complete

Each step should be completed before moving to the next.

---

# Before Starting Any Task

Before writing or modifying code:

1. Read the relevant steering documents.

2. Read the current specification.

3. Identify the affected modules.

4. Review the existing implementation.

5. Understand how the new work fits into the current architecture.

Do not begin implementation until the context is understood.

---

# Context Loading

Contributors should gather sufficient context before making changes.

Context includes:

- Related modules
- Existing patterns
- Similar implementations
- Current project conventions

Avoid implementing features based on assumptions.

If existing behavior is unclear, investigate before modifying it.

---

# Scope Discipline

Every task has a defined scope.

Implement only what has been requested.

Do not:

- Add unrelated features.
- Refactor unrelated modules.
- Rename files outside the task.
- Replace existing architecture.
- Introduce new libraries without approval.

Keeping changes focused improves maintainability and simplifies code reviews.

---

# Working With Existing Code

Prefer extending existing implementations over replacing them.

Before creating:

- Components
- Services
- Repositories
- Hooks
- Schemas
- Utilities

Determine whether an existing implementation can be reused or extended.

Create new files only when a new responsibility is introduced.

---

# Incremental Development

Implement features in small, complete increments.

Large features should be divided into smaller deliverables.

Each completed task should leave the project in a working state.

Avoid partially implemented features that require unrelated future work to function correctly.

---

# Change Management

Every modification should have a clear purpose.

Acceptable reasons include:

- Adding approved functionality.
- Fixing defects.
- Improving maintainability.
- Improving readability.
- Improving performance when justified.

Avoid changes made solely for personal preference.

---

# Assumptions

Do not assume missing business requirements.

If the specification does not define expected behavior:

- Stop implementation.
- Request clarification.
- Document any agreed decision before continuing.

Making assumptions creates inconsistent behavior and increases future rework.

---

# When to Ask for Clarification

Seek clarification when:

- Requirements are ambiguous.
- Multiple valid implementations exist.
- A change affects architecture.
- Existing behavior conflicts with the specification.
- A requested feature contradicts the steering documents.

Clarification is preferred over guessing.

---

# Working With Incomplete Specifications

If implementation cannot continue because information is missing:

Do not invent missing functionality.

Instead:

- Identify the missing information.
- Explain why it is required.
- Wait for clarification before proceeding.

Specifications should drive implementation, not the other way around.

---

# Completing a Task

A task is complete only when:

- The requested functionality has been implemented.
- The implementation follows project standards.
- Existing functionality remains unaffected.
- The project builds successfully.
- No known issues have been introduced.

Stopping after writing code is not sufficient.

Verification is part of implementation.

# Collaboration Rules

Development should be collaborative and predictable.

Every contributor should aim to improve the project while preserving consistency.

Contributors should avoid introducing personal architectural preferences that conflict with the established standards.

When extending existing functionality, prioritize consistency with the current implementation over individual coding style.

---

# AI Collaboration

AI assistants are contributors, not decision makers.

Their responsibility is to implement approved specifications accurately.

AI should:

- Follow the steering documents.
- Follow the current specifications.
- Extend existing implementations where appropriate.
- Produce production-ready code.
- Explain assumptions when clarification is required.

AI should never:

- Redesign the product.
- Introduce undocumented features.
- Replace established architectural patterns.
- Ignore project conventions.
- Make business decisions on behalf of the project owner.

When uncertainty exists, request clarification instead of making assumptions.

---

# Human Collaboration

Human contributors should review generated code before it becomes part of the project.

Reviews should focus on:

- Correctness
- Maintainability
- Readability
- Consistency
- Alignment with project goals

The objective of a review is to improve the project rather than simply approve changes.

---

# Review Process

Every completed implementation should be reviewed before being considered finished.

During review, verify:

- The requested functionality is complete.
- The implementation follows the steering documents.
- The implementation satisfies the specification.
- Existing functionality has not been broken.
- No unnecessary changes were introduced.

If issues are discovered, they should be resolved before moving to the next task.

---

# Definition of Complete

A task is considered complete only when:

- The requested functionality has been implemented.
- The implementation follows all applicable steering documents.
- The implementation satisfies the approved specification.
- The project builds successfully.
- The feature has been reviewed.
- The feature is ready for future extension.

Writing code alone does not complete a task.

Quality verification is part of completion.

---

# Continuous Improvement

The project should improve over time.

When recurring issues are identified:

- Update the relevant documentation.
- Improve the development process.
- Clarify future expectations.

Do not rely on repeated verbal instructions to enforce project standards.

Long-term knowledge belongs in documentation.

---

# Maintaining the Steering Documents

The steering documents are living documents.

They should only be updated when:

- A long-term project decision changes.
- The architecture evolves.
- A recurring development issue requires clearer guidance.

They should not be modified to justify implementation shortcuts or temporary solutions.

---

# Final Development Statement

KArt is intended to be a professional software project built with long-term maintainability in mind.

Every contribution should strengthen the project by respecting its documented vision, architecture, and development process.

Contributors should prioritize clarity over cleverness, consistency over novelty, and long-term quality over short-term speed.

The objective is not simply to complete tasks, but to build software that remains understandable, maintainable, and valuable as the project continues to evolve.

# Contributor Checklist

Before marking a task complete, confirm:

- [ ] I understood the requirements before coding.
- [ ] My changes remain within the approved scope.
- [ ] I reused existing implementations where appropriate.
- [ ] I did not introduce undocumented features.
- [ ] My implementation aligns with all steering documents.
- [ ] The project builds successfully.
- [ ] The feature is ready for review.

If any item cannot be checked, the task should not yet be considered complete.