// server/routes/stripe.ts

import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { db } from "../db";
import { subscriptions, users } from "../../shared/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Price IDs mapping
const PRICE_IDS = {
  starter_monthly: "price_1SImI1QAPRXKGA0bwJmoQZU9",
  starter_yearly: "price_1SImJ8QAPRXKGA0bKDZAyRv0",
  professional_monthly: "price_1SImGBQAPRXKGA0bffhj8GUL",
  professional_yearly: "price_1SImJVQAPRXKGA0bWhw6W4gP",
  enterprise_monthly: "price_1SImJsQAPRXKGA0b7C9AHUKe",
  enterprise_yearly: "price_1SImK6QAPRXKGA0bz549MIw4",
};

/**
 * Create Checkout Session
 * POST /api/stripe/create-checkout-session
 */
router.post("/create-checkout-session", async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { plan, billingPeriod } = req.body;

    if (!plan || !billingPeriod) {
      return res.status(400).json({ error: "Missing plan or billingPeriod" });
    }

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;

      // Save Stripe customer ID
      await db
        .update(users)
        .set({ stripeCustomerId: customerId })
        .where(eq(users.id, user.id));
    }

    // Get price ID
    const priceKey = `${plan}_${billingPeriod}` as keyof typeof PRICE_IDS;
    const priceId = PRICE_IDS[priceKey];

    console.log("💳 Creating checkout session:");
    console.log("  User:", user.email);
    console.log("  Plan:", plan);
    console.log("  Billing:", billingPeriod);
    console.log("  Price ID:", priceId);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${
        process.env.CLIENT_URL || "http://localhost:5000"
      }/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${
        process.env.CLIENT_URL || "http://localhost:5000"
      }/pricing`,
      metadata: {
        userId: user.id,
        plan,
        billingPeriod,
      },
    });

    console.log("✅ Session created:", session.id);
    console.log("✅ Checkout URL:", session.url);
    console.log("✅ Session status:", session.status);
    console.log("✅ Payment status:", session.payment_status);

    res.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error("❌ Stripe checkout error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get subscription status
 * GET /api/stripe/subscription
 */
router.get("/subscription", async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log("🔍 Fetching subscription for user:", req.user.id);

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, req.user.id))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    console.log(
      "📊 Subscription found:",
      subscription ? subscription.id : "none"
    );

    if (!subscription) {
      console.log("ℹ️ No subscription found for user");
      return res.json({ subscription: null });
    }

    // Get latest Stripe subscription data
    if (subscription.stripeSubscriptionId) {
      console.log("🔄 Syncing with Stripe:", subscription.stripeSubscriptionId);
      // ✅ FIX: Retrieve as plain object without Response wrapper
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );

      // ✅ FIX: Type assertion to access properties correctly
      const subData = stripeSubscription as any;

      console.log("🔍 Stripe subscription data:");
      console.log("   Status:", subData.status);
      console.log(
        "   Current period start (raw):",
        subData.current_period_start
      );
      console.log("   Current period end (raw):", subData.current_period_end);
      console.log("   Items data:", subData.items?.data?.[0]);

      // ✅ FIX: Get dates from items.data if not available at top level
      const itemData = subData.items?.data?.[0];
      const periodStart =
        subData.current_period_start || itemData?.current_period_start;
      const periodEnd =
        subData.current_period_end || itemData?.current_period_end;

      console.log("📅 Resolved dates:");
      console.log("   Period start:", periodStart);
      console.log("   Period end:", periodEnd);

      if (periodStart && periodEnd) {
        await db
          .update(subscriptions)
          .set({
            status: subData.status,
            currentPeriodStart: new Date(periodStart * 1000),
            currentPeriodEnd: new Date(periodEnd * 1000),
            cancelAtPeriodEnd: subData.cancel_at_period_end,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, subscription.id));

        console.log("✅ Subscription synced with Stripe");
      } else {
        console.log("⚠️ Dates not available, skipping sync");
      }
    }

    console.log("✅ Returning subscription:", subscription.plan);
    res.json({ subscription });
  } catch (error: any) {
    console.error("❌ Get subscription error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Cancel subscription
 * POST /api/stripe/cancel-subscription
 */
router.post("/cancel-subscription", async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, req.user.id))
      .limit(1);

    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(404).json({ error: "No active subscription found" });
    }

    // Cancel at period end
    const canceledSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    // Update database
    await db
      .update(subscriptions)
      .set({
        cancelAtPeriodEnd: true,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));

    res.json({ success: true, subscription: canceledSubscription });
  } catch (error: any) {
    console.error("❌ Cancel subscription error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create billing portal session
 * POST /api/stripe/billing-portal
 */
router.post("/billing-portal", async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!user?.stripeCustomerId) {
      return res.status(404).json({ error: "No Stripe customer found" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${
        process.env.CLIENT_URL || "http://localhost:5000"
      }/dashboard`,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error("❌ Billing portal error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
