import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { logger, LogEntry } from '../../utils/logger';
import { theme } from '../../styles/theme';

interface LogViewerProps {
  visible?: boolean;
  onClose?: () => void;
}

export const LogViewer: React.FC<LogViewerProps> = ({ visible = true, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogEntry['level'] | 'ALL'>('ALL');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!visible) return;

    const updateLogs = () => {
      const allLogs = logger.getAllLogs();
      const filteredLogs = filter === 'ALL'
        ? allLogs
        : allLogs.filter(log => log.level === filter);
      setLogs(filteredLogs.slice(-100)); // Mostrar últimos 100 logs
    };

    // Actualizar logs inmediatamente
    updateLogs();

    // Auto refresh cada 1 segundo si está habilitado
    let interval: NodeJS.Timeout | undefined;
    if (autoRefresh) {
      interval = setInterval(updateLogs, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [visible, filter, autoRefresh]);

  const handleExportLogs = async () => {
    try {
      const logsText = logger.exportLogsAsText();
      await Share.share({
        message: logsText,
        title: 'TAi App Logs',
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudieron exportar los logs');
    }
  };

  const handleClearLogs = () => {
    Alert.alert(
      'Limpiar Logs',
      '¿Estás seguro de que quieres limpiar todos los logs?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: () => {
            logger.clearLogs();
            setLogs([]);
          },
        },
      ]
    );
  };

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'ERROR':
        return '#ef4444';
      case 'WARN':
        return '#f59e0b';
      case 'INFO':
        return '#3b82f6';
      case 'DEBUG':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Debug Logs</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setAutoRefresh(!autoRefresh)}
            style={[styles.actionButton, autoRefresh && styles.actionButtonActive]}
          >
            <MaterialCommunityIcons
              name="refresh"
              size={16}
              color={autoRefresh ? '#fff' : '#666'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleExportLogs} style={styles.actionButton}>
            <MaterialCommunityIcons name="export" size={16} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClearLogs} style={styles.actionButton}>
            <MaterialCommunityIcons name="delete" size={16} color="#666" />
          </TouchableOpacity>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.actionButton}>
              <MaterialCommunityIcons name="close" size={16} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView horizontal style={styles.filterContainer}>
        {(['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG'] as const).map((level) => (
          <TouchableOpacity
            key={level}
            onPress={() => setFilter(level)}
            style={[
              styles.filterButton,
              filter === level && styles.filterButtonActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === level && styles.filterTextActive,
              ]}
            >
              {level}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.logsContainer}>
        {logs.map((log, index) => (
          <View key={index} style={styles.logEntry}>
            <View style={styles.logHeader}>
              <Text style={styles.logTimestamp}>
                {formatTimestamp(log.timestamp)}
              </Text>
              <Text
                style={[
                  styles.logLevel,
                  { color: getLogColor(log.level) },
                ]}
              >
                {log.level}
              </Text>
              <Text style={styles.logComponent}>{log.component}</Text>
            </View>
            <Text style={styles.logAction}>{log.action}</Text>
            {log.data && (
              <Text style={styles.logData}>
                {JSON.stringify(log.data, null, 2)}
              </Text>
            )}
            {log.error && (
              <Text style={styles.logError}>
                Error: {JSON.stringify(log.error, null, 2)}
              </Text>
            )}
          </View>
        ))}
        {logs.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No hay logs para mostrar</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.stats}>
          Total: {logs.length} | Stats: {JSON.stringify(logger.getStats())}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 9999,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  actionButtonActive: {
    backgroundColor: theme.colors.primary.main,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary.main,
  },
  filterText: {
    color: '#fff',
    fontSize: 12,
  },
  filterTextActive: {
    fontWeight: 'bold',
  },
  logsContainer: {
    flex: 1,
    padding: 8,
  },
  logEntry: {
    backgroundColor: '#1a1a1a',
    padding: 8,
    marginBottom: 4,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#333',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  logTimestamp: {
    color: '#999',
    fontSize: 10,
    fontFamily: 'monospace',
    marginRight: 8,
  },
  logLevel: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginRight: 8,
    minWidth: 40,
  },
  logComponent: {
    color: '#ccc',
    fontSize: 10,
    fontFamily: 'monospace',
    flex: 1,
  },
  logAction: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  logData: {
    color: '#9ca3af',
    fontSize: 10,
    fontFamily: 'monospace',
    marginLeft: 8,
  },
  logError: {
    color: '#ef4444',
    fontSize: 10,
    fontFamily: 'monospace',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
  footer: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  stats: {
    color: '#666',
    fontSize: 10,
    fontFamily: 'monospace',
  },
});

export default LogViewer;