# AI Spiritual Guidance (SG) — Soul's Compass 🕊️

AI Spiritual Guidance is a high-performance, specialized SaaS platform designed to offer personalized, wisdom-driven answers to life's complex challenges. By combining the OpenAI engine with a custom spiritual context layer, the platform provides actionable guidance via Web and WhatsApp.
<br>
<br>
## 🏗️ System Architecture & Engineering
This project is built as a Turborepo Monorepo for maximum scalability and type-safety across the entire stack.

   * Hybrid Delivery : Dual-entry points (Web & WhatsApp) sharing a unified backend logic and database state.

   * Webhook Orchestration: Robust handling of asynchronous events from Razorpay (payments) and MSG91 (WhatsApp messages).

   * Serverless First: Optimized for deployment on Vercel/AWS Lambda with optimized cold-starts and edge-ready API routes.
<br>
<br>

## 🌟 Key Features
### 🧠 Wisdom-Driven AI Engine
   * Contextual Persona: Custom-tuned AI agent that balances psychological wellness with spiritual tradition.

   * Streaming Responses: Real-time UI updates using Server-Sent Events (SSE) for a more human-like interaction.
### 📱 Omnichannel Access
   * Web Dashboard: Clean, minimalist UI built with Shadcn UI and Tailwind CSS.Database Setup

   * WhatsApp Integration: Direct spiritual guidance via WhatsApp Business API, supporting session persistence across platforms.
### 🔐 Secure, Passwordless Auth
   * OTP-Based Login: Seamless user onboarding using mobile/email OTPs, reducing friction and increasing security.

   * JWT-State Management: Secure session handling across client and server components.
### 💳 Subscription Management
   * Tiered Access: Free, Monthly, and Yearly plans managed via Razorpay.

   * Automatic Provisioning: Immediate access grant upon successful payment webhook verification.
<br>

## 🛠️ Tech Stack
```
   Framework                                  Next.js 15 (App Router), React.js
   Language                                   TypeScript (Strict Mode)
   Styling                                    Tailwind CSS, Shadcn UI, Lucide Icons
   Database                                   PostgreSQL
   ORM                                        Prisma
   AI                                         OpenAI SDK
   Payments                                   Razorpay Node.js SDK
   Communication                              WhatsApp Business API (via MSG91)
```
<br>

## 🚀 Getting Started
   ### 1. Installation
   ``` bash
   git clone https://github.com/yourusername/ai-spiritual-guidance.git
   cd ai-spiritual-guidance
   pnpm install
   ```
      
   ### 2. Environment Configuration
   ``` bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/asig"

# AI
OPENAI_API_KEY="sk-..."

# Payments
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="your_secret"
RAZORPAY_WEBHOOK_SECRET="your_webhook_secret"

# Messaging
MSG91_AUTH_KEY="your_key"
WHATSAPP_NUMBER_ID="your_id"
   ```

   ### 3. Database Setup
   ```
npx prisma migrate dev
npx prisma generate
   ```

   ### 4. Development
   ```
pnpm dev
   ```

“Seek and you shall find; knock and the door shall be opened unto you.”
