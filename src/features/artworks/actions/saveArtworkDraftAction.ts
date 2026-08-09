"use server";

// FR-ART-004 "save draft" is behaviorally identical to updateArtworkAction
// — creating already defaults to Draft, and update never changes
// lifecycle status. Re-exported under its own name to match the SRS
// action list exactly, without duplicating the implementation.
export { updateArtworkAction as saveArtworkDraftAction } from "./updateArtworkAction";