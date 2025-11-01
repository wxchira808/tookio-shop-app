import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get("shop_id");

    let purchases;

    if (shopId) {
      // Get purchases for a specific shop
      purchases = await sql`
        SELECT p.*, 
               json_agg(
                 json_build_object(
                   'id', pi.id,
                   'item_id', pi.item_id,
                   'item_name', i.item_name,
                   'quantity', pi.quantity,
                   'unit_cost', pi.unit_cost,
                   'total_cost', pi.total_cost
                 ) ORDER BY pi.id
               ) as items
        FROM purchases p
        LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
        LEFT JOIN items i ON pi.item_id = i.id
        JOIN shops s ON p.shop_id = s.id
        WHERE s.user_id = ${session.user.id} AND p.shop_id = ${shopId}
        GROUP BY p.id
        ORDER BY p.purchase_date DESC
      `;
    } else {
      // Get all purchases for the user
      purchases = await sql`
        SELECT p.*, s.shop_name,
               json_agg(
                 json_build_object(
                   'id', pi.id,
                   'item_id', pi.item_id,
                   'item_name', i.item_name,
                   'quantity', pi.quantity,
                   'unit_cost', pi.unit_cost,
                   'total_cost', pi.total_cost
                 ) ORDER BY pi.id
               ) as items
        FROM purchases p
        LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
        LEFT JOIN items i ON pi.item_id = i.id
        JOIN shops s ON p.shop_id = s.id
        WHERE s.user_id = ${session.user.id}
        GROUP BY p.id, s.shop_name
        ORDER BY p.purchase_date DESC
      `;
    }

    // Filter out null items from purchases with no items
    const filteredPurchases = purchases.map((purchase) => ({
      ...purchase,
      items: purchase.items.filter((item) => item.id !== null),
    }));

    return Response.json({ purchases: filteredPurchases });
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return Response.json(
      { error: "Failed to fetch purchases" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { shop_id, items, notes } = await request.json();

    if (!shop_id || !items || !Array.isArray(items) || items.length === 0) {
      return Response.json(
        { error: "Shop ID and items are required" },
        { status: 400 },
      );
    }

    // Verify the shop belongs to the user
    const shopCheck = await sql`
      SELECT id FROM shops WHERE id = ${shop_id} AND user_id = ${session.user.id}
    `;
    if (shopCheck.length === 0) {
      return Response.json({ error: "Shop not found" }, { status: 404 });
    }

    // Calculate total amount
    const totalAmount = items.reduce(
      (sum, item) => sum + item.quantity * item.unit_cost,
      0,
    );

    // Use transaction to create purchase and items
    const [purchaseResult, ...itemResults] = await sql.transaction([
      sql`
        INSERT INTO purchases (shop_id, total_amount, notes)
        VALUES (${shop_id}, ${totalAmount}, ${notes || null})
        RETURNING id, shop_id, total_amount, purchase_date, notes, created_at, updated_at
      `,
      ...items.map(
        (item) => sql`
        INSERT INTO purchase_items (purchase_id, item_id, quantity, unit_cost)
        VALUES ((SELECT id FROM purchases WHERE shop_id = ${shop_id} ORDER BY id DESC LIMIT 1), 
                ${item.item_id}, ${item.quantity}, ${item.unit_cost})
        RETURNING id, purchase_id, item_id, quantity, unit_cost, total_cost
      `,
      ),
    ]);

    const purchase = purchaseResult[0];

    // Update stock levels for purchased items
    await Promise.all(
      items.map(async (item) => {
        // Update item stock
        await sql`
        UPDATE items 
        SET current_stock = current_stock + ${item.quantity},
            updated_at = now()
        WHERE id = ${item.item_id}
      `;

        // Log stock transaction
        await sql`
        INSERT INTO stock_transactions (item_id, transaction_type, quantity, reason)
        VALUES (${item.item_id}, 'in', ${item.quantity}, 'Purchase recorded')
      `;
      }),
    );

    return Response.json({
      purchase: {
        ...purchase,
        items: itemResults.flat(),
      },
    });
  } catch (error) {
    console.error("Error creating purchase:", error);
    return Response.json(
      { error: "Failed to create purchase" },
      { status: 500 },
    );
  }
}
