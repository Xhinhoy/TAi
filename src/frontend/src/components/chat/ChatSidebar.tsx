import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { AnimatedPressable } from '../ui/AnimatedPressable';
import { chatService } from '../../api/services';
import { auth } from '../../services/firebase';

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  messageCount?: number;
}

interface ChatSidebarProps {
  visible: boolean;
  onClose: () => void;
  currentSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onSessionDeleted?: () => void; // Callback para cuando se elimina la sesión actual
}

export interface ChatSidebarRef {
  refresh: () => void;
}

export const ChatSidebar = forwardRef<ChatSidebarRef, ChatSidebarProps>(({
  visible,
  onClose,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onSessionDeleted,
}, ref) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Exponer método refresh al componente padre
  useImperativeHandle(ref, () => ({
    refresh: () => {
      loadSessions(true);
    }
  }));

  useEffect(() => {
    if (visible) {
      loadSessions();
    }
  }, [visible]);

  const loadSessions = async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const user = auth.currentUser;
      if (!user) {
        console.warn('No user logged in');
        return;
      }

      const loadedSessions = await chatService.getUserSessions(user.uid);
      setSessions(loadedSessions);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      if (!isRefresh) {
        Alert.alert('Error', 'No se pudieron cargar las conversaciones');
      }
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const onRefresh = () => {
    loadSessions(true);
  };

  const handleSelectSession = (sessionId: string) => {
    onSelectSession(sessionId);
    onClose();
  };

  const handleDeleteSession = async (sessionId: string) => {
    // Para web, usar window.confirm
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('¿Estás seguro de que deseas eliminar esta conversación?');

      if (!confirmed) return;

      try {
        await chatService.deleteSession(sessionId);

        // Actualizar lista local
        const updatedSessions = sessions.filter(s => s.id !== sessionId);
        setSessions(updatedSessions);

        // Si se eliminó la sesión actual, notificar al componente padre
        if (sessionId === currentSessionId) {
          if (onSessionDeleted) {
            onSessionDeleted();
          }
          onNewChat();
          onClose();
        }
      } catch (error) {
        console.error('Error deleting session:', error);
        window.alert('Error: No se pudo eliminar la conversación');
      }
    } else {
      // Para móvil, usar Alert.alert
      Alert.alert(
        'Eliminar conversación',
        '¿Estás seguro de que deseas eliminar esta conversación?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              try {
                await chatService.deleteSession(sessionId);

                const updatedSessions = sessions.filter(s => s.id !== sessionId);
                setSessions(updatedSessions);

                if (sessionId === currentSessionId) {
                  if (onSessionDeleted) {
                    onSessionDeleted();
                  }
                  onNewChat();
                  onClose();
                }
              } catch (error) {
                console.error('Error deleting session:', error);
                Alert.alert('Error', 'No se pudo eliminar la conversación');
              }
            },
          },
        ]
      );
    }
  };

  const handleNewChat = () => {
    onNewChat();
    onClose();
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days}d`;

    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.sidebar}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <MaterialCommunityIcons
                name="chat-outline"
                size={24}
                color={theme.colors.primary.main}
              />
              <Text style={styles.headerTitle}>Conversaciones</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={theme.colors.text.secondary}
              />
            </Pressable>
          </View>

          {/* New Chat Button */}
          <AnimatedPressable style={styles.newChatButton} onPress={handleNewChat}>
            <MaterialCommunityIcons
              name="plus"
              size={20}
              color={theme.colors.text.inverse}
            />
            <Text style={styles.newChatButtonText}>Nueva conversación</Text>
          </AnimatedPressable>

          {/* Sessions List */}
          <ScrollView
            style={styles.sessionsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary.main]}
                tintColor={theme.colors.primary.main}
              />
            }
          >
            {loading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={theme.colors.primary.main} />
                <Text style={styles.loadingText}>Cargando conversaciones...</Text>
              </View>
            ) : sessions.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="chat-outline"
                  size={48}
                  color={theme.colors.text.tertiary}
                />
                <Text style={styles.emptyStateText}>
                  No hay conversaciones guardadas
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Comienza una nueva conversación
                </Text>
              </View>
            ) : (
              sessions.map((session) => (
                <View key={session.id} style={styles.sessionItemContainer}>
                  <TouchableOpacity
                    style={[
                      styles.sessionItem,
                      session.id === currentSessionId && styles.sessionItemActive,
                    ]}
                    onPress={() => handleSelectSession(session.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sessionContent}>
                      <View style={styles.sessionHeader}>
                        <MaterialCommunityIcons
                          name="message-text-outline"
                          size={16}
                          color={
                            session.id === currentSessionId
                              ? theme.colors.primary.main
                              : theme.colors.text.secondary
                          }
                        />
                        <Text
                          style={[
                            styles.sessionTitle,
                            session.id === currentSessionId && styles.sessionTitleActive,
                          ]}
                          numberOfLines={1}
                        >
                          {session.title}
                        </Text>
                      </View>
                      <Text style={styles.sessionLastMessage} numberOfLines={2}>
                        {session.lastMessage}
                      </Text>
                      <Text style={styles.sessionTimestamp}>
                        {formatTimestamp(session.timestamp)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteSession(session.id)}
                    activeOpacity={0.6}
                  >
                    <MaterialCommunityIcons
                      name="delete-outline"
                      size={20}
                      color={theme.colors.error || '#ef4444'}
                    />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
  },
  sidebar: {
    width: Platform.OS === 'web' ? 320 : '80%',
    maxWidth: 400,
    backgroundColor: theme.colors.surface.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '2px 0 8px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.secondary,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary.main,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    gap: theme.spacing.xs,
  },
  newChatButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: theme.spacing.xs,
  },
  sessionsList: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxxl,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxxl,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
  },
  sessionItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    position: 'relative',
  },
  sessionItem: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.secondary,
  },
  sessionItemActive: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary.main,
  },
  sessionContent: {
    gap: theme.spacing.xs,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
  },
  sessionTitleActive: {
    color: theme.colors.primary.main,
  },
  sessionLastMessage: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    lineHeight: 16,
  },
  sessionTimestamp: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.secondary,
    zIndex: 10,
    elevation: 5, // Para Android
  },
});
