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

// ✅ SINGLE PLAN - Price IDs
const PRICE_IDS = {
  monthly: "price_1SImGBQAPRXKGA0bffhj8GUL", // Professional monthly
  yearly: "price_1SImJVQAPRXKGA0bWhw6W4gP",  // Professional yearly
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

    const { billingPeriod } = req.body;

    if (!billingPeriod) {
      return res.status(400).json({ error: "Missing billingPeriod" });
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

    // ✅ Get price ID for single plan
    const priceId = billingPeriod === "monthly" ? PRICE_IDS.monthly : PRICE_IDS.yearly;

    console.log("💳 Creating checkout session:");
    console.log("  User:", user.email);
    console.log("  Billing:", billingPeriod);
    console.log("  Price ID:", priceId);

    // ✅ Create checkout session with 7-day trial
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
      subscription_data: {
        trial_period_days: 7, // ✅ 7-day trial
      },
      success_url: `${
        process.env.CLIENT_URL || "http://localhost:5000"
      }/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${
        process.env.CLIENT_URL || "http://localhost:5000"
      }/pricing`,
      metadata: {
        userId: user.id,
        plan: "professional", // ✅ Single plan name
        billingPeriod,
      },
    });

    console.log("✅ Session created:", session.id);
    console.log("✅ Trial enabled: 7 days");

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

    if (!subscription) {
      console.log("ℹ️ No subscription found for user");
      return res.json({ subscription: null });
    }

    // Get latest Stripe subscription data
    if (subscription.stripeSubscriptionId) {
      console.log("🔄 Syncing with Stripe:", subscription.stripeSubscriptionId);
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );

      const subData = stripeSubscription as any;

      const itemData = subData.items?.data?.[0];
      const periodStart =
        subData.current_period_start || itemData?.current_period_start;
      const periodEnd =
        subData.current_period_end || itemData?.current_period_end;

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
      }
    }

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