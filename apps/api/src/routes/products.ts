import { Router } from 'express';
import { prisma } from '@repo/db';
import { CreateProductSchema, UpdateProductSchema, CreateCategorySchema } from '@repo/types';
import { authenticateToken, requireRole, validateBody } from '../middleware/auth';

const router = Router();

// 1. Get Categories (Public)
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json(categories);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. Create Category (Owner / Admin / Worker)
router.post(
  '/categories',
  authenticateToken,
  requireRole(['OWNER', 'ADMIN', 'WORKER']),
  validateBody(CreateCategorySchema),
  async (req, res) => {
    const { name, description } = req.body;
    try {
      const existing = await prisma.category.findUnique({ where: { name } });
      if (existing) {
        return res.status(400).json({ error: 'Category already exists' });
      }

      const category = await prisma.category.create({
        data: { name, description },
      });
      return res.status(201).json(category);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

// 3. Get Products (Public catalog)
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
    return res.json(products);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. Get Single Product (Public)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.json(product);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 5. Create Product (Owner / Admin)
router.post(
  '/',
  authenticateToken,
  requireRole(['OWNER', 'ADMIN']),
  validateBody(CreateProductSchema),
  async (req, res) => {
    const { name, description, price, categoryId, imageUrl, sku } = req.body;
    try {
      const existingSku = await prisma.product.findUnique({ where: { sku } });
      if (existingSku) {
        return res.status(400).json({ error: 'Product with this SKU already exists' });
      }

      const product = await prisma.product.create({
        data: {
          name,
          description,
          price,
          categoryId,
          imageUrl,
          sku,
        },
      });

      // Log action
      await prisma.auditLog.create({
        data: {
          userId: (req as any).user?.id,
          action: 'CREATE_PRODUCT',
          details: { productId: product.id, sku: product.sku },
        },
      });

      return res.status(201).json(product);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

// 6. Update Product (Owner / Admin)
router.put(
  '/:id',
  authenticateToken,
  requireRole(['OWNER', 'ADMIN']),
  validateBody(UpdateProductSchema),
  async (req, res) => {
    const { id } = req.params;
    try {
      const existingProduct = await prisma.product.findUnique({ where: { id } });
      if (!existingProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const updated = await prisma.product.update({
        where: { id },
        data: req.body,
      });

      // Log action
      await prisma.auditLog.create({
        data: {
          userId: (req as any).user?.id,
          action: 'UPDATE_PRODUCT',
          details: { productId: id, changes: req.body },
        },
      });

      return res.json(updated);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

// 7. Delete/Deactivate Product (Owner / Admin)
router.delete('/:id', authenticateToken, requireRole(['OWNER', 'ADMIN']), async (req, res) => {
  const { id } = req.params;
  try {
    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Soft delete by setting isActive to false
    const deactivated = await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        userId: (req as any).user?.id,
        action: 'DEACTIVATE_PRODUCT',
        details: { productId: id },
      },
    });

    return res.json({ message: 'Product deactivated successfully', product: deactivated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
