// server/routes/stripe-webhook.ts

import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { db } from "../db";
import { subscriptions, users, payments } from "../../shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Stripe Webhook Handler
 * POST /webhook
 */
router.post("/", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];

  if (!sig || !webhookSecret) {
    return res.status(400).send("Webhook signature missing");
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log("✅ Stripe webhook received:", event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error("❌ Webhook handler error:", error);
    res.status(500).json({ error: error.message });
  }
});


// Handle successful checkout
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log("🎯 handleCheckoutCompleted called");
  
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan;
  const billingPeriod = session.metadata?.billingPeriod;

  console.log("📋 Metadata:", { userId, plan, billingPeriod });

  if (!userId || !plan || !billingPeriod) {
    console.error("❌ Missing metadata in checkout session");
    return;
  }

  const sessionData = session as any;
  const subscriptionId = typeof sessionData.subscription === 'string' 
    ? sessionData.subscription 
    : sessionData.subscription?.id;

  console.log("🔗 Subscription ID from session:", subscriptionId);

  if (!subscriptionId) {
    console.error("❌ No subscription ID in session");
    return;
  }

  try {
    console.log("📞 Fetching subscription from Stripe:", subscriptionId);
    
    // Get subscription from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    const subData = stripeSubscription as any;

    console.log("✅ Subscription retrieved:", subData.id);
    console.log("   Status:", subData.status);
    console.log("   Amount:", subData.items.data[0].price.unit_amount);
    console.log("   Currency:", subData.currency);

    // ✅ FIX: Validate dates before creating Date objects
    const currentPeriodStart = subData.current_period_start 
      ? new Date(subData.current_period_start * 1000)
      : new Date();

    const currentPeriodEnd = subData.current_period_end
      ? new Date(subData.current_period_end * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

    console.log("📅 Processed dates:");
    console.log("   Start:", currentPeriodStart.toISOString());
    console.log("   End:", currentPeriodEnd.toISOString());

    // Validate dates
    if (isNaN(currentPeriodStart.getTime())) {
      throw new Error("Invalid currentPeriodStart date");
    }
    if (isNaN(currentPeriodEnd.getTime())) {
      throw new Error("Invalid currentPeriodEnd date");
    }

    const stripeCustomerId = sessionData.customer as string;

    // ✅ NEW: Check if subscription already exists for this customer
    const [existingSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeCustomerId, stripeCustomerId))
      .limit(1);

    const subscriptionData = {
      userId,
      stripeCustomerId,
      stripeSubscriptionId: subData.id,
      stripePriceId: subData.items.data[0].price.id,
      plan,
      billingPeriod,
      status: subData.status,
      amount: subData.items.data[0].price.unit_amount || 0,
      currency: subData.currency,
      currentPeriodStart,
      currentPeriodEnd,
      ...(subData.trial_start && {
        trialStart: new Date(subData.trial_start * 1000)
      }),
      ...(subData.trial_end && {
        trialEnd: new Date(subData.trial_end * 1000)
      }),
      updatedAt: new Date(),
    };

    if (existingSubscription) {
      // ✅ UPDATE existing subscription
      console.log("🔄 Subscription already exists, updating...");
      
      await db
        .update(subscriptions)
        .set(subscriptionData)
        .where(eq(subscriptions.id, existingSubscription.id));

      console.log("✅ Subscription updated in database");
    } else {
      // ✅ INSERT new subscription
      console.log("💾 Inserting new subscription into database...");
      
      await db.insert(subscriptions).values({
        ...subscriptionData,
        createdAt: new Date(),
      });

      console.log("✅ Subscription inserted into database");
    }

    // Update user subscription type
    await db
      .update(users)
      .set({
        subscriptionType: plan,
        isTrialActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    console.log("✅ User updated successfully");
    console.log(`✅ Subscription created/updated for user ${userId}`);
  } catch (error) {
    console.error("❌ Error in handleCheckoutCompleted:", error);
    throw error;
  }
}

// Handle subscription updates
async function handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
  // ✅ FIX: Type assertion
  const subData = stripeSubscription as any;

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, subData.id))
    .limit(1);

  if (!subscription) {
    console.error("Subscription not found in database");
    return;
  }

  await db
    .update(subscriptions)
    .set({
      status: subData.status,
      currentPeriodStart: new Date(subData.current_period_start * 1000),
      currentPeriodEnd: new Date(subData.current_period_end * 1000),
      cancelAtPeriodEnd: subData.cancel_at_period_end,
      canceledAt: subData.canceled_at
        ? new Date(subData.canceled_at * 1000)
        : null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id));

  console.log(`✅ Subscription updated: ${subData.id}`);
}

// Handle subscription deletion
async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
  // ✅ FIX: Type assertion
  const subData = stripeSubscription as any;

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, subData.id))
    .limit(1);

  if (!subscription) return;

  await db
    .update(subscriptions)
    .set({
      status: "canceled",
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id));

  // Downgrade user to trial
  await db
    .update(users)
    .set({
      subscriptionType: "trial",
      updatedAt: new Date(),
    })
    .where(eq(users.id, subscription.userId));

  console.log(`✅ Subscription canceled: ${subData.id}`);
}

// Handle successful payment
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const invoiceData = invoice as any;
  
  const subscriptionId = typeof invoiceData.subscription === 'string'
    ? invoiceData.subscription
    : invoiceData.subscription?.id;

  if (!subscriptionId) {
    console.log("⏭️ No subscription in invoice, skipping payment record");
    return;
  }

  // ✅ FIX: Add retry logic - wait for subscription to exist
  let subscription = null;
  let retries = 0;
  const maxRetries = 3;

  while (!subscription && retries < maxRetries) {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
      .limit(1);

    if (sub) {
      subscription = sub;
    } else {
      console.log(`⏳ Subscription not found yet, retrying (${retries + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      retries++;
    }
  }

  if (!subscription) {
    console.error("❌ Subscription not found in database after retries");
    return;
  }

  const paymentIntentId = typeof invoiceData.payment_intent === 'string'
    ? invoiceData.payment_intent
    : invoiceData.payment_intent?.id;

  console.log("💾 Recording payment...");

  // Record payment
  await db.insert(payments).values({
    userId: subscription.userId,
    subscriptionId: subscription.id,
    stripePaymentIntentId: paymentIntentId || undefined,
    stripeInvoiceId: invoiceData.id,
    amount: invoiceData.amount_paid,
    currency: invoiceData.currency,
    status: "succeeded",
    invoiceUrl: invoiceData.hosted_invoice_url || undefined,
    receiptUrl: invoiceData.invoice_pdf || undefined,
    paidAt: invoiceData.status_transitions?.paid_at 
      ? new Date(invoiceData.status_transitions.paid_at * 1000)
      : new Date(),
    description: invoiceData.lines?.data?.[0]?.description || undefined,

  });

  console.log(`✅ Payment recorded: ${invoiceData.id}`);
}

// Handle failed payment
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // ✅ FIX: Type assertion to access properties
  const invoiceData = invoice as any;
  
  const subscriptionId = typeof invoiceData.subscription === 'string'
    ? invoiceData.subscription
    : invoiceData.subscription?.id;

  if (!subscriptionId) return;

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
    .limit(1);

  if (!subscription) return;

  const paymentIntentId = typeof invoiceData.payment_intent === 'string'
    ? invoiceData.payment_intent
    : invoiceData.payment_intent?.id;

  // Record failed payment
  await db.insert(payments).values({
    userId: subscription.userId,
    subscriptionId: subscription.id,
    stripePaymentIntentId: paymentIntentId || undefined,
    stripeInvoiceId: invoiceData.id,
    amount: invoiceData.amount_due,
    currency: invoiceData.currency,
    status: "failed",
    failedAt: new Date(),
    description: "Payment failed",
  });

  console.log(`❌ Payment failed: ${invoiceData.id}`);
}

export default router;