
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || 'http://localhost:3000';

export async function apiPost<T>(endpoint: string, body: any): Promise<T> {
  console.log(`[API POST] ${endpoint}`, body);
  
  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (parseError) {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText;
        }
      }
      
      console.error(`[API ERROR] ${response.status}:`, errorMessage);
      
      // Provide user-friendly error messages
      if (response.status === 500) {
        if (errorMessage.includes('Google Places') || errorMessage.includes('GOOGLE_PLACES_API_KEY')) {
          throw new Error('Location service is temporarily unavailable. Please try again later.');
        } else if (errorMessage.includes('OpenAI') || errorMessage.includes('OPENAI_API_KEY')) {
          throw new Error('AI recommendation service is temporarily unavailable. Please try again later.');
        }
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log(`[API SUCCESS] ${endpoint}:`, data);
    return data;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[API EXCEPTION] ${endpoint}:`, error.message);
      throw error;
    }
    console.error(`[API EXCEPTION] ${endpoint}:`, error);
    throw new Error('Network error. Please check your connection and try again.');
  }
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  console.log(`[API GET] ${endpoint}`);
  
  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (parseError) {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText;
        }
      }
      
      console.error(`[API ERROR] ${response.status}:`, errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log(`[API SUCCESS] ${endpoint}:`, data);
    return data;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[API EXCEPTION] ${endpoint}:`, error.message);
      throw error;
    }
    console.error(`[API EXCEPTION] ${endpoint}:`, error);
    throw new Error('Network error. Please check your connection and try again.');
  }
}

// Types for API responses
export interface LocationPrediction {
  description: string;
  placeId: string;
}

export interface PlaceAutocompleteResponse {
  predictions: LocationPrediction[];
}

export interface Recommendation {
  name: string;
  description: string;
  placeId: string;
  address: string;
  rating: number;
  photoUrl: string;
  priceLevel: number;
  funnyExplanation: string;
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
}

export interface RecommendationRequest {
  location: string;
  relationship: 'single' | 'relationship' | 'family';
  timeAvailable: '0-2 hours' | '2-4 hours' | 'full day';
  minBudget: number;
  maxBudget: number;
}

// API functions
export async function getPlaceAutocomplete(input: string): Promise<PlaceAutocompleteResponse> {
  return apiPost<PlaceAutocompleteResponse>('/api/places/autocomplete', { input });
}

export async function getRecommendations(request: RecommendationRequest): Promise<RecommendationsResponse> {
  return apiPost<RecommendationsResponse>('/api/recommendations', request);
}
