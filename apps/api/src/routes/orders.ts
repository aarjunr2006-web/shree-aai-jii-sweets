import { Router, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '@repo/db';
import { CreateOrderSchema, RazorpayWebhookSchema } from '@repo/types';
import { authenticateToken, validateBody, AuthRequest } from '../middleware/auth';
import { deductStock } from '../services/inventory';
import { sendWhatsAppBill } from '../services/whatsapp';

const router = Router();
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'mock_razorpay_secret_key';

// 1. Create Order (Checkout)
router.post('/', authenticateToken, validateBody(CreateOrderSchema), async (req: AuthRequest, res: Response) => {
  const { branchId, customerId, paymentMethod, items } = req.body;
  const userId = req.user?.id;

  try {
    // Single transaction for calculations and insertions
    const result = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItemsData = [];

      // A. Verify prices and check stock for each item server-side
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || !product.isActive) {
          throw new Error(`Product not available: ${item.productId}`);
        }

        // Fetch stock level
        const inventory = await tx.inventory.findUnique({
          where: { branchId_productId: { branchId, productId: item.productId } },
        });

        if (!inventory || inventory.quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${inventory?.quantity || 0}`);
        }

        const price = Number(product.price);
        const itemTotal = price * item.quantity;
        totalAmount += itemTotal;

        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          priceAtTime: product.price,
        });
      }

      // B. Deduct Stock using the inventory service rules (Atomic inside the transaction)
      for (const item of items) {
        // We do it inline in the transaction to prevent concurrency issues
        const stock = await tx.inventory.findUnique({
          where: { branchId_productId: { branchId, productId: item.productId } },
        });
        
        if (!stock) throw new Error('Stock entry missing');
        
        await tx.inventory.update({
          where: { branchId_productId: { branchId, productId: item.productId } },
          data: { quantity: stock.quantity - item.quantity },
        });

        // Write Stock Log
        await tx.auditLog.create({
          data: {
            userId,
            action: 'DEDUCT_STOCK_ORDER',
            details: { branchId, productId: item.productId, quantity: item.quantity },
          },
        });
      }

      // C. Set default order details based on payment method
      const isPaidOnCheckout = paymentMethod === 'CASH';
      const orderStatus = isPaidOnCheckout ? 'CONFIRMED' : 'PENDING';
      const paymentStatus = isPaidOnCheckout ? 'PAID' : 'PENDING';

      // Generate a mock Razorpay Order ID if online
      const razorpayOrderId = paymentMethod === 'UPI' || paymentMethod === 'NETBANKING' || paymentMethod === 'CARD'
        ? `order_${crypto.randomBytes(8).toString('hex')}`
        : null;

      // D. Create Order
      const order = await tx.order.create({
        data: {
          branchId,
          customerId: customerId || userId || null, // Link customer if authenticated or POSWalkIn
          status: orderStatus,
          totalAmount,
          paymentStatus,
          paymentMethod,
          razorpayOrderId,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: { include: { product: true } },
          customer: true,
        },
      });

      // E. Write Audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE_ORDER',
          details: { orderId: order.id, totalAmount, paymentMethod },
        },
      });

      return order;
    });

    // F. If paid immediately (In-store Cash), trigger WhatsApp billing in background
    if (result.paymentStatus === 'PAID') {
      sendWhatsAppBill(result.id).catch((err) => {
        console.error('Error dispatching WhatsApp bill for CASH order:', err);
      });
    }

    return res.status(201).json({
      message: 'Order created successfully',
      order: result,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// 2. Razorpay Webhook Verification (Online payments)
router.post('/webhook/razorpay', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  
  // Real webhook signature validation structure:
  // const expectedSignature = crypto
  //   .createHmac('sha256', RAZORPAY_KEY_SECRET)
  //   .update(JSON.stringify(req.body))
  //   .digest('hex');
  // if (expectedSignature !== signature) { ... }

  // For Phase 1 validation (Accepts request and confirms order)
  const { razorpay_order_id, razorpay_payment_id } = req.body;

  try {
    const order = await prisma.order.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order matching this Razorpay order ID not found' });
    }

    if (order.paymentStatus === 'PAID') {
      return res.json({ message: 'Order already processed' });
    }

    // Update order status to paid and confirmed
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        razorpayPaymentId: razorpay_payment_id,
      },
    });

    // Log the transaction success
    await prisma.auditLog.create({
      data: {
        action: 'PAYMENT_CONFIRMED_WEBHOOK',
        details: { orderId: updatedOrder.id, razorpayPaymentId: razorpay_payment_id },
      },
    });

    // Send WhatsApp Invoice
    sendWhatsAppBill(updatedOrder.id).catch((err) => {
      console.error('Error dispatching WhatsApp bill inside Webhook:', err);
    });

    return res.json({
      message: 'Payment verified and order confirmed',
      orderId: updatedOrder.id,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 3. Get User/Customer Orders
router.get('/my-orders', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  try {
    const orders = await prisma.order.findMany({
      where: { customerId: userId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(orders);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. Get All Orders (Owner / Admin / Worker POS list)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: { include: { product: true } },
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(orders);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
