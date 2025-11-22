/**
 * Burbuja de Notificaciones Flotante
 * FAB (Floating Action Button) con notificaciones de itinerarios y recomendaciones
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Modal,
  Pressable,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

export interface NotificationItem {
  id: string;
  type: 'itinerary_reminder' | 'place_closing' | 'place_crowded' | 'nearby_recommendation';
  title: string;
  message: string;
  timestamp: Date;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  actionText?: string;
  onAction?: () => void;
  read: boolean;
}

interface NotificationBubbleProps {
  notifications: NotificationItem[];
  onNotificationPress?: (notification: NotificationItem) => void;
  onNotificationDismiss?: (notificationId: string) => void;
  onClearAll?: () => void;
}

export const NotificationBubble: React.FC<NotificationBubbleProps> = ({
  notifications,
  onNotificationPress,
  onNotificationDismiss,
  onClearAll,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [badgeAnimation] = useState(new Animated.Value(1));
  const [chatMessages, setChatMessages] = useState<
    { id: string; sender: 'bot' | 'user'; text: string; notification?: NotificationItem }[]
  >([]);
  const [inputText, setInputText] = useState('');

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Animar badge cuando hay notificaciones nuevas
  useEffect(() => {
    if (unreadCount > 0) {
      Animated.sequence([
        Animated.timing(badgeAnimation, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(badgeAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [unreadCount]);

  // Sincronizar notificaciones con el estilo chat (bot)
  useEffect(() => {
    const existingIds = new Set(chatMessages.filter(m => m.sender === 'bot').map(m => m.id));
    const newBotMessages = notifications
      .filter((n) => !existingIds.has(n.id))
      .map((n) => ({
        id: n.id,
        sender: 'bot' as const,
        text: `${n.title}: ${n.message}`,
        notification: n,
      }));

    if (newBotMessages.length > 0) {
      setChatMessages((prev) => [...prev, ...newBotMessages]);
    }
  }, [notifications, chatMessages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user' as const,
      text: inputText.trim(),
    };
    setChatMessages((prev) => [...prev, userMessage]);
    setInputText('');

    // Respuesta simple del "bot" basada en notificaciones
    const botReplyText =
      notifications.length > 0
        ? `Aquí tienes ${notifications.length} notificación(es). Toca cualquier mensaje para ver detalles.`
        : 'No tengo notificaciones nuevas ahora mismo, te aviso cuando llegue algo.';

    const botReply = {
      id: `bot-reply-${Date.now()}`,
      sender: 'bot' as const,
      text: botReplyText,
    };
    setChatMessages((prev) => [...prev, botReply]);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#3b82f6';
      default:
        return theme.colors.primary.main;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `Hace ${Math.floor(diffInMinutes / 60)}h`;
    return `Hace ${Math.floor(diffInMinutes / 1440)}d`;
  };

  return (
    <>
      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsExpanded(true)}
        activeOpacity={0.9}
      >
        <MaterialCommunityIcons
          name="bell"
          size={24}
          color={theme.colors.text.inverse}
        />
        {unreadCount > 0 && (
          <Animated.View
            style={[
              styles.badge,
              { transform: [{ scale: badgeAnimation }] },
            ]}
          >
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </Animated.View>
        )}
      </TouchableOpacity>

      {/* Modal de Notificaciones */}
      <Modal
        visible={isExpanded}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsExpanded(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsExpanded(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Asistente de notificaciones</Text>
                {unreadCount > 0 && (
                  <Text style={styles.unreadCount}>
                    {unreadCount} sin leer
                  </Text>
                )}
              </View>
              <View style={styles.headerActions}>
                {notifications.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      onClearAll?.();
                      setIsExpanded(false);
                    }}
                    style={styles.clearButton}
                  >
                    <Text style={styles.clearButtonText}>Limpiar todo</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setIsExpanded(false)}
                  style={styles.closeButton}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={theme.colors.text.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Vista tipo chat */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
            >
              <ScrollView
                style={styles.chatList}
                showsVerticalScrollIndicator={false}
              >
                {chatMessages.length === 0 && (
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons
                      name="chat-alert-outline"
                      size={48}
                      color={theme.colors.text.tertiary}
                    />
                    <Text style={styles.emptyText}>Sin mensajes</Text>
                    <Text style={styles.emptySubtext}>
                      Aquí verás tus notificaciones como mensajes. Escribe si necesitas ayuda.
                    </Text>
                  </View>
                )}

                {chatMessages.map((msg) => {
                  const isBot = msg.sender === 'bot';
                  const notification = msg.notification;
                  return (
                    <View
                      key={msg.id}
                      style={[
                        styles.chatBubble,
                        isBot ? styles.chatBubbleBot : styles.chatBubbleUser,
                      ]}
                    >
                      <View style={styles.chatHeader}>
                        <MaterialCommunityIcons
                          name={isBot ? 'robot-outline' : 'account'}
                          size={14}
                          color={isBot ? theme.colors.primary.main : theme.colors.text.primary}
                        />
                        <Text style={styles.chatSender}>
                          {isBot ? 'Asistente' : 'Tú'}
                        </Text>
                      </View>
                      <Text style={styles.chatText}>{msg.text}</Text>

                      {notification && notification.actionText && (
                        <TouchableOpacity
                          style={styles.notificationAction}
                          onPress={() => {
                            onNotificationPress?.(notification);
                            onNotificationDismiss?.(notification.id);
                            setIsExpanded(false);
                          }}
                        >
                          <Text style={styles.notificationActionText}>
                            {notification.actionText}
                          </Text>
                          <MaterialCommunityIcons
                            name="chevron-right"
                            size={16}
                            color={theme.colors.primary.main}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Escribe para pedir ayuda o ver notificaciones"
                  value={inputText}
                  onChangeText={setInputText}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                />
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handleSend}
                  disabled={!inputText.trim()}
                >
                  <MaterialCommunityIcons
                    name="send"
                    size={20}
                    color={inputText.trim() ? theme.colors.text.inverse : theme.colors.text.tertiary}
                  />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 80 : 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: 1000,
      },
    }),
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.secondary,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  unreadCount: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  clearButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  clearButtonText: {
    fontSize: 14,
    color: theme.colors.primary.main,
    fontWeight: '500',
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  chatList: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  chatBubble: {
    maxWidth: '85%',
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  chatBubbleBot: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.background.secondary,
  },
  chatBubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary[50],
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  chatSender: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: '600',
  },
  chatText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    lineHeight: 20,
  },
  notificationAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  notificationActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary.main,
    marginRight: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.secondary,
    backgroundColor: theme.colors.surface.primary,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background.tertiary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? theme.spacing.md : theme.spacing.sm,
    marginRight: theme.spacing.sm,
    color: theme.colors.text.primary,
  },
  sendButton: {
    backgroundColor: theme.colors.primary.main,
    borderRadius: theme.radius.full,
    padding: theme.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxxl * 2,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
    lineHeight: 20,
  },
});
