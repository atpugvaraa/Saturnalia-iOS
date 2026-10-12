import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import MetallicButton from './MetallicButton';

/**
 * Example showcase screen demonstrating MetallicButton variants
 * against the target #1B1B1B dark charcoal background.
 */
export const MetallicButtonDemo: React.FC = () => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Metallic Border Buttons</Text>
      <Text style={styles.subheading}>
        Dark recessed surface with 135° directional silver rim highlight
      </Text>

      {/* Section 1: Event Tags as on Event Details Screen */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Event Tags (Pills)</Text>
        <View style={styles.row}>
          <MetallicButton
            title="Technical"
            borderRadius={12}
            fontSize={13}
            onPress={() => console.log('Technical pressed')}
          />
          <MetallicButton
            title="Hackathon"
            borderRadius={12}
            fontSize={13}
            onPress={() => console.log('Hackathon pressed')}
          />
          <MetallicButton
            title="Team"
            borderRadius={12}
            fontSize={13}
            onPress={() => console.log('Team pressed')}
          />
          <MetallicButton
            title="Cultural"
            borderRadius={12}
            fontSize={13}
            onPress={() => console.log('Cultural pressed')}
          />
        </View>
      </View>

      {/* Section 2: Full Width Action Button */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Wide Action Button (Reference Proportions)</Text>
        <MetallicButton
          title="Hackathon"
          height={54}
          borderRadius={27}
          fontSize={16}
          style={{ width: '100%', alignSelf: 'stretch' }}
          contentStyle={{ height: 51 }}
          textStyle={{ fontFamily: 'Poppins_600SemiBold', letterSpacing: 0.5 }}
          onPress={() => console.log('Wide button pressed')}
        />
      </View>

      {/* Section 3: Disabled State */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Disabled State</Text>
        <MetallicButton
          title="Registration Closed"
          height={54}
          borderRadius={27}
          fontSize={15}
          disabled
          style={{ width: '100%', alignSelf: 'stretch' }}
          contentStyle={{ height: 51 }}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#1B1B1B', // Exact target charcoal canvas
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  heading: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    color: '#FAFAFA',
    marginBottom: 6,
  },
  subheading: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#A1A1AA',
    marginBottom: 32,
    lineHeight: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#71717A',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});

export default MetallicButtonDemo;
