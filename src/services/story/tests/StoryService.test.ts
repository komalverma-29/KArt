import { describe, it, expect, vi, beforeEach } from "vitest";
import { StoryService, StoryServiceError } from "@/services/story/StoryService";
import { StoryRepository } from "@/repositories/story/StoryRepository";

vi.mock("@/repositories/story/StoryRepository");

describe("StoryService", () => {
  beforeEach(() => vi.resetAllMocks());

  it("requires a title", async () => {
    await expect(StoryService.create({ title: "", content: "hello" })).rejects.toThrow("Title is required.");
  });

  it("requires content", async () => {
    await expect(StoryService.create({ title: "My Story", content: "" })).rejects.toThrow("Content is required.");
  });

  it("sanitizes content on create", async () => {
    vi.mocked(StoryRepository.slugExists).mockResolvedValue(false);
    vi.mocked(StoryRepository.create).mockImplementation(async (data) => ({ id: "s1", ...data }) as never);
    vi.mocked(StoryRepository.findById).mockResolvedValue({ id: "s1", content: "<p>Hi</p>" } as never);

    await StoryService.create({ title: "My Story", content: '<p onclick="alert(1)">Hi</p><script>bad()</script>' });

    const createCall = vi.mocked(StoryRepository.create).mock.calls[0][0];
    expect(createCall.content).not.toContain("<script>");
    expect(createCall.content).not.toContain("onclick");
  });

  it("publish/unpublish lifecycle", async () => {
    vi.mocked(StoryRepository.findById).mockResolvedValue({ id: "s1", title: "T", content: "C" } as never);
    vi.mocked(StoryRepository.updateStatus).mockResolvedValueOnce({ status: "PUBLISHED" } as never);
    const published = await StoryService.publish("s1");
    expect(published.status).toBe("PUBLISHED");

    vi.mocked(StoryRepository.updateStatus).mockResolvedValueOnce({ status: "DRAFT" } as never);
    const unpublished = await StoryService.unpublish("s1");
    expect(unpublished.status).toBe("DRAFT");
  });
});