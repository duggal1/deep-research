# Blaze - Deep Research Engine

A powerful web research engine powered by autonomous web exploration and advanced AI reasoning.

## Features

- **Autonomous Web Exploration**: Dynamically crawls and extracts relevant content from the web
- **Advanced Research Planning**: Creates structured research plans tailored to each query
- **Comprehensive Data Analysis**: Synthesizes information from multiple sources
- **Multi-stage Research Process**: Identifies knowledge gaps and performs follow-up research
- **Source Credibility Analysis**: Evaluates and prioritizes sources based on relevance and reliability

## Technology Stack

- Next.js (App Router)
- TypeScript
- Gemini API for AI reasoning
- Tailwind CSS
- Lucide Icons

## Setup

1. Clone the repository:
```bash
git clone https://github.com/duggal1/deep-research.git
cd deep-research
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
Create a `.env` file in the root directory with your Gemini API key:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## How It Works

1. The engine accepts a research query from the user
2. It analyzes the query to create a structured research plan
3. It performs initial web exploration across multiple sources
4. The data is analyzed to identify knowledge gaps
5. Follow-up research is conducted to fill those gaps
6. All findings are synthesized into a comprehensive report

## License

MIT 