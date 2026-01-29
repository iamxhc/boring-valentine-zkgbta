
# Integration Guide

## When Backend is Ready

Once the backend build completes, follow these steps to integrate it with the frontend:

### Step 1: Update Backend URL

Edit `app.json` and replace the placeholder URL:

```json
{
  "extra": {
    "backendUrl": "https://your-actual-backend-url.com"
  }
}
```

### Step 2: Uncomment API Calls

In both `app/(tabs)/(home)/index.tsx` and `app/(tabs)/(home)/index.ios.tsx`:

#### For Location Autocomplete:

Find this section:
```typescript
// TODO: Backend Integration - POST /api/places/autocomplete with { input: text }
// Returns: { predictions: [{ description, placeId }] }
console.log('Fetching autocomplete for:', text);
// const result = await getPlaceAutocomplete(text);
// setLocationPredictions(result.predictions);
```

Uncomment and update to:
```typescript
// Backend Integration - POST /api/places/autocomplete with { input: text }
console.log('Fetching autocomplete for:', text);
const result = await getPlaceAutocomplete(text);
setLocationPredictions(result.predictions);
```

#### For Recommendations:

Find this section:
```typescript
// TODO: Backend Integration - POST /api/recommendations
// Body: { location, relationship, timeAvailable, budget }
// Returns: { recommendations: [{ name, description, placeId, address, rating, photoUrl, priceLevel }] }
console.log('Fetching recommendations from backend');
// const result = await getRecommendations({
//   location,
//   relationship,
//   timeAvailable,
//   budget
// });
// setRecommendations(result.recommendations);

// Mock data for now - remove this once backend is ready
setTimeout(() => {
  setLoading(false);
  console.log('Mock recommendations loaded');
}, 2000);
```

Uncomment and update to:
```typescript
// Backend Integration - POST /api/recommendations
console.log('Fetching recommendations from backend');
const result = await getRecommendations({
  location,
  relationship,
  timeAvailable,
  budget
});
setRecommendations(result.recommendations);
setLoading(false);
```

### Step 3: Add Import Statement

At the top of both files, add:
```typescript
import { getPlaceAutocomplete, getRecommendations } from '@/utils/api';
```

### Step 4: Test the Integration

1. Restart the Expo development server:
   ```bash
   npm run dev
   ```

2. Test location autocomplete:
   - Type a city name
   - Verify suggestions appear
   - Select a suggestion

3. Test recommendations:
   - Fill out all form fields
   - Tap "Get Recommendations"
   - Verify 3 recommendations appear with:
     - Business photos
     - Names and ratings
     - Addresses
     - Funny descriptions

### Step 5: Error Handling

If you encounter errors:

1. Check backend logs for API errors
2. Verify API keys are set correctly
3. Check network requests in the console
4. Ensure the backend URL is correct

### API Response Format

The backend should return data in these exact formats:

**Autocomplete Response:**
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

**Recommendations Response:**
```json
{
  "recommendations": [
    {
      "name": "Business Name",
      "description": "Funny description here...",
      "placeId": "ChIJ...",
      "address": "123 Main St, City, State",
      "rating": 4.5,
      "photoUrl": "https://maps.googleapis.com/...",
      "priceLevel": 2
    }
  ]
}
```

### Troubleshooting

**Autocomplete not working:**
- Check Google Places API key
- Verify Places API is enabled in Google Cloud Console
- Check backend logs for API errors

**Recommendations not loading:**
- Check OpenAI API key
- Verify GPT-5.2 access
- Check backend logs for errors
- Ensure location is valid

**Photos not displaying:**
- Verify Google Places API returns photo URLs
- Check if photos need authentication
- Try using photo references with the photo endpoint

**Network errors:**
- Verify backend URL is correct
- Check if backend is running
- Test endpoints with curl or Postman first

### Success Checklist

- [ ] Backend URL updated in app.json
- [ ] API calls uncommented in index.tsx
- [ ] API calls uncommented in index.ios.tsx
- [ ] Import statements added
- [ ] App restarted
- [ ] Location autocomplete working
- [ ] Recommendations loading
- [ ] Photos displaying
- [ ] Ratings and addresses showing
- [ ] Descriptions are funny and relevant

Once all items are checked, your Boring Valentine app is fully integrated! 🎉
