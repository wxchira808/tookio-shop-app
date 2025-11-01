import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// List all shops for the current user
export async function GET(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get shops with item counts and total values
    const shops = await sql`
      SELECT 
        s.id,
        s.shop_name,
        s.description,
        s.created_at,
        s.updated_at,
        COALESCE(COUNT(i.id), 0) as item_count,
        COALESCE(SUM(i.current_stock * i.unit_price), 0) as total_value
      FROM shops s
      LEFT JOIN items i ON s.id = i.shop_id
      WHERE s.user_id = ${userId}
      GROUP BY s.id, s.shop_name, s.description, s.created_at, s.updated_at
      ORDER BY s.created_at DESC
    `;

    return Response.json({ shops });
  } catch (error) {
    console.error("GET /api/shops error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Create a new shop
export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { shop_name, description } = body;

    if (
      !shop_name ||
      typeof shop_name !== "string" ||
      shop_name.trim().length === 0
    ) {
      return Response.json({ error: "Shop name is required" }, { status: 400 });
    }

    // Check subscription limits
    const userDetails =
      await sql`SELECT subscription_tier FROM auth_users WHERE id = ${userId}`;
    const subscriptionTier = userDetails[0]?.subscription_tier || "free";

    const existingShops =
      await sql`SELECT COUNT(*) as count FROM shops WHERE user_id = ${userId}`;
    const shopCount = parseInt(existingShops[0].count);

    // Enforce subscription limits
    if (subscriptionTier === "free" && shopCount >= 1) {
      return Response.json(
        {
          error: "Free tier allows only 1 shop. Upgrade to add more shops.",
        },
        { status: 403 },
      );
    }
    if (subscriptionTier === "starter" && shopCount >= 1) {
      return Response.json(
        {
          error:
            "Starter tier allows only 1 shop. Upgrade to Pro to manage multiple shops.",
        },
        { status: 403 },
      );
    }
    if (subscriptionTier === "pro" && shopCount >= 5) {
      return Response.json(
        {
          error: "Pro tier allows up to 5 shops.",
        },
        { status: 403 },
      );
    }

    const result = await sql`
      INSERT INTO shops (user_id, shop_name, description)
      VALUES (${userId}, ${shop_name.trim()}, ${description || null})
      RETURNING id, shop_name, description, created_at, updated_at
    `;

    return Response.json({ shop: result[0] }, { status: 201 });
  } catch (error) {
    console.error("POST /api/shops error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Update an existing shop
export async function PUT(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get("id");
    const body = await request.json();
    const { shop_name, description } = body;

    if (!shopId) {
      return Response.json({ error: "Shop ID is required" }, { status: 400 });
    }

    if (
      !shop_name ||
      typeof shop_name !== "string" ||
      shop_name.trim().length === 0
    ) {
      return Response.json({ error: "Shop name is required" }, { status: 400 });
    }

    // Verify shop belongs to user
    const shopCheck = await sql`
      SELECT id FROM shops WHERE id = ${shopId} AND user_id = ${userId}
    `;

    if (shopCheck.length === 0) {
      return Response.json({ error: "Shop not found" }, { status: 404 });
    }

    const result = await sql`
      UPDATE shops 
      SET shop_name = ${shop_name.trim()}, 
          description = ${description || null},
          updated_at = NOW()
      WHERE id = ${shopId} AND user_id = ${userId}
      RETURNING id, shop_name, description, created_at, updated_at
    `;

    return Response.json({ shop: result[0] });
  } catch (error) {
    console.error("PUT /api/shops error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Delete a shop
export async function DELETE(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get("id");

    if (!shopId) {
      return Response.json({ error: "Shop ID is required" }, { status: 400 });
    }

    // Verify shop belongs to user
    const shopCheck = await sql`
      SELECT id FROM shops WHERE id = ${shopId} AND user_id = ${userId}
    `;

    if (shopCheck.length === 0) {
      return Response.json({ error: "Shop not found" }, { status: 404 });
    }

    // Delete shop (cascade will handle items, purchases, sales)
    await sql`
      DELETE FROM shops WHERE id = ${shopId} AND user_id = ${userId}
    `;

    return Response.json({ success: true, message: "Shop deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/shops error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
