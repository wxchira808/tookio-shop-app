import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// List all items for the current user across all their shops
export async function GET(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get items with shop information
    const items = await sql`
      SELECT 
        i.id,
        i.item_name,
        i.description,
        i.sku,
        i.unit_price,
        i.cost_price,
        i.current_stock,
        i.created_at,
        i.updated_at,
        s.shop_name,
        s.id as shop_id
      FROM items i
      JOIN shops s ON i.shop_id = s.id
      WHERE s.user_id = ${userId}
      ORDER BY i.created_at DESC
    `;

    return Response.json({ items });
  } catch (error) {
    console.error("GET /api/items error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Create a new item
export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const {
      shop_id,
      item_name,
      description,
      sku,
      unit_price,
      cost_price,
      current_stock,
    } = body;

    if (
      !item_name ||
      typeof item_name !== "string" ||
      item_name.trim().length === 0
    ) {
      return Response.json({ error: "Item name is required" }, { status: 400 });
    }

    if (!shop_id || typeof shop_id !== "number") {
      return Response.json(
        { error: "Valid shop ID is required" },
        { status: 400 },
      );
    }

    // Verify the shop belongs to the current user
    const shopCheck = await sql`
      SELECT id FROM shops WHERE id = ${shop_id} AND user_id = ${userId}
    `;

    if (shopCheck.length === 0) {
      return Response.json({ error: "Shop not found" }, { status: 404 });
    }

    // Check subscription limits for items
    const userDetails =
      await sql`SELECT subscription_tier FROM auth_users WHERE id = ${userId}`;
    const subscriptionTier = userDetails[0]?.subscription_tier || "free";

    const existingItems = await sql`
      SELECT COUNT(*) as count 
      FROM items i
      JOIN shops s ON i.shop_id = s.id
      WHERE s.user_id = ${userId}
    `;
    const itemCount = parseInt(existingItems[0].count);

    // Enforce subscription limits
    if (subscriptionTier === "free" && itemCount >= 25) {
      return Response.json(
        {
          error: "Free tier allows only 25 items. Upgrade to add more items.",
        },
        { status: 403 },
      );
    }
    if (subscriptionTier === "starter" && itemCount >= 100) {
      return Response.json(
        {
          error:
            "Starter tier allows up to 100 items. Upgrade to Pro for unlimited items.",
        },
        { status: 403 },
      );
    }

    // Validate and sanitize numeric fields
    const parsedUnitPrice = unit_price ? parseFloat(unit_price) : 0.0;
    const parsedCostPrice = cost_price ? parseFloat(cost_price) : 0.0;
    const parsedCurrentStock = current_stock ? parseInt(current_stock) : 0;

    if (isNaN(parsedUnitPrice) || parsedUnitPrice < 0) {
      return Response.json(
        { error: "Valid unit price is required" },
        { status: 400 },
      );
    }

    if (isNaN(parsedCostPrice) || parsedCostPrice < 0) {
      return Response.json(
        { error: "Valid cost price is required" },
        { status: 400 },
      );
    }

    if (isNaN(parsedCurrentStock) || parsedCurrentStock < 0) {
      return Response.json(
        { error: "Valid stock quantity is required" },
        { status: 400 },
      );
    }

    const result = await sql`
      INSERT INTO items (
        shop_id, 
        item_name, 
        description, 
        sku, 
        unit_price, 
        cost_price, 
        current_stock
      )
      VALUES (
        ${shop_id}, 
        ${item_name.trim()}, 
        ${description || null}, 
        ${sku || null}, 
        ${parsedUnitPrice}, 
        ${parsedCostPrice}, 
        ${parsedCurrentStock}
      )
      RETURNING id, shop_id, item_name, description, sku, unit_price, cost_price, current_stock, created_at, updated_at
    `;

    // If there's initial stock, create a stock transaction record
    if (parsedCurrentStock > 0) {
      await sql`
        INSERT INTO stock_transactions (item_id, transaction_type, quantity, reason)
        VALUES (${result[0].id}, 'in', ${parsedCurrentStock}, 'Initial stock')
      `;
    }

    return Response.json({ item: result[0] }, { status: 201 });
  } catch (error) {
    console.error("POST /api/items error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Update an existing item
export async function PUT(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("id");
    const body = await request.json();
    const {
      item_name,
      description,
      sku,
      unit_price,
      cost_price,
      low_stock_threshold,
    } = body;

    if (!itemId) {
      return Response.json({ error: "Item ID is required" }, { status: 400 });
    }

    if (
      !item_name ||
      typeof item_name !== "string" ||
      item_name.trim().length === 0
    ) {
      return Response.json({ error: "Item name is required" }, { status: 400 });
    }

    // Verify item belongs to user
    const itemCheck = await sql`
      SELECT i.id 
      FROM items i
      JOIN shops s ON i.shop_id = s.id
      WHERE i.id = ${itemId} AND s.user_id = ${userId}
    `;

    if (itemCheck.length === 0) {
      return Response.json({ error: "Item not found" }, { status: 404 });
    }

    // Validate numeric fields
    const parsedUnitPrice = unit_price ? parseFloat(unit_price) : null;
    const parsedCostPrice = cost_price ? parseFloat(cost_price) : null;
    const parsedLowStockThreshold = low_stock_threshold
      ? parseInt(low_stock_threshold)
      : null;

    if (parsedUnitPrice !== null && (isNaN(parsedUnitPrice) || parsedUnitPrice < 0)) {
      return Response.json(
        { error: "Valid unit price is required" },
        { status: 400 },
      );
    }

    if (parsedCostPrice !== null && (isNaN(parsedCostPrice) || parsedCostPrice < 0)) {
      return Response.json(
        { error: "Valid cost price is required" },
        { status: 400 },
      );
    }

    const result = await sql`
      UPDATE items 
      SET item_name = ${item_name.trim()}, 
          description = ${description || null},
          sku = ${sku || null},
          unit_price = COALESCE(${parsedUnitPrice}, unit_price),
          cost_price = COALESCE(${parsedCostPrice}, cost_price),
          low_stock_threshold = COALESCE(${parsedLowStockThreshold}, low_stock_threshold),
          updated_at = NOW()
      WHERE id = ${itemId}
      RETURNING id, shop_id, item_name, description, sku, unit_price, cost_price, current_stock, low_stock_threshold, created_at, updated_at
    `;

    return Response.json({ item: result[0] });
  } catch (error) {
    console.error("PUT /api/items error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Delete an item
export async function DELETE(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("id");

    if (!itemId) {
      return Response.json({ error: "Item ID is required" }, { status: 400 });
    }

    // Verify item belongs to user
    const itemCheck = await sql`
      SELECT i.id 
      FROM items i
      JOIN shops s ON i.shop_id = s.id
      WHERE i.id = ${itemId} AND s.user_id = ${userId}
    `;

    if (itemCheck.length === 0) {
      return Response.json({ error: "Item not found" }, { status: 404 });
    }

    // Delete item (cascade will handle related records)
    await sql`
      DELETE FROM items WHERE id = ${itemId}
    `;

    return Response.json({ success: true, message: "Item deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/items error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
