
import React, { useState } from "react";
import { Stack } from "expo-router";
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Image,
  ImageSourcePropType
} from "react-native";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import Slider from "@react-native-community/slider";

// Helper to resolve image sources (handles both local require() and remote URLs)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

type RelationshipType = 'single' | 'relationship' | 'family';
type TimeOption = '0-2 hours' | '2-4 hours' | 'full day';

interface Recommendation {
  name: string;
  description: string;
  placeId: string;
  address: string;
  rating: number;
  photoUrl: string;
  priceLevel: number;
}

interface LocationPrediction {
  description: string;
  placeId: string;
}

export default function HomeScreen() {
  const [location, setLocation] = useState('');
  const [locationPredictions, setLocationPredictions] = useState<LocationPrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [relationship, setRelationship] = useState<RelationshipType>('single');
  const [timeAvailable, setTimeAvailable] = useState<TimeOption>('2-4 hours');
  const [budget, setBudget] = useState(100);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const handleLocationChange = async (text: string) => {
    console.log('User typing location:', text);
    setLocation(text);
    
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
        relationship,
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
    <>
      <Stack.Screen
        options={{
          title: "Boring Valentine",
          headerLargeTitle: true,
        }}
      />
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.subtitle}>Find your perfect (boring) date</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Location Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <View style={styles.inputContainer}>
              <IconSymbol 
                ios_icon_name="location.fill"
                android_material_icon_name="location-on"
                size={20}
                color={colors.primary}
                style={styles.inputIcon}
              />
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
                    <IconSymbol
                      ios_icon_name="location"
                      android_material_icon_name="location-on"
                      size={16}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.predictionText}>{prediction.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Relationship Status */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Relationship Status</Text>
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
                <IconSymbol
                  ios_icon_name="person"
                  android_material_icon_name="person"
                  size={20}
                  color={relationship === 'single' ? colors.background : colors.primary}
                />
                <Text style={[
                  styles.optionText,
                  relationship === 'single' && styles.optionTextActive
                ]}>Single</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  relationship === 'relationship' && styles.optionButtonActive
                ]}
                onPress={() => {
                  console.log('User selected: relationship');
                  setRelationship('relationship');
                }}
              >
                <IconSymbol
                  ios_icon_name="heart.fill"
                  android_material_icon_name="favorite"
                  size={20}
                  color={relationship === 'relationship' ? colors.background : colors.primary}
                />
                <Text style={[
                  styles.optionText,
                  relationship === 'relationship' && styles.optionTextActive
                ]}>Relationship</Text>
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
                <IconSymbol
                  ios_icon_name="person.3"
                  android_material_icon_name="group"
                  size={20}
                  color={relationship === 'family' ? colors.background : colors.primary}
                />
                <Text style={[
                  styles.optionText,
                  relationship === 'family' && styles.optionTextActive
                ]}>Family</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Time Available */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Time Available</Text>
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
              <Text style={styles.label}>Budget</Text>
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
              <ActivityIndicator color={colors.background} />
            ) : (
              <React.Fragment>
                <IconSymbol
                  ios_icon_name="sparkles"
                  android_material_icon_name="auto-awesome"
                  size={20}
                  color={colors.background}
                />
                <Text style={styles.submitButtonText}>Get Recommendations</Text>
              </React.Fragment>
            )}
          </TouchableOpacity>
        </View>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.recommendationsTitle}>Your Boring Dates</Text>
            {recommendations.map((rec, index) => {
              const activityNumber = `${index + 1}.`;
              const truncatedDescription = rec.description.length > 120 
                ? `${rec.description.substring(0, 120)}...` 
                : rec.description;
              const priceDisplay = '$'.repeat(rec.priceLevel);
              
              return (
                <View key={index} style={styles.recommendationCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.activityNumber}>{activityNumber}</Text>
                    {rec.photoUrl && (
                      <Image
                        source={resolveImageSource(rec.photoUrl)}
                        style={styles.recommendationImage}
                        resizeMode="cover"
                      />
                    )}
                  </View>
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationName}>{rec.name}</Text>
                    <View style={styles.infoRow}>
                      <View style={styles.ratingContainer}>
                        <IconSymbol
                          ios_icon_name="star.fill"
                          android_material_icon_name="star"
                          size={14}
                          color="#FCD34D"
                        />
                        <Text style={styles.ratingText}>{rec.rating}</Text>
                      </View>
                      <Text style={styles.separator}>•</Text>
                      <Text style={styles.priceLevelText}>{priceDisplay}</Text>
                    </View>
                    <Text style={styles.recommendationAddress}>{rec.address}</Text>
                    <Text style={styles.recommendationDescription}>{truncatedDescription}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
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
    fontWeight: 'bold',
    color: colors.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: colors.text,
  },
  predictionsContainer: {
    marginTop: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  predictionText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.text,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
  },
  optionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  optionTextActive: {
    color: colors.background,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  sliderLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.background,
  },
  recommendationsContainer: {
    marginTop: 32,
  },
  recommendationsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  recommendationCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    position: 'relative',
  },
  activityNumber: {
    position: 'absolute',
    top: 12,
    left: 12,
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.background,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10,
    overflow: 'hidden',
  },
  recommendationImage: {
    width: '100%',
    height: 160,
  },
  recommendationContent: {
    padding: 12,
  },
  recommendationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  },
  recommendationAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  recommendationDescription: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
});
