import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@repo/db';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Setup Redis connection options
let redisConnection: IORedis | null = null;
let whatsappQueue: Queue | null = null;

try {
  redisConnection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 2000,
  });

  redisConnection.on('error', (err) => {
    console.warn('⚠️ Redis Connection Error: running WhatsApp Billing in fallback (synchronous) mode.');
  });

  // Setup BullMQ Queue for sending WhatsApp invoices
  whatsappQueue = new Queue('whatsapp-billing', { connection: redisConnection as any });
} catch (e) {
  console.warn('⚠️ Redis could not be initialized. Running WhatsApp Billing in fallback (synchronous) mode.');
}

/**
 * PDF Invoice generator mock
 */
async function generateInvoicePdf(orderId: string): Promise<string> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });

  if (!order) throw new Error('Order not found');

  console.log(`[PDF Generator] Rendering PDF Invoice for order #${order.id}...`);
  // Stub PDF rendering (Puppeteer -> PDF stream)
  const invoiceUrl = `https://shree-aai-ji-sweets-invoices.s3.amazonaws.com/invoice-${orderId}.pdf`;
  return invoiceUrl;
}

/**
 * Send WhatsApp Invoice via Cloud API (Stub)
 */
async function triggerWhatsAppApi(phone: string, pdfUrl: string, orderNumber: string) {
  console.log(`[WhatsApp API] Sending message to ${phone}...`);
  console.log(`[WhatsApp API] Attachment: ${pdfUrl}`);
  
  // Simulation of successful/failed network request
  if (phone.includes('9999')) {
    throw new Error('WhatsApp network delivery timeout');
  }
  
  console.log(`[WhatsApp API] Invoice for order #${orderNumber} sent successfully!`);
}

/**
 * Standalone dispatch function that queues the WhatsApp job.
 * Falls back to synchronous execution if Redis is not running.
 */
export async function sendWhatsAppBill(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  });

  if (!order) throw new Error('Order not found for WhatsApp billing');

  const customerPhone = order.customer?.phone || '+910000000000'; // Default phone for walk-ins/POS
  
  if (whatsappQueue && redisConnection && redisConnection.status === 'ready') {
    console.log(`[BullMQ] Queueing WhatsApp bill job for order: ${orderId}`);
    await whatsappQueue.add(
      'send-bill',
      { orderId, phone: customerPhone },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );
  } else {
    console.log(`[Fallback] Redis unavailable. Processing WhatsApp bill synchronously...`);
    try {
      await processWhatsAppBillTask(orderId, customerPhone);
    } catch (error: any) {
      console.error(`[Fallback] Sync WhatsApp bill failed: ${error.message}. Triggering SMS fallback...`);
      await triggerSmsFallback(customerPhone, orderId);
    }
  }
}

/**
 * Core processing task executed by both Worker and Fallback modes
 */
export async function processWhatsAppBillTask(orderId: string, phone: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) throw new Error('Order not found');

  // 1. Generate PDF Invoice Url
  const pdfUrl = await generateInvoicePdf(orderId);

  // 2. Write details to Bill DB model
  const billNumber = `BILL-${Date.now()}-${orderId.substring(0, 4).toUpperCase()}`;
  await prisma.bill.create({
    data: {
      orderId,
      billNumber,
      pdfUrl,
    },
  });

  // 3. Send via WhatsApp Cloud API
  await triggerWhatsAppApi(phone, pdfUrl, billNumber);
}

// Trigger SMS notification fallback on delivery failures
async function triggerSmsFallback(phone: string, orderId: string) {
  console.log(`[SMS FALLBACK] 📱 Sending plain-text invoice summary link to ${phone} for Order: ${orderId}`);
}

// Initialize BullMQ worker if Redis is active
if (redisConnection && redisConnection.status !== 'end') {
  const worker = new Worker(
    'whatsapp-billing',
    async (job: Job) => {
      console.log(`[BullMQ Worker] Processing job ${job.id} for order ${job.data.orderId}`);
      await processWhatsAppBillTask(job.data.orderId, job.data.phone);
    },
    {
      connection: redisConnection as any,
      concurrency: 1,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[BullMQ Worker] Job ${job.id} completed successfully.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[BullMQ Worker] Job ${job?.id} failed: ${err.message}`);
    if (job && job.attemptsMade >= (job.opts.attempts || 1)) {
      console.log(`[BullMQ Worker] All retries exhausted. Running SMS fallback for order ${job.data.orderId}`);
      triggerSmsFallback(job.data.phone, job.data.orderId);
    }
  });
}
