import { StoryRepository } from "@/repositories/story/StoryRepository";
import { generateUniqueSlug } from "@/lib/uniqueSlug";
import { sanitizeRichText } from "@/lib/sanitize";
import type { ContentStatus, Story } from "@prisma/client";

export class StoryServiceError extends Error {}

export interface StoryInput {
  title: string;
  content: string;
  featuredImage?: string;
  relatedArtworkIds?: string[];
  featured?: boolean;
}

export const StoryService = {
  async list(filters: { status?: ContentStatus; featured?: boolean } = {}) {
    return StoryRepository.list(filters);
  },

  async getById(id: string) {
    return StoryRepository.findById(id);
  },

  async create(input: StoryInput): Promise<Story> {
    if (!input.title.trim()) throw new StoryServiceError("Title is required.");
    if (!input.content.trim()) throw new StoryServiceError("Content is required.");

    const slug = await generateUniqueSlug(input.title, (c) => StoryRepository.slugExists(c));

    const story = await StoryRepository.create({
      title: input.title,
      slug,
      content: sanitizeRichText(input.content),
      featuredImage: input.featuredImage ?? null,
      featured: input.featured ?? false,
    });

    if (input.relatedArtworkIds?.length) await StoryRepository.setRelatedArtworks(story.id, input.relatedArtworkIds);

    return (await StoryRepository.findById(story.id))!;
  },

  async update(id: string, input: Partial<StoryInput>): Promise<Story> {
    const existing = await StoryRepository.findById(id);
    if (!existing) throw new StoryServiceError("Story not found.");

    if (input.title !== undefined && !input.title.trim()) throw new StoryServiceError("Title is required.");
    if (input.content !== undefined && !input.content.trim()) throw new StoryServiceError("Content is required.");

    await StoryRepository.update(id, {
      title: input.title,
      content: input.content !== undefined ? sanitizeRichText(input.content) : undefined,
      featuredImage: input.featuredImage,
      featured: input.featured,
    });

    if (input.relatedArtworkIds) await StoryRepository.setRelatedArtworks(id, input.relatedArtworkIds);

    return (await StoryRepository.findById(id))!;
  },

  async publish(id: string): Promise<Story> {
    const story = await StoryRepository.findById(id);
    if (!story) throw new StoryServiceError("Story not found.");
    if (!story.title.trim() || !story.content.trim()) {
      throw new StoryServiceError("Title and content are required before publishing.");
    }
    return StoryRepository.updateStatus(id, "PUBLISHED", new Date());
  },

  async unpublish(id: string): Promise<Story> {
    if (!(await StoryRepository.findById(id))) throw new StoryServiceError("Story not found.");
    return StoryRepository.updateStatus(id, "DRAFT");
  },

  async archive(id: string): Promise<Story> {
    if (!(await StoryRepository.findById(id))) throw new StoryServiceError("Story not found.");
    return StoryRepository.updateStatus(id, "ARCHIVED");
  },

  async restore(id: string): Promise<Story> {
    const story = await StoryRepository.findById(id);
    if (!story) throw new StoryServiceError("Story not found.");
    const restoredStatus: ContentStatus = story.publishedAt ? "PUBLISHED" : "DRAFT";
    return StoryRepository.updateStatus(id, restoredStatus);
  },

  async delete(id: string): Promise<void> {
    if (!(await StoryRepository.findById(id))) throw new StoryServiceError("Story not found.");
    await StoryRepository.softDelete(id);
  },
};