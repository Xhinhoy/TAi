/**
 * Hook para gestionar notificaciones contextuales
 */

import { useState, useEffect, useCallback } from 'react';
import { NotificationItem } from '../components/Notifications/NotificationBubble';
import { notificationsService } from '../services/notifications.service';
import { itinerariesService } from '../api/services';

interface UseNotificationsOptions {
  userId?: string;
  userLocation?: { latitude: number; longitude: number };
  userInterests?: string[];
  enableItineraryReminders?: boolean;
  enableNearbyRecommendations?: boolean;
  enableClosingTimeAlerts?: boolean;
  enableCrowdAlerts?: boolean;
}

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const {
    userId,
    userLocation,
    userInterests = [],
    enableItineraryReminders = true,
    enableNearbyRecommendations = true,
    enableClosingTimeAlerts = false,
    enableCrowdAlerts = false,
  } = options;

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Carga notificaciones de itinerarios
   */
  const loadItineraryNotifications = useCallback(async () => {
    if (!userId || !enableItineraryReminders) return;

    try {
      const itineraries = await itinerariesService.getUserItineraries(userId);
      const reminders = notificationsService.generateItineraryReminders(itineraries);

      reminders.forEach((reminder) => {
        const exists = notificationsService.getNotifications().some((n) => n.id === reminder.id);
        if (!exists) {
          notificationsService.addNotification(reminder);
        }
      });

      setNotifications([...notificationsService.getNotifications()]);
    } catch (error) {
      console.error('Error cargando notificaciones de itinerarios:', error);
    }
  }, [userId, enableItineraryReminders]);

  /**
   * Carga notificaciones de lugares cercanos
   */
  const loadNearbyNotifications = useCallback(async () => {
    if (!userLocation || !userInterests.length || !enableNearbyRecommendations) return;

    try {
      const recommendations = await notificationsService.generateNearbyRecommendations(
        userLocation,
        userInterests
      );

      recommendations.forEach((recommendation) => {
        const exists = notifications.some((n) => n.id === recommendation.id);
        if (!exists) {
          notificationsService.addNotification(recommendation);
        }
      });

      setNotifications([...notificationsService.getNotifications()]);
    } catch (error) {
      console.error('Error cargando recomendaciones cercanas:', error);
    }
  }, [userLocation, userInterests, enableNearbyRecommendations]);

  /**
   * Refresca todas las notificaciones
   */
  const refreshNotifications = useCallback(async () => {
    setIsLoading(true);

    try {
      await Promise.all([
        loadItineraryNotifications(),
        loadNearbyNotifications(),
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [loadItineraryNotifications, loadNearbyNotifications]);

  /**
   * Marca una notificación como leída
   */
  const markAsRead = useCallback((notificationId: string) => {
    notificationsService.markAsRead(notificationId);
    setNotifications([...notificationsService.getNotifications()]);
  }, []);

  /**
   * Elimina una notificación
   */
  const dismiss = useCallback((notificationId: string) => {
    notificationsService.removeNotification(notificationId);
    setNotifications([...notificationsService.getNotifications()]);
  }, []);

  /**
   * Limpia todas las notificaciones
   */
  const clearAll = useCallback(() => {
    notificationsService.clearAll();
    setNotifications([]);
  }, []);

  /**
   * Agrega una notificación personalizada
   */
  const addNotification = useCallback((notification: NotificationItem) => {
    notificationsService.addNotification(notification);
    setNotifications([...notificationsService.getNotifications()]);
  }, []);

  // Cargar notificaciones al montar y cuando cambien las opciones
  useEffect(() => {
    refreshNotifications();
  }, [userId, userLocation, userInterests]);

  // Recargar notificaciones periódicamente (cada 5 minutos)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshNotifications();
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [refreshNotifications]);

  return {
    notifications,
    isLoading,
    refreshNotifications,
    markAsRead,
    dismiss,
    clearAll,
    addNotification,
    unreadCount: notifications.filter((n) => !n.read).length,
  };
};
