
# 🚂 TheRailTrain - Premium Rail Voyager Suite

A world-class, AI-powered railway companion designed for the modern traveler. **TheRailTrain** leverages Gemini 3 models to provide real-time intelligence, logistics, and a personalized rail concierge experience.

## ✨ Features

- **📍 Live Tracking Protocol**: Real-time satellite-synced train status with platform predictions.
- **🎫 PNR Intelligence**: Advanced decoding of PNR manifests and chart statuses.
- **🕒 Voyage Logistics**: Comprehensive train schedules and route itineraries.
- **🏗️ Coach Architecture**: Visual decoding of coach sequences and positions.
- **🤖 AI Rail Concierge**: An intelligent assistant for platform info, delay insights, and travel queries.
- **📡 Global Signals**: Offline-ready persistent alerts for cancellations and delays.
- **🌓 Voyager Themes**: Seamless transition between Light and Dark (Midnight) modes.

## 🚀 Deployment to GitHub Pages

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/TheRailTrain.git
   ```

2. **Configure API Key**:
   - The app requires a Google Gemini API Key.
   - For local development, ensure `process.env.API_KEY` is available.
   - For GitHub Pages, add your key to **Settings > Secrets and variables > Actions** as `API_KEY`.

3. **Automation**:
   - Pushing to the `main` branch automatically triggers the GitHub Actions workflow defined in `.github/workflows/deploy.yml`.

## 🛠️ Tech Stack

- **UI**: React 19 (ESM)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Intelligence**: Google Gemini API (@google/genai)
- **Typography**: Plus Jakarta Sans

## 📜 License

This project is licensed under the MIT License.
