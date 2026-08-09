"use server";

import { revalidatePath } from "next/cache";
import { requireArtistSession } from "@/lib/authGuard";
import {
  CategoryService,
  CategoryServiceError,
} from "@/services/category/CategoryService";
import type { ActionResult } from "@/types/ApiResponse";
import type { Category } from "@prisma/client";
import { z } from "zod";

const IdSchema = z.object({
  id: z.string().uuid(),
});

async function guardAndParse(
  input: unknown
): Promise<
  | {
      ok: true;
      artist: { id: string; email: string };
      id: string;
    }
  | {
      ok: false;
      result: ActionResult<unknown>;
    }
> {
  const artist = await requireArtistSession();

  if (!artist) {
    return {
      ok: false,
      result: {
        success: false,
        error: {
          message: "Unauthorized.",
        },
      },
    };
  }

  const parsed = IdSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      result: {
        success: false,
        error: {
          message: "A category id is required.",
        },
      },
    };
  }

  return {
    ok: true,
    artist,
    id: parsed.data.id,
  };
}

export async function archiveCategoryAction(
  input: unknown
): Promise<ActionResult<Category>> {
  const guard = await guardAndParse(input);

  if (!guard.ok) {
    return guard.result;
  }

  try {
    const category = await CategoryService.archive(guard.id);

    revalidatePath("/studio/categories");

    return {
      success: true,
      data: category,
    };
  } catch (error) {
    if (error instanceof CategoryServiceError) {
      return {
        success: false,
        error: {
          message: error.message,
        },
      };
    }

    return {
      success: false,
      error: {
        message: "Unable to archive category.",
      },
    };
  }
}

export async function restoreCategoryAction(
  input: unknown
): Promise<ActionResult<Category>> {
  const guard = await guardAndParse(input);

  if (!guard.ok) {
    return guard.result;
  }

  try {
    const category = await CategoryService.restore(guard.id);

    revalidatePath("/studio/categories");

    return {
      success: true,
      data: category,
    };
  } catch (error) {
    if (error instanceof CategoryServiceError) {
      return {
        success: false,
        error: {
          message: error.message,
        },
      };
    }

    return {
      success: false,
      error: {
        message: "Unable to restore category.",
      },
    };
  }
}

export async function deleteCategoryAction(
  input: unknown
): Promise<ActionResult<null>> {
  const guard = await guardAndParse(input);

  if (!guard.ok) {
    return guard.result;
  }

  try {
    await CategoryService.delete(guard.id);

    revalidatePath("/studio/categories");

    return {
      success: true,
      data: null,
    };
  } catch (error) {
    if (error instanceof CategoryServiceError) {
      return {
        success: false,
        error: {
          message: error.message,
        },
      };
    }

    return {
      success: false,
      error: {
        message: "Unable to delete category.",
      },
    };
  }
}
