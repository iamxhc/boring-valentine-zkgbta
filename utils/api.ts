
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || 'http://localhost:3000';

export async function apiPost<T>(endpoint: string, body: any): Promise<T> {
  console.log(`API POST ${endpoint}`, body);
  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API Error: ${response.status}`, errorText);
    throw new Error(`API Error: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  console.log(`API GET ${endpoint}`);
  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API Error: ${response.status}`, errorText);
    throw new Error(`API Error: ${response.status} ${errorText}`);
  }

  return response.json();
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
  budget: number;
}

// API functions
export async function getPlaceAutocomplete(input: string): Promise<PlaceAutocompleteResponse> {
  return apiPost<PlaceAutocompleteResponse>('/api/places/autocomplete', { input });
}

export async function getRecommendations(request: RecommendationRequest): Promise<RecommendationsResponse> {
  return apiPost<RecommendationsResponse>('/api/recommendations', request);
}
