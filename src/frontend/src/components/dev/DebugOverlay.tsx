import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LogViewer from './LogViewer';
import { theme } from '../../styles/theme';

interface DebugOverlayProps {
  enabled?: boolean;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({ enabled = true }) => {
  const [showLogs, setShowLogs] = useState(false);

  if (!enabled || __DEV__ === false) {
    return null;
  }

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.debugButton}
          onPress={() => setShowLogs(!showLogs)}
        >
          <MaterialCommunityIcons
            name="bug"
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      <LogViewer
        visible={showLogs}
        onClose={() => setShowLogs(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    right: 16,
    zIndex: 1000,
  },
  debugButton: {
    backgroundColor: theme.colors.primary.main,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

export default DebugOverlay;