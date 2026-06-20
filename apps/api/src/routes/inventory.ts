import { Router } from 'express';
import { prisma } from '@repo/db';
import { UpdateInventorySchema, DeductInventorySchema } from '@repo/types';
import { authenticateToken, requireRole, validateBody } from '../middleware/auth';
import { updateStock, deductStock } from '../services/inventory';

const router = Router();

// 1. Get stock level for all products at a branch (Owner / Admin / Worker)
router.get(
  '/:branchId',
  authenticateToken,
  requireRole(['OWNER', 'ADMIN', 'WORKER']),
  async (req, res) => {
    const { branchId } = req.params;
    try {
      const inventory = await prisma.inventory.findMany({
        where: { branchId },
        include: { product: true },
      });
      return res.json(inventory);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

// 2. Set inventory stock level directly (Owner / Admin / Worker)
router.post(
  '/update',
  authenticateToken,
  requireRole(['OWNER', 'ADMIN', 'WORKER']),
  validateBody(UpdateInventorySchema),
  async (req, res) => {
    const { branchId, productId, quantity } = req.body;
    const userId = (req as any).user?.id;

    try {
      const updated = await updateStock(branchId, productId, quantity, userId);
      return res.json({ message: 'Stock level updated successfully', stock: updated });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
);

// 3. Deduct inventory manually e.g. for spoilage or damage logs (Owner / Admin / Worker)
router.post(
  '/deduct',
  authenticateToken,
  requireRole(['OWNER', 'ADMIN', 'WORKER']),
  validateBody(DeductInventorySchema),
  async (req, res) => {
    const { branchId, productId, quantity } = req.body;
    const userId = (req as any).user?.id;

    try {
      const updated = await deductStock(branchId, productId, quantity, userId);
      return res.json({ message: 'Stock level deducted successfully', stock: updated });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
);

export default router;
