import React from 'react';
import DashboardScreen from '../components/DashboardScreen';

// This component only renders when user is authenticated (protected by _layout.tsx)
export default function IndexScreen() {
  return <DashboardScreen />;
}