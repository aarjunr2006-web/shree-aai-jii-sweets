import { prisma } from '@repo/db';

/**
 * Update stock level directly (used for restocking, manual counts, audit corrections).
 */
export async function updateStock(
  branchId: string,
  productId: string,
  quantity: number,
  userId?: string
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Verify product and branch exist
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error(`Product not found: ${productId}`);

    const branch = await tx.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new Error(`Branch not found: ${branchId}`);

    // 2. Upsert stock count
    const inventory = await tx.inventory.upsert({
      where: {
        branchId_productId: { branchId, productId },
      },
      update: { quantity },
      create: { branchId, productId, quantity },
    });

    // 3. Log the change in audit trail
    await tx.auditLog.create({
      data: {
        userId,
        action: 'UPDATE_INVENTORY',
        details: { branchId, productId, quantity, sku: product.sku },
      },
    });

    return inventory;
  });
}

/**
 * Deduct stock levels (used during checkout, in-store sales, or spoilage write-offs).
 * Enforces server-side checks for stock availability.
 */
export async function deductStock(
  branchId: string,
  productId: string,
  quantity: number,
  userId?: string
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch current stock
    const stock = await tx.inventory.findUnique({
      where: {
        branchId_productId: { branchId, productId },
      },
      include: { product: true },
    });

    if (!stock || stock.quantity < quantity) {
      const productName = stock?.product.name || productId;
      const currentQty = stock?.quantity || 0;
      throw new Error(`Insufficient stock for ${productName}. Available: ${currentQty}, Requested: ${quantity}`);
    }

    // 2. Deduct stock
    const newQty = stock.quantity - quantity;
    const updatedStock = await tx.inventory.update({
      where: {
        branchId_productId: { branchId, productId },
      },
      data: { quantity: newQty },
    });

    // 3. Log the deduction
    await tx.auditLog.create({
      data: {
        userId,
        action: 'DEDUCT_INVENTORY',
        details: { branchId, productId, deductedQty: quantity, remainingQty: newQty, sku: stock.product.sku },
      },
    });

    return updatedStock;
  });
}
