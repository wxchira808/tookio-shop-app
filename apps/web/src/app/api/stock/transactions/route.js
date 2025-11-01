import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Get stock transactions for the current user
export async function GET(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get stock transactions with item and shop information
    const transactions = await sql`
      SELECT 
        st.id,
        st.transaction_type,
        st.quantity,
        st.reason,
        st.created_at,
        i.item_name,
        i.current_stock,
        s.shop_name,
        s.id as shop_id,
        i.id as item_id
      FROM stock_transactions st
      JOIN items i ON st.item_id = i.id
      JOIN shops s ON i.shop_id = s.id
      WHERE s.user_id = ${userId}
      ORDER BY st.created_at DESC
      LIMIT 50
    `;

    return Response.json({ transactions });
  } catch (error) {
    console.error("GET /api/stock/transactions error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Add/Remove/Adjust stock
export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { item_id, transaction_type, quantity, reason } = body;

    // Validate input
    if (!item_id || typeof item_id !== "number") {
      return Response.json(
        { error: "Valid item ID is required" },
        { status: 400 },
      );
    }

    if (
      !transaction_type ||
      !["in", "out", "adjustment"].includes(transaction_type)
    ) {
      return Response.json(
        { error: "Valid transaction type is required (in, out, adjustment)" },
        { status: 400 },
      );
    }

    if (!quantity || typeof quantity !== "number" || quantity === 0) {
      return Response.json(
        { error: "Valid quantity is required" },
        { status: 400 },
      );
    }

    // Verify the item belongs to the current user
    const itemCheck = await sql`
      SELECT i.id, i.current_stock, i.item_name, s.shop_name
      FROM items i
      JOIN shops s ON i.shop_id = s.id
      WHERE i.id = ${item_id} AND s.user_id = ${userId}
    `;

    if (itemCheck.length === 0) {
      return Response.json({ error: "Item not found" }, { status: 404 });
    }

    const item = itemCheck[0];
    const currentStock = parseInt(item.current_stock);

    // Calculate new stock level
    let newStock;
    let finalQuantity;

    if (transaction_type === "in") {
      newStock = currentStock + Math.abs(quantity);
      finalQuantity = Math.abs(quantity);
    } else if (transaction_type === "out") {
      const adjustedQuantity = Math.abs(quantity);
      if (currentStock < adjustedQuantity) {
        return Response.json(
          {
            error: `Insufficient stock. Current stock: ${currentStock}, requested: ${adjustedQuantity}`,
          },
          { status: 400 },
        );
      }
      newStock = currentStock - adjustedQuantity;
      finalQuantity = -adjustedQuantity;
    } else {
      // adjustment
      newStock = currentStock + quantity; // quantity can be positive or negative for adjustments
      if (newStock < 0) {
        return Response.json(
          {
            error: `Invalid adjustment. Current stock: ${currentStock}, adjustment: ${quantity}`,
          },
          { status: 400 },
        );
      }
      finalQuantity = quantity;
    }

    // Use transaction to ensure data consistency
    const result = await sql.transaction([
      // Update item stock
      sql`
        UPDATE items 
        SET current_stock = ${newStock}, updated_at = NOW()
        WHERE id = ${item_id}
        RETURNING id, current_stock
      `,
      // Record stock transaction
      sql`
        INSERT INTO stock_transactions (item_id, transaction_type, quantity, reason)
        VALUES (${item_id}, ${transaction_type}, ${finalQuantity}, ${reason || null})
        RETURNING id, item_id, transaction_type, quantity, reason, created_at
      `,
    ]);

    const updatedItem = result[0][0];
    const newTransaction = result[1][0];

    return Response.json(
      {
        item: updatedItem,
        transaction: newTransaction,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/stock/transactions error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
