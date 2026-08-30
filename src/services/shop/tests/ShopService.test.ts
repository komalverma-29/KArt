import { describe, it, expect, vi, beforeEach } from "vitest";
import { ShopService, ShopServiceError } from "@/services/shop/ShopService";
import { ArtworkRepository } from "@/repositories/artwork/ArtworkRepository";
import { OrderRepository } from "@/repositories/order/OrderRepository";

vi.mock("@/repositories/artwork/ArtworkRepository", () => ({
  ArtworkRepository: {
    findById: vi.fn(),
    findBySlug: vi.fn(),
    slugExists: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    softDelete: vi.fn(),
    permanentDelete: vi.fn(),
    setCollections: vi.fn(),
    setTags: vi.fn(),
  },
}));

vi.mock("@/repositories/order/OrderRepository", () => ({
  OrderRepository: {
    findById: vi.fn(),
    findByOrderNumber: vi.fn(),
    list: vi.fn(),
    createFromPurchase: vi.fn(),
    updateStatus: vi.fn(),
    updateInternalNotes: vi.fn(),
    orderNumberExists: vi.fn(),
  },
}));

const PURCHASABLE_ARTWORK = {
  id: "art1",
  title: "Sunset",
  status: "PUBLISHED",
  forSale: true,
  availability: "AVAILABLE",
  price: 250,
};

describe("ShopService.isPurchasable", () => {
  beforeEach(() => vi.resetAllMocks());

  it("is purchasable when Published + For Sale + Available", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue(
      PURCHASABLE_ARTWORK as never
    );

    expect(await ShopService.isPurchasable("art1")).toBe(true);
  });

  it("is not purchasable when Draft", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({
      ...PURCHASABLE_ARTWORK,
      status: "DRAFT",
    } as never);

    expect(await ShopService.isPurchasable("art1")).toBe(false);
  });

  it("is not purchasable when Archived", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({
      ...PURCHASABLE_ARTWORK,
      status: "ARCHIVED",
    } as never);

    expect(await ShopService.isPurchasable("art1")).toBe(false);
  });

  it("is not purchasable when not marked For Sale", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({
      ...PURCHASABLE_ARTWORK,
      forSale: false,
    } as never);

    expect(await ShopService.isPurchasable("art1")).toBe(false);
  });

  it("is not purchasable when Sold", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({
      ...PURCHASABLE_ARTWORK,
      availability: "SOLD",
    } as never);

    expect(await ShopService.isPurchasable("art1")).toBe(false);
  });

  it("is not purchasable when Reserved", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({
      ...PURCHASABLE_ARTWORK,
      availability: "RESERVED",
    } as never);

    expect(await ShopService.isPurchasable("art1")).toBe(false);
  });

  it("is not purchasable when the artwork does not exist", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue(null);

    expect(await ShopService.isPurchasable("nope")).toBe(false);
  });
});

describe("ShopService.listAvailableForSale", () => {
  beforeEach(() => vi.resetAllMocks());

  it("filters to Published artwork marked For Sale only", async () => {
    vi.mocked(ArtworkRepository.list).mockResolvedValue([
      { id: "a1", status: "PUBLISHED", forSale: true },
      { id: "a2", status: "PUBLISHED", forSale: false },
    ] as never);

    const result = await ShopService.listAvailableForSale();

    expect(result.map((a) => a.id)).toEqual(["a1"]);

    expect(ArtworkRepository.list).toHaveBeenCalledWith({
      status: "PUBLISHED",
    });
  });
});

describe("ShopService.createOrderFromRequest", () => {
  beforeEach(() => vi.resetAllMocks());

  const purchaseInput = {
    artworkId: "art1",
    customerName: "Jane Buyer",
    customerEmail: "jane@example.com",
    shippingAddress: "123 Main St",
  };

  it("rejects purchase of an unpublished artwork and creates NO order", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({
      ...PURCHASABLE_ARTWORK,
      status: "DRAFT",
    } as never);

    await expect(
      ShopService.createOrderFromRequest(purchaseInput)
    ).rejects.toThrow(ShopServiceError);

    expect(OrderRepository.createFromPurchase).not.toHaveBeenCalled();
  });

  it("rejects purchase of artwork not for sale and creates NO order", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({
      ...PURCHASABLE_ARTWORK,
      forSale: false,
    } as never);

    await expect(
      ShopService.createOrderFromRequest(purchaseInput)
    ).rejects.toThrow(ShopServiceError);

    expect(OrderRepository.createFromPurchase).not.toHaveBeenCalled();
  });

  it("rejects purchase of unavailable (sold) artwork and creates NO order", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({
      ...PURCHASABLE_ARTWORK,
      availability: "SOLD",
    } as never);

    await expect(
      ShopService.createOrderFromRequest(purchaseInput)
    ).rejects.toThrow(
      "This artwork is not currently available for purchase."
    );

    expect(OrderRepository.createFromPurchase).not.toHaveBeenCalled();
  });

  it("rejects purchase of an artwork with no price set, even if otherwise eligible", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({
      ...PURCHASABLE_ARTWORK,
      price: null,
    } as never);

    await expect(
      ShopService.createOrderFromRequest(purchaseInput)
    ).rejects.toThrow("This artwork does not have a price set.");

    expect(OrderRepository.createFromPurchase).not.toHaveBeenCalled();
  });

  it("creates exactly one order (via the atomic repository method) for an eligible artwork", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue(
      PURCHASABLE_ARTWORK as never
    );

    vi.mocked(OrderRepository.orderNumberExists).mockResolvedValue(false);

    vi.mocked(OrderRepository.createFromPurchase).mockResolvedValue({
      id: "order1",
      orderNumber: "ORD-X",
    } as never);

    const order =
      await ShopService.createOrderFromRequest(purchaseInput);

    expect(order.id).toBe("order1");

    expect(OrderRepository.createFromPurchase).toHaveBeenCalledTimes(1);

    const callArgs =
      vi.mocked(OrderRepository.createFromPurchase).mock.calls[0][0];

    expect(callArgs.item).toEqual({
      artworkId: "art1",
      artworkTitle: "Sunset",
      unitPrice: 250,
      quantity: 1,
    });

    expect(callArgs.totalAmount).toBe(250);
  });

  it("computes totalAmount as unitPrice × quantity", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue(
      PURCHASABLE_ARTWORK as never
    );

    vi.mocked(OrderRepository.orderNumberExists).mockResolvedValue(false);

    vi.mocked(OrderRepository.createFromPurchase).mockResolvedValue({
      id: "order1",
    } as never);

    await ShopService.createOrderFromRequest({
      ...purchaseInput,
      quantity: 3,
    });

    const callArgs =
      vi.mocked(OrderRepository.createFromPurchase).mock.calls[0][0];

    expect(callArgs.totalAmount).toBe(750);
    expect(callArgs.item.quantity).toBe(3);
  });

  it("generates a unique order number, retrying past a collision", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue(
      PURCHASABLE_ARTWORK as never
    );

    vi.mocked(OrderRepository.orderNumberExists)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    vi.mocked(OrderRepository.createFromPurchase).mockResolvedValue({
      id: "order1",
    } as never);

    await ShopService.createOrderFromRequest(purchaseInput);

    expect(OrderRepository.orderNumberExists).toHaveBeenCalledTimes(2);
  });

  it("rejects a purchase request for an artwork that no longer exists", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue(null);

    await expect(
      ShopService.createOrderFromRequest(purchaseInput)
    ).rejects.toThrow("Artwork not found.");

    expect(OrderRepository.createFromPurchase).not.toHaveBeenCalled();
  });
});