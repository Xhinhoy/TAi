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
                <Text style={styles.modalTitle}>Notificaciones</Text>
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

            {/* Lista de Notificaciones */}
            {notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="bell-off-outline"
                  size={48}
                  color={theme.colors.text.tertiary}
                />
                <Text style={styles.emptyText}>No tienes notificaciones</Text>
                <Text style={styles.emptySubtext}>
                  Te avisaremos sobre tus itinerarios y lugares cercanos
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.notificationsList}
                showsVerticalScrollIndicator={false}
              >
                {notifications.map((notification) => (
                  <TouchableOpacity
                    key={notification.id}
                    style={[
                      styles.notificationItem,
                      !notification.read && styles.notificationItemUnread,
                    ]}
                    onPress={() => {
                      onNotificationPress?.(notification);
                      setIsExpanded(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.notificationIcon,
                        {
                          backgroundColor: getPriorityColor(notification.priority) + '20',
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={notification.icon as any}
                        size={20}
                        color={getPriorityColor(notification.priority)}
                      />
                    </View>

                    <View style={styles.notificationContent}>
                      <View style={styles.notificationHeader}>
                        <Text style={styles.notificationTitle} numberOfLines={1}>
                          {notification.title}
                        </Text>
                        <Text style={styles.notificationTime}>
                          {formatTimestamp(notification.timestamp)}
                        </Text>
                      </View>

                      <Text style={styles.notificationMessage} numberOfLines={2}>
                        {notification.message}
                      </Text>

                      {notification.actionText && (
                        <TouchableOpacity
                          style={styles.notificationAction}
                          onPress={(e) => {
                            e.stopPropagation();
                            notification.onAction?.();
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

                    <TouchableOpacity
                      style={styles.dismissButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        onNotificationDismiss?.(notification.id);
                      }}
                    >
                      <MaterialCommunityIcons
                        name="close"
                        size={18}
                        color={theme.colors.text.tertiary}
                      />
                    </TouchableOpacity>

                    {!notification.read && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
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
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.secondary,
    backgroundColor: theme.colors.surface.primary,
    position: 'relative',
  },
  notificationItemUnread: {
    backgroundColor: theme.colors.primary[50] + '40',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: theme.spacing.xs,
  },
  notificationTime: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
  },
  notificationMessage: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    marginBottom: theme.spacing.xs,
  },
  notificationAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  notificationActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary.main,
    marginRight: 4,
  },
  dismissButton: {
    padding: theme.spacing.xs,
  },
  unreadDot: {
    position: 'absolute',
    top: theme.spacing.md + 4,
    right: theme.spacing.md,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary.main,
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
