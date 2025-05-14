const express = require("express");
const Stripe = require("stripe");
const router = express.Router();
require("dotenv").config();

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// Create Payment Link
router.post("/create-payment-link", async (req, res) => {
    try {
      console.log("📩 Incoming Payment Request:", req.body);
      const { amount, email, course } = req.body;
  
      if (!amount || !email || !course) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields (amount, email, course)",
        });
      }
  
      const clientUrl = "http://localhost:3000";
  
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: email,
        billing_address_collection: "required",
        client_reference_id: email, // Track user by email
        line_items: [
          {
            price_data: {
              currency: "inr",
              product_data: { name: course },
              unit_amount: amount * 100,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        expires_at: Math.floor(Date.now() / 1000) + 82800, // ~23 hours
        success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${clientUrl}/payment/fail`,
      });
  
  
      res.json({ success: true, paymentUrl: session.url, orderId: session.id });
    } catch (error) {
      console.error("Payment Link Error:", error.message);
      res.status(500).json({ success: false, message: "Error creating payment link" });
    }
  });
  

// Webhook to Track Payment Status
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook Signature Verification Failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      // Update payment status using email (from client_reference_id)
      await updatePaymentStatus(session.client_reference_id, "Paid");

      return res.json({
        success: true,
        status: "Paid",
        message: "Payment completed successfully.",
        orderId: session.id,
      });
    } catch (dbError) {
      console.error("Database Update Error:", dbError.message);
      return res.status(500).json({
        success: false,
        message: "Error updating payment status.",
      });
    }
  } else {
    return res.status(400).json({
      success: false,
      message: `Unhandled event type: ${event.type}`,
    });
  }
});

// ✅ Dummy DB update function (replace with real DB logic)
async function updatePaymentStatus(email, status) {
  // Example for MongoDB with Mongoose:
  // await User.updateOne({ email }, { paymentStatus: status });

  console.log(`ℹ️ (Mock) Updated ${email} status to ${status}`);
}

module.exports = router;
