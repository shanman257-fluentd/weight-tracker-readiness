HealthTrack Pro

A high-performance weight tracking and health management dashboard built with React, Tailwind CSS, and the Gemini 2.5 API. Designed for users with specific goals (e.g., reaching 86kg), it provides AI-driven lifestyle planning and data-driven progression analysis.

🚀 Features

AI Performance Coach: Real-time insights and motivational feedback based on your current progress using Gemini 2.5.

Dynamic Lifestyle Planning: Generates customized meal and exercise suggestions based on user "mood" (Energy levels, Busyness, etc.).

Strategy Analysis: Advanced charting using Recharts to compare actual progress against a linear 24-week target.

Pace Metrics: Automatic calculation of average weekly loss and long-term projections.

Responsive Design: Premium dark-mode UI optimized for both desktop and mobile viewing.

🛠️ Technical Stack

Framework: React 18

Styling: Tailwind CSS

Icons: Lucide React

Charts: Recharts

Intelligence: Google Gemini 2.5 API

⚙️ Setup & Installation

1. Environment Variables

To enable the AI features, you need to provide a Google Gemini API key. In your local development or Vercel environment, set the following:

VITE_GEMINI_API_KEY=your_gemini_api_key_here


2. Installation

Clone the repository and install dependencies:

npm install


3. Development

Run the development server:

npm run dev


📊 Data Management

The application currently uses localStorage for persistence, keyed under health-tracker-v1.

Starting Weight: 110kg

Target Weight: 86kg

Height: 170cm

Timeline: 24-week strategy

🧠 AI Logic

The application implements exponential backoff (up to 5 retries) for API calls to ensure reliability.

Insights: Triggered by the "Generate Insight" button.

Plans: Context-aware JSON generation for meals and exercises.

📝 License

MIT
