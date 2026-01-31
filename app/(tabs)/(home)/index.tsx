
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <IconSymbol
              ios_icon_name="heart.fill"
              android_material_icon_name="favorite"
              size={28}
              color={colors.primary}
              style={styles.logo}
            />
            <Text style={styles.title} numberOfLines={1}>Boring Valentine</Text>
          </View>
          <Text style={styles.subtitle}>Find your perfect date</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Location Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>📍 Location</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter city and state"
              placeholderTextColor={colors.textSecondary}
              value={location}
              onChangeText={handleLocationChange}
              onFocus={() => location.length > 2 && setShowPredictions(true)}
            />
            
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
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={500}
              step={10}
              value={budget}
              onValueChange={setBudget}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>$0</Text>
              <Text style={styles.sliderLabel}>$500</Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleGetRecommendations}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Get Recommendations</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.recommendationsTitle}>Your Recommendations</Text>
            {recommendations.map((rec, index) => {
              const activityNumber = `${index + 1}`;
              const truncatedDescription = rec.description.length > 120 
                ? `${rec.description.substring(0, 120)}...` 
                : rec.description;
              const priceDisplay = '$'.repeat(rec.priceLevel);
              
              return (
                <View key={index} style={styles.recommendationCard}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberBadgeText}>{activityNumber}</Text>
                  </View>
                  
                  {rec.photoUrl && (
                    <Image
                      source={resolveImageSource(rec.photoUrl)}
                      style={styles.recommendationImage}
                      resizeMode="cover"
                    />
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
                        <Text style={styles.funnyExplanationLabel}>Why it&apos;s funny:</Text>
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
    marginTop: 20,
    marginBottom: 30,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    maxWidth: '100%',
  },
  logo: {
    marginRight: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  input: {
    height: 50,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  predictionsContainer: {
    marginTop: 8,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  predictionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  predictionText: {
    fontSize: 15,
    color: colors.text,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  recommendationsContainer: {
    marginTop: 40,
  },
  recommendationsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  recommendationCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  numberBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  numberBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  recommendationImage: {
    width: '100%',
    height: 200,
  },
  recommendationContent: {
    padding: 16,
  },
  recommendationName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  separator: {
    fontSize: 14,
    color: colors.textSecondary,
    marginHorizontal: 8,
  },
  priceLevelText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  recommendationAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  recommendationDescription: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  funnyExplanationContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  funnyExplanationLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  funnyExplanationText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
