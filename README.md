
# Boring Valentine 💜

A fun mobile app that provides unexpected and humorous Valentine's Day date recommendations based on your relationship status, location, time available, and budget.

## Features

- **Location-based recommendations**: Enter your city and state with Google Places autocomplete
- **Relationship status options**: Single, In a Relationship, or Family
- **Time flexibility**: Choose from 0-2 hours, 2-4 hours, or full day
- **Budget control**: Set your budget from $0-$500 with an easy slider
- **AI-powered suggestions**: Get 3 funny, unexpected, and highly-reviewed date ideas powered by OpenAI
- **Real business data**: See actual businesses with photos, ratings, and addresses from Google Places

## Setup

### Backend Configuration

The app requires two API keys to be configured in the backend:

1. **Google Places API Key**
   - Get your API key from [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the Places API
   - Set the environment variable: `GOOGLE_PLACES_API_KEY`

2. **OpenAI API Key**
   - Get your API key from [OpenAI Platform](https://platform.openai.com/)
   - Set the environment variable: `OPENAI_API_KEY`

### Backend URL

Update the `backendUrl` in `app.json` to point to your backend server:

```json
{
  "extra": {
    "backendUrl": "https://your-backend-url.com"
  }
}
```

## API Endpoints

The backend provides the following endpoints:

### POST /api/places/autocomplete
Get location suggestions as the user types.

**Request:**
```json
{
  "input": "San Francisco"
}
```

**Response:**
```json
{
  "predictions": [
    {
      "description": "San Francisco, CA, USA",
      "placeId": "ChIJIQBpAG2ahYAR_6128GcTUEo"
    }
  ]
}
```

### POST /api/recommendations
Get date recommendations based on user preferences.

**Request:**
```json
{
  "location": "San Francisco, CA",
  "relationship": "single",
  "timeAvailable": "2-4 hours",
  "budget": 100
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "name": "The Quirky Coffee Shop",
      "description": "A hilariously boring yet highly-rated spot for awkward first dates...",
      "placeId": "ChIJ...",
      "address": "123 Main St, San Francisco, CA",
      "rating": 4.5,
      "photoUrl": "https://...",
      "priceLevel": 2
    }
  ]
}
```

## Design

- **Theme**: Purple and white color scheme
- **Style**: Simple, clean, and youthful
- **UX**: Single-screen app with intuitive form controls

## Tech Stack

- React Native + Expo 54
- TypeScript
- Google Places API
- OpenAI GPT-5.2
- React Native Slider

## Running the App

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## Notes

- The app uses TODO comments to mark where backend integration will be completed
- Once the backend is deployed, uncomment the API calls in the home screen components
- The app includes both base and iOS-specific versions of the home screen for optimal platform experience
