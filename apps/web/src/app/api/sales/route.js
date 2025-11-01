import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Get sales for the current user
export async function GET(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get sales with shop information and item counts
    const sales = await sql`
      SELECT 
        sa.id,
        sa.total_amount,
        sa.sale_date,
        sa.notes,
        sa.created_at,
        sa.updated_at,
        s.shop_name,
        s.id as shop_id,
        COALESCE(COUNT(si.id), 0) as items_count
      FROM sales sa
      JOIN shops s ON sa.shop_id = s.id
      LEFT JOIN sale_items si ON sa.id = si.sale_id
      WHERE s.user_id = ${userId}
      GROUP BY sa.id, sa.total_amount, sa.sale_date, sa.notes, sa.created_at, sa.updated_at, s.shop_name, s.id
      ORDER BY sa.sale_date DESC, sa.created_at DESC
      LIMIT 50
    `;

    return Response.json({ sales });
  } catch (error) {
    console.error("GET /api/sales error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Create a new sale
export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { shop_id, items, notes, sale_date } = body;

    // Validate input
    if (!shop_id || typeof shop_id !== "number") {
      return Response.json(
        { error: "Valid shop ID is required" },
        { status: 400 },
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json(
        { error: "At least one item is required" },
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

    // Validate all items and calculate total
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const { item_id, quantity, unit_price } = item;

      if (!item_id || typeof item_id !== "number") {
        return Response.json(
          { error: "Valid item ID is required for all items" },
          { status: 400 },
        );
      }

      if (!quantity || typeof quantity !== "number" || quantity <= 0) {
        return Response.json(
          { error: "Valid quantity is required for all items" },
          { status: 400 },
        );
      }

      if (
        unit_price === undefined ||
        typeof unit_price !== "number" ||
        unit_price < 0
      ) {
        return Response.json(
          { error: "Valid unit price is required for all items" },
          { status: 400 },
        );
      }

      // Verify item belongs to the shop and check stock
      const itemCheck = await sql`
        SELECT i.id, i.current_stock, i.item_name, i.unit_price
        FROM items i
        WHERE i.id = ${item_id} AND i.shop_id = ${shop_id}
      `;

      if (itemCheck.length === 0) {
        return Response.json(
          { error: `Item with ID ${item_id} not found in this shop` },
          { status: 404 },
        );
      }

      const dbItem = itemCheck[0];
      if (parseInt(dbItem.current_stock) < quantity) {
        return Response.json(
          {
            error: `Insufficient stock for ${dbItem.item_name}. Available: ${dbItem.current_stock}, requested: ${quantity}`,
          },
          { status: 400 },
        );
      }

      const itemTotal = quantity * unit_price;
      totalAmount += itemTotal;

      validatedItems.push({
        item_id,
        quantity,
        unit_price,
        total_price: itemTotal,
        current_stock: parseInt(dbItem.current_stock),
        item_name: dbItem.item_name,
      });
    }

    // Parse sale date
    const finalSaleDate = sale_date ? new Date(sale_date) : new Date();

    // Execute transaction to create sale and update stock
    const queries = [
      // Create the sale record
      sql`
        INSERT INTO sales (shop_id, total_amount, sale_date, notes)
        VALUES (${shop_id}, ${totalAmount}, ${finalSaleDate}, ${notes || null})
        RETURNING id, shop_id, total_amount, sale_date, notes, created_at, updated_at
      `,
    ];

    // Add sale items and stock updates to the transaction
    for (const item of validatedItems) {
      // Insert sale item
      queries.push(sql`
        INSERT INTO sale_items (sale_id, item_id, quantity, unit_price)
        VALUES ((SELECT currval(pg_get_serial_sequence('sales','id'))), ${item.item_id}, ${item.quantity}, ${item.unit_price})
        RETURNING id, sale_id, item_id, quantity, unit_price, total_price
      `);

      // Update item stock
      const newStock = item.current_stock - item.quantity;
      queries.push(sql`
        UPDATE items 
        SET current_stock = ${newStock}, updated_at = NOW()
        WHERE id = ${item.item_id}
      `);

      // Record stock transaction
      queries.push(sql`
        INSERT INTO stock_transactions (item_id, transaction_type, quantity, reason)
        VALUES (${item.item_id}, 'out', ${-item.quantity}, ${`Sale #` + "(SELECT currval(pg_get_serial_sequence('sales','id')))"})
      `);
    }

    const result = await sql.transaction(queries);
    const newSale = result[0][0];

    return Response.json({ sale: newSale }, { status: 201 });
  } catch (error) {
    console.error("POST /api/sales error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
