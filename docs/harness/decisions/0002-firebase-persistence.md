# ADR 0002: Firebase persistence platform

- Status: Accepted
- Date: 2026-08-31

## Context

The product owner selected Firebase for MindSpace data storage. The product will later need authentication, board persistence, file storage, autosave, and cross-device access. Board-domain code must remain portable and testable without a live cloud dependency.

## Decision

- Use Cloud Firestore for workspace/board metadata and versioned board documents.
- Use Firebase Storage for imported images and PDFs.
- Plan to use Firebase Authentication when accounts enter scope.
- Isolate Firebase client/Admin SDKs behind authentication, persistence, and file adapters.
- Use Firebase Emulator Suite for integration and Security Rules tests.
- Keep collaborative realtime/conflict-resolution strategy as a separate future decision; Firestore listeners alone are not treated as a complete collaboration design.

## Consequences

Firebase provides a coherent managed platform and cross-device data primitives. The project must design around Firestore document limits, read/write cost, indexes, offline behavior, Security Rules, and transaction semantics. The adapter boundary prevents these concerns from leaking into board UI/domain logic.
