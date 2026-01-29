
# Setup Instructions for Boring Valentine

## Required API Keys

You need to provide two API keys for the backend to work:

### 1. Google Places API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Places API
   - Places API (New)
4. Go to "Credentials" and create an API key
5. Copy your API key

### 2. OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Copy your API key

## Setting Up the Backend

The backend has been automatically generated and is building in the background. Once it's ready:

1. Set the environment variables in your backend:
   - `GOOGLE_PLACES_API_KEY=your_google_api_key_here`
   - `OPENAI_API_KEY=your_openai_api_key_here`

2. Update the backend URL in `app.json`:
   ```json
   {
     "extra": {
       "backendUrl": "https://your-actual-backend-url.com"
     }
   }
   ```

3. The backend will automatically:
   - Use Google Places API for location autocomplete
   - Use Google Places API to find real businesses with photos and reviews
   - Use OpenAI GPT-5.2 to generate funny, unexpected date recommendations
   - Return 3 recommendations with business details

## Testing the App

1. Start the Expo development server:
   ```bash
   npm run dev
   ```

2. Open the app on your device or simulator

3. Enter a location (e.g., "San Francisco, CA")

4. Select your relationship status (Single, Relationship, or Family)

5. Choose your available time (0-2 hours, 2-4 hours, or Full Day)

6. Set your budget using the slider ($0-$500)

7. Tap "Get Recommendations" to see your boring Valentine's date ideas!

## Features

- **Smart Location Search**: As you type, the app will suggest cities using Google Places autocomplete
- **Personalized Recommendations**: The AI considers your relationship status, time, and budget
- **Real Business Data**: Each recommendation includes:
  - Business name
  - Google rating (stars)
  - Price level ($, $$, $$$)
  - Full address
  - Photo from Google Places
  - Funny, unexpected description

## Troubleshooting

- If autocomplete doesn't work, check that your Google Places API key is set correctly
- If recommendations don't load, check that your OpenAI API key is set correctly
- Make sure the backend URL in `app.json` matches your deployed backend
- Check the console logs for any error messages

## Design Notes

- The app uses a purple and white color scheme for a fun, youthful feel
- Single-screen design keeps it simple and focused
- All form controls are touch-friendly and easy to use
- The slider provides intuitive budget selection
- Results display with beautiful cards showing business photos

Enjoy finding your perfect boring Valentine's date! 💜
