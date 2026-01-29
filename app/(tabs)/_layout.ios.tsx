import React from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  // Single screen app - just one tab
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(home)">
        <Icon sf="heart.fill" />
        <Label>Boring Valentine</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
