import { describe, it, expect, vi, beforeEach } from "vitest";
import { StoryService, StoryServiceError } from "@/services/story/StoryService";
import { StoryRepository } from "@/repositories/story/StoryRepository";

vi.mock("@/repositories/story/StoryRepository", () => ({
  StoryRepository: {
    findById: vi.fn(), slugExists: vi.fn(), list: vi.fn(), create: vi.fn(), update: vi.fn(),
    updateStatus: vi.fn(), softDelete: vi.fn(), setRelatedArtworks: vi.fn(),
  },
}));

describe("StoryService.create", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rejects an empty title", async () => {
    await expect(StoryService.create({ title: "", content: "Some content" })).rejects.toThrow("Title is required.");
  });

  it("rejects a whitespace-only title", async () => {
    await expect(StoryService.create({ title: "   ", content: "Some content" })).rejects.toThrow("Title is required.");
  });

  it("rejects empty content", async () => {
    await expect(StoryService.create({ title: "My Story", content: "" })).rejects.toThrow("Content is required.");
  });

  it("defaults a new story to Draft", async () => {
    vi.mocked(StoryRepository.slugExists).mockResolvedValue(false);
    vi.mocked(StoryRepository.create).mockImplementation(async (data) => ({ id: "s1", status: "DRAFT", ...data }) as never);
    vi.mocked(StoryRepository.findById).mockResolvedValue({ id: "s1", status: "DRAFT" } as never);

    const story = await StoryService.create({ title: "My Story", content: "<p>Hello</p>" });
    expect(story.status).toBe("DRAFT");
  });

  it("sanitizes malicious content before it reaches the repository", async () => {
    vi.mocked(StoryRepository.slugExists).mockResolvedValue(false);
    vi.mocked(StoryRepository.create).mockImplementation(async (data) => ({ id: "s1", ...data }) as never);
    vi.mocked(StoryRepository.findById).mockResolvedValue({ id: "s1" } as never);

    await StoryService.create({
      title: "My Story",
      content: '<p onclick="steal()">Hi</p><script>alert(1)</script>',
    });

    const createArgs = vi.mocked(StoryRepository.create).mock.calls[0][0];
    expect(createArgs.content).not.toContain("<script");
    expect(createArgs.content).not.toContain("onclick");
  });

  it("links related artworks after creation", async () => {
    vi.mocked(StoryRepository.slugExists).mockResolvedValue(false);
    vi.mocked(StoryRepository.create).mockResolvedValue({ id: "s1" } as never);
    vi.mocked(StoryRepository.findById).mockResolvedValue({ id: "s1" } as never);

    await StoryService.create({ title: "My Story", content: "<p>Hi</p>", relatedArtworkIds: ["art1", "art2"] });
    expect(StoryRepository.setRelatedArtworks).toHaveBeenCalledWith("s1", ["art1", "art2"]);
  });
});

describe("StoryService.update", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rejects updating a nonexistent story", async () => {
    vi.mocked(StoryRepository.findById).mockResolvedValue(null);
    await expect(StoryService.update("nope", { title: "x" })).rejects.toThrow("Story not found.");
  });

  it("rejects clearing the title to empty on update", async () => {
    vi.mocked(StoryRepository.findById).mockResolvedValue({ id: "s1" } as never);
    await expect(StoryService.update("s1", { title: "" })).rejects.toThrow("Title is required.");
  });

  it("re-sanitizes content on update", async () => {
    vi.mocked(StoryRepository.findById)
      .mockResolvedValueOnce({ id: "s1" } as never)
      .mockResolvedValueOnce({ id: "s1", content: "sanitized" } as never);
    vi.mocked(StoryRepository.update).mockResolvedValue({} as never);

    await StoryService.update("s1", { content: '<img src=x onerror="alert(1)">' });
    const updateArgs = vi.mocked(StoryRepository.update).mock.calls[0][1];
    expect(updateArgs.content).not.toContain("onerror");
  });
});

describe("StoryService publish/unpublish/archive/restore lifecycle", () => {
  beforeEach(() => vi.resetAllMocks());

  it("publish() requires non-empty title and content, and records publishedAt", async () => {
    vi.mocked(StoryRepository.findById).mockResolvedValue({ id: "s1", title: "T", content: "C" } as never);
    vi.mocked(StoryRepository.updateStatus).mockImplementation(
      async (_id, status, publishedAt) => ({ status, publishedAt }) as never
    );
    const result = await StoryService.publish("s1");
    expect(result.status).toBe("PUBLISHED");
    expect(result.publishedAt).toBeInstanceOf(Date);
  });

  it("publish() is blocked if title or content is somehow empty at publish time", async () => {
    vi.mocked(StoryRepository.findById).mockResolvedValue({ id: "s1", title: "", content: "C" } as never);
    await expect(StoryService.publish("s1")).rejects.toThrow("Title and content are required before publishing.");
  });

  it("unpublish() returns story to Draft", async () => {
    vi.mocked(StoryRepository.findById).mockResolvedValue({ id: "s1" } as never);
    vi.mocked(StoryRepository.updateStatus).mockResolvedValue({ status: "DRAFT" } as never);
    const result = await StoryService.unpublish("s1");
    expect(result.status).toBe("DRAFT");
  });

  it("archive() sets status to Archived", async () => {
    vi.mocked(StoryRepository.findById).mockResolvedValue({ id: "s1" } as never);
    vi.mocked(StoryRepository.updateStatus).mockResolvedValue({ status: "ARCHIVED" } as never);
    const result = await StoryService.archive("s1");
    expect(result.status).toBe("ARCHIVED");
  });

  it("restore() returns to Published if previously published, else Draft", async () => {
    vi.mocked(StoryRepository.findById).mockResolvedValueOnce({ id: "s1", publishedAt: new Date() } as never);
    vi.mocked(StoryRepository.updateStatus).mockImplementation(async (_id, status) => ({ status }) as never);
    expect((await StoryService.restore("s1")).status).toBe("PUBLISHED");

    vi.mocked(StoryRepository.findById).mockResolvedValueOnce({ id: "s2", publishedAt: null } as never);
    expect((await StoryService.restore("s2")).status).toBe("DRAFT");
  });
});