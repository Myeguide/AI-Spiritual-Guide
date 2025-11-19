const { PrismaClient } = require("../lib/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");
  
  const result = await prisma.subscriptionTier.createMany({
    data: [
      {
        id: "fe956216-ee93-4a8b-8607-f39984772d20",
        name: "Free",
        type: "free",
        totalRequests: 5,              // Changed from total_requests
        price: "0",
        validityDays: 0,               // Changed from validity_days
        currency: "INR",
        description: "Perfect for trying out EternalGuide",
        features: [
          "5 free prompts",
          "Basic spiritual guidance",
          "Limited conversation history",
          "Community support"
        ]
      },
      {
        id: "658d6fa2-ff73-412a-a3c4-7421f09e0a3c",
        name: "Monthly",
        type: "premium-monthly",
        totalRequests: 50,             // Changed from total_requests
        price: "1",
        validityDays: 30,              // Changed from validity_days
        currency: "INR",
        description: "Best for regular seekers",
        features: [
          "Unlimited conversations",
          "Advanced AI responses",
          "Full conversation history",
          "Priority support",
          "WhatsApp integration",
          "1M tokens per month"
        ]
      },
      {
        id: "e77c5a8d-a16a-4d62-b20d-1c857a854e95",
        name: "Annual",
        type: "premium-yearly",
        totalRequests: 500,            // Changed from total_requests
        price: "1999",
        validityDays: 365,             // Changed from validity_days
        currency: "INR",
        description: "Save 67% with annual plan",
        features: [
          "Everything in Monthly",
          "Save ₹4,000 annually",
          "Extended token limits (12M)",
          "Premium support",
          "Early access to new features",
          "Personalized guidance"
        ]
      },
      {
        id: "46b65d59-9b5a-445e-9f4a-d09055125272",
        name: "Family",
        type: "family",
        totalRequests: 1500,           // Changed from total_requests
        price: "5999",
        validityDays: 365,             // Changed from validity_days
        currency: "INR",
        description: "Share wisdom with your family",
        features: [
          "Everything in Annual",
          "Up to 4 family members",
          "Shared token pool (50M)",
          "Individual profiles & memories",
          "Family dashboard",
          "Dedicated support",
          "Perfect for spiritual families"
        ]
      }
    ],
    skipDuplicates: true
  });
  
  console.log(`✔ Seed completed! Created ${result.count} subscription tiers.`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });