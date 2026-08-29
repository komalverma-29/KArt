import { ArtworkRepository } from "@/repositories/artwork/ArtworkRepository";
import { OrderRepository } from "@/repositories/order/OrderRepository";
import { generateReferenceNumber } from "@/lib/generateReferenceNumber";
import type { Order } from "@prisma/client";

export class ShopServiceError extends Error {}

export interface PurchaseRequestInput {
  artworkId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: string;
  notes?: string;
  quantity?: number;
}

export const ShopService = {
  /**
   * FR-SHOP-001 — Published + For Sale artwork only. Reuses
   * ArtworkRepository directly rather than introducing a second
   * artwork data source for the Shop.
   */
  async listAvailableForSale() {
    const artworks = await ArtworkRepository.list({ status: "PUBLISHED" });
    return artworks.filter((artwork: { forSale: boolean }) => artwork.forSale);
  },

  /**
   * BR-011 / FR-SHOP-005 — the single source of truth for purchase
   * eligibility. Must be checked server-side on every purchase attempt,
   * never trusted from the client.
   */
  async isPurchasable(artworkId: string): Promise<boolean> {
    const artwork = await ArtworkRepository.findById(artworkId);
    if (!artwork) return false;
    return artwork.status === "PUBLISHED" && artwork.forSale && artwork.availability === "AVAILABLE";
  },

  /**
   * Creates exactly one Order + one OrderItem snapshot + one Payment
   * (PENDING), atomically, or none of them. Eligibility is re-verified
   * here regardless of what the UI already checked.
   */
  async createOrderFromRequest(input: PurchaseRequestInput): Promise<Order> {
    const artwork = await ArtworkRepository.findById(input.artworkId);
    if (!artwork) throw new ShopServiceError("Artwork not found.");

    const isEligible = artwork.status === "PUBLISHED" && artwork.forSale && artwork.availability === "AVAILABLE";
    if (!isEligible) {
      throw new ShopServiceError("This artwork is not currently available for purchase.");
    }
    if (artwork.price === null || artwork.price === undefined) {
      // Defensive: ArtworkService.create/update already enforces this,
      // but a purchase must never proceed on unpriced artwork regardless.
      throw new ShopServiceError("This artwork does not have a price set.");
    }

    const quantity = input.quantity ?? 1;
    const unitPrice = Number(artwork.price);
    const totalAmount = unitPrice * quantity;

    const orderNumber = await generateReferenceNumber("ORD", (c) => OrderRepository.orderNumberExists(c));

    return OrderRepository.createFromPurchase({
      orderNumber,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone ?? null,
      shippingAddress: input.shippingAddress,
      customerNotes: input.notes ?? null,
      totalAmount,
      item: { artworkId: artwork.id, artworkTitle: artwork.title, unitPrice, quantity },
    });
  },
};