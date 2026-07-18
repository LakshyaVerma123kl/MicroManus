# MicroManus ⚡

**MicroManus** is a premium, AI-powered deep research platform designed to deliver professional-grade synthesis of complex topics. Built with a stunning glassmorphic UI and powered by multi-provider LLM support (OpenAI, Anthropic, Gemini), it gives you real-time access to the web while ensuring your data remains securely yours.

---

## ✨ Features

- **Multi-Provider AI Intelligence**: Seamlessly switch between OpenAI (GPT-4o), Anthropic (Claude 3.5 Sonnet), and Google (Gemini 1.5 Flash).
- **Deep Web Research**: Built-in automated web search capable of scraping and synthesizing real-time data from Brave Search, DuckDuckGo, and Wikipedia to bypass hallucinations.
- **God-Tier UI/UX**: 
  - Dynamic Aurora mesh background gradients
  - Native, iMessage-style chat bubbles with smooth Framer Motion animations
  - Glassmorphic sidebars and layout elements
  - Professional Lucide iconography and Markdown code formatting
- **End-to-End Security**: Bring Your Own Key (BYOK) architecture. API keys are encrypted at rest via AES-256 in Supabase.
- **PDF Report Generation**: Instantly compile deep research chats into formatted PDF reports for offline viewing.
- **Credit & Cost Tracking**: Native Stripe integration for purchasing credits, coupled with real-time token cost analytics.

## 🛠 Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Language**: TypeScript
- **Styling**: Hand-crafted Vanilla CSS (Custom Design Tokens, Flexbox, Glassmorphism)
- **AI Integration**: [Vercel AI SDK v3.4.9](https://sdk.vercel.ai/docs)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Edge Functions, Row-Level Security)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- A Supabase Project (Database, Auth, and Storage enabled)
- (Optional) Stripe API Keys for payments
- (Optional) Brave Search API Key for premium search results

### 1. Clone & Install
```bash
git clone https://github.com/LakshyaVerma123kl/MicroManus.git
cd MicroManus
npm install
```

### 2. Environment Variables
Copy the `.env.example` file to `.env` and fill in your Supabase, Stripe, and generic configuration details:
```bash
cp .env.example .env
```

### 3. Database Setup
Run the included `supabase-schema.sql` file in your Supabase SQL editor to create the necessary tables (`profiles`, `chats`, `messages`, `api_keys`, `usage_logs`), functions, and Row-Level Security (RLS) policies.

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the landing page.

## 🔒 Security Note
This platform uses a **Bring Your Own Key (BYOK)** model. The platform itself does not cover your LLM inference costs. You must provide your own API keys in the Dashboard, which are securely encrypted using an application-level secret before being stored in the database.

---
*Built for the future of automated, autonomous AI research.*
