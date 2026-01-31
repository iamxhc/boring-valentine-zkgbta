
import React, { useState } from "react";
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import Slider from "@react-native-community/slider";

// Helper to resolve image sources (handles both local require() and remote URLs)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

type RelationshipType = 'single' | 'couple' | 'family';
type TimeOption = '0-2 hours' | '2-4 hours' | 'full day';

interface Recommendation {
  name: string;
  description: string;
  placeId: string;
  address: string;
  rating: number;
  photoUrl: string;
  priceLevel: number;
  funnyExplanation: string;
}

interface LocationPrediction {
  description: string;
  placeId: string;
}

export default function HomeScreen() {
  const [location, setLocation] = useState('');
  const [locationPredictions, setLocationPredictions] = useState<LocationPrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationPrediction | null>(null);
  const [relationship, setRelationship] = useState<RelationshipType>('single');
  const [timeAvailable, setTimeAvailable] = useState<TimeOption>('2-4 hours');
  const [budget, setBudget] = useState(100);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const handleLocationChange = async (text: string) => {
    console.log('User typing location:', text);
    setLocation(text);
    setSelectedLocation(null);
    
    if (text.length > 2) {
      try {
        console.log('[API] Fetching autocomplete for:', text);
        const { getPlaceAutocomplete } = await import('@/utils/api');
        const result = await getPlaceAutocomplete(text);
        console.log('[API] Autocomplete results:', result.predictions.length, 'predictions');
        setLocationPredictions(result.predictions);
        setShowPredictions(true);
      } catch (error) {
        console.error('[API] Error fetching autocomplete:', error);
        setLocationPredictions([]);
      }
    } else {
      setShowPredictions(false);
      setLocationPredictions([]);
    }
  };

  const selectLocation = (prediction: LocationPrediction) => {
    console.log('User selected location:', prediction.description);
    setLocation(prediction.description);
    setSelectedLocation(prediction);
    setShowPredictions(false);
    setLocationPredictions([]);
  };

  const handleGetRecommendations = async () => {
    console.log('[USER ACTION] Get Recommendations button tapped');
    console.log('[FORM DATA]', { location, relationship, timeAvailable, budget });
    
    if (!location.trim()) {
      console.log('[VALIDATION] Location is empty');
      alert('Please enter a location');
      return;
    }

    setLoading(true);
    setRecommendations([]);

    try {
      console.log('[API] Requesting recommendations from backend...');
      const { getRecommendations } = await import('@/utils/api');
      const result = await getRecommendations({
        location,
        relationship: relationship === 'couple' ? 'relationship' : relationship,
        timeAvailable,
        budget
      });
      console.log('[API] Received', result.recommendations.length, 'recommendations');
      setRecommendations(result.recommendations);
      setLoading(false);
    } catch (error) {
      console.error('[API] Error fetching recommendations:', error);
      setLoading(false);
      alert('Failed to get recommendations. Please try again.');
    }
  };

  const budgetDisplay = `$${budget}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with sketch-style design */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <IconSymbol
              ios_icon_name="heart.fill"
              android_material_icon_name="favorite"
              size={32}
              color={colors.primary}
              style={styles.logo}
            />
            <Text style={styles.title} numberOfLines={1}>Boring Valentine</Text>
          </View>
          <Text style={styles.subtitle}>Find your perfect (boring) date</Text>
        </View>

        {/* Form with sketch-style cards */}
        <View style={styles.form}>
          {/* Location Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>📍 Location</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter city and state"
                placeholderTextColor={colors.textSecondary}
                value={location}
                onChangeText={handleLocationChange}
                onFocus={() => location.length > 2 && setShowPredictions(true)}
              />
            </View>
            
            {/* Autocomplete Predictions */}
            {showPredictions && locationPredictions.length > 0 && (
              <View style={styles.predictionsContainer}>
                {locationPredictions.map((prediction, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.predictionItem}
                    onPress={() => selectLocation(prediction)}
                  >
                    <Text style={styles.predictionText}>{prediction.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Relationship Status */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>💑 Relationship Status</Text>
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  relationship === 'single' && styles.optionButtonActive
                ]}
                onPress={() => {
                  console.log('User selected: single');
                  setRelationship('single');
                }}
              >
                <Text style={[
                  styles.optionText,
                  relationship === 'single' && styles.optionTextActive
                ]}>Single</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  relationship === 'couple' && styles.optionButtonActive
                ]}
                onPress={() => {
                  console.log('User selected: couple');
                  setRelationship('couple');
                }}
              >
                <Text style={[
                  styles.optionText,
                  relationship === 'couple' && styles.optionTextActive
                ]}>Couple</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  relationship === 'family' && styles.optionButtonActive
                ]}
                onPress={() => {
                  console.log('User selected: family');
                  setRelationship('family');
                }}
              >
                <Text style={[
                  styles.optionText,
                  relationship === 'family' && styles.optionTextActive
                ]}>Family</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Time Available */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>⏰ Time Available</Text>
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  timeAvailable === '0-2 hours' && styles.optionButtonActive
                ]}
                onPress={() => {
                  console.log('User selected: 0-2 hours');
                  setTimeAvailable('0-2 hours');
                }}
              >
                <Text style={[
                  styles.optionText,
                  timeAvailable === '0-2 hours' && styles.optionTextActive
                ]}>0-2 hours</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  timeAvailable === '2-4 hours' && styles.optionButtonActive
                ]}
                onPress={() => {
                  console.log('User selected: 2-4 hours');
                  setTimeAvailable('2-4 hours');
                }}
              >
                <Text style={[
                  styles.optionText,
                  timeAvailable === '2-4 hours' && styles.optionTextActive
                ]}>2-4 hours</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  timeAvailable === 'full day' && styles.optionButtonActive
                ]}
                onPress={() => {
                  console.log('User selected: full day');
                  setTimeAvailable('full day');
                }}
              >
                <Text style={[
                  styles.optionText,
                  timeAvailable === 'full day' && styles.optionTextActive
                ]}>Full Day</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Budget Slider */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>💰 Budget</Text>
              <Text style={styles.budgetValue}>{budgetDisplay}</Text>
            </View>
            <View style={styles.sliderContainer}>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={500}
                step={10}
                value={budget}
                onValueChange={setBudget}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.borderLight}
                thumbTintColor={colors.primary}
              />
            </View>
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>$0</Text>
              <Text style={styles.sliderLabel}>$500</Text>
            </View>
          </View>

          {/* Submit Button - Sketch style */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleGetRecommendations}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.submitButtonText}>Get Started</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>See How It Works</Text>
          </TouchableOpacity>
        </View>

        {/* Recommendations - Sketch style cards */}
        {recommendations.length > 0 && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.recommendationsTitle}>Your Boring Dates ✨</Text>
            {recommendations.map((rec, index) => {
              const activityNumber = `${index + 1}`;
              const truncatedDescription = rec.description.length > 120 
                ? `${rec.description.substring(0, 120)}...` 
                : rec.description;
              const priceDisplay = '$'.repeat(rec.priceLevel);
              
              return (
                <View key={index} style={styles.recommendationCard}>
                  {/* Sketch-style number badge */}
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberBadgeText}>{activityNumber}</Text>
                  </View>
                  
                  {rec.photoUrl && (
                    <View style={styles.imageContainer}>
                      <Image
                        source={resolveImageSource(rec.photoUrl)}
                        style={styles.recommendationImage}
                        resizeMode="cover"
                      />
                    </View>
                  )}
                  
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationName}>{rec.name}</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.ratingText}>⭐ {rec.rating}</Text>
                      {rec.priceLevel > 0 && (
                        <React.Fragment>
                          <Text style={styles.separator}>•</Text>
                          <Text style={styles.priceLevelText}>{priceDisplay}</Text>
                        </React.Fragment>
                      )}
                    </View>
                    <Text style={styles.recommendationAddress}>{rec.address}</Text>
                    <Text style={styles.recommendationDescription}>{truncatedDescription}</Text>
                    
                    {/* Funny Explanation */}
                    {rec.funnyExplanation && (
                      <View style={styles.funnyExplanationContainer}>
                        <Text style={styles.funnyExplanationLabel}>💭 Why it&apos;s funny:</Text>
                        <Text style={styles.funnyExplanationText}>{rec.funnyExplanation}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    maxWidth: '100%',
  },
  logo: {
    marginRight: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  budgetValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  inputContainer: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  input: {
    height: 50,
    fontSize: 15,
    color: colors.text,
  },
  predictionsContainer: {
    marginTop: 8,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  predictionItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  predictionText: {
    fontSize: 14,
    color: colors.text,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    minHeight: 50,
  },
  optionButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  optionTextActive: {
    color: colors.primary,
  },
  sliderContainer: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  sliderLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundAlt,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  recommendationsContainer: {
    marginTop: 40,
  },
  recommendationsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  recommendationCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.border,
    position: 'relative',
  },
  numberBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 2,
    borderColor: colors.backgroundAlt,
  },
  numberBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.backgroundAlt,
  },
  imageContainer: {
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
  },
  recommendationImage: {
    width: '100%',
    height: 180,
  },
  recommendationContent: {
    padding: 18,
  },
  recommendationName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  separator: {
    fontSize: 13,
    color: colors.textSecondary,
    marginHorizontal: 6,
  },
  priceLevelText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  recommendationAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10,
    lineHeight: 16,
  },
  recommendationDescription: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  funnyExplanationContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1.5,
    borderTopColor: colors.borderLight,
  },
  funnyExplanationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 5,
  },
  funnyExplanationText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
