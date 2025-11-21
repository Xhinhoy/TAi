/**
 * Servicio de Notificaciones Contextuales
 * Genera notificaciones de itinerarios, lugares cercanos, horarios, etc.
 */

import { NotificationItem } from '../components/Notifications/NotificationBubble';
import { placesService } from '../api/services';

interface Itinerary {
  id: string;
  title: string;
  city: string;
  days: any[];
  start_date?: string;
  created_at: string;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

export class NotificationsService {
  private static instance: NotificationsService;
  private notifications: NotificationItem[] = [];

  public static getInstance(): NotificationsService {
    if (!NotificationsService.instance) {
      NotificationsService.instance = new NotificationsService();
    }
    return NotificationsService.instance;
  }

  /**
   * Genera notificaciones de recordatorio de itinerarios
   */
  public generateItineraryReminders(itineraries: Itinerary[]): NotificationItem[] {
    const reminders: NotificationItem[] = [];
    const now = new Date();

    itineraries.forEach((itinerary) => {
      if (!itinerary.start_date) return;

      const startDate = new Date(itinerary.start_date);
      const daysUntilStart = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Notificación 7 días antes
      if (daysUntilStart === 7) {
        reminders.push({
          id: `itinerary-reminder-7d-${itinerary.id}`,
          type: 'itinerary_reminder',
          title: 'Viaje próximo',
          message: `Tu viaje a ${itinerary.city} empieza en 7 días. ¡Prepárate!`,
          timestamp: now,
          priority: 'medium',
          icon: 'calendar-alert',
          actionText: 'Ver itinerario',
          onAction: () => console.log('Open itinerary', itinerary.id),
          read: false,
        });
      }

      // Notificación 3 días antes
      if (daysUntilStart === 3) {
        reminders.push({
          id: `itinerary-reminder-3d-${itinerary.id}`,
          type: 'itinerary_reminder',
          title: 'Viaje en 3 días',
          message: `Tu aventura en ${itinerary.city} está cerca. Revisa tu itinerario.`,
          timestamp: now,
          priority: 'high',
          icon: 'airplane-takeoff',
          actionText: 'Ver detalles',
          onAction: () => console.log('Open itinerary', itinerary.id),
          read: false,
        });
      }

      // Notificación 1 día antes
      if (daysUntilStart === 1) {
        reminders.push({
          id: `itinerary-reminder-1d-${itinerary.id}`,
          type: 'itinerary_reminder',
          title: '¡Mañana empieza tu viaje!',
          message: `${itinerary.city} te espera. Última revisión de tu itinerario.`,
          timestamp: now,
          priority: 'high',
          icon: 'bag-checked',
          actionText: 'Revisar',
          onAction: () => console.log('Open itinerary', itinerary.id),
          read: false,
        });
      }

      // Notificación el día del viaje
      if (daysUntilStart === 0) {
        reminders.push({
          id: `itinerary-reminder-today-${itinerary.id}`,
          type: 'itinerary_reminder',
          title: '¡Hoy empieza tu aventura!',
          message: `Tu viaje a ${itinerary.city} comienza hoy. ¡Disfruta!`,
          timestamp: now,
          priority: 'high',
          icon: 'party-popper',
          actionText: 'Ver itinerario',
          onAction: () => console.log('Open itinerary', itinerary.id),
          read: false,
        });
      }
    });

    return reminders;
  }

  /**
   * Genera notificaciones de lugares cercanos
   */
  public async generateNearbyRecommendations(
    userLocation: UserLocation,
    userInterests: string[]
  ): Promise<NotificationItem[]> {
    const recommendations: NotificationItem[] = [];

    try {
      const nearbyPlaces = await placesService.searchNearby({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        radius: 500, // 500 metros
      });

      // Filtrar lugares que coincidan con intereses del usuario
      const relevantPlaces = nearbyPlaces.filter((place) => {
        return place.categories?.some((category) =>
          userInterests.some((interest) =>
            category.toLowerCase().includes(interest.toLowerCase())
          )
        );
      });

      // Crear notificaciones para los 3 mejores lugares
      relevantPlaces.slice(0, 3).forEach((place, index) => {
        const distance = place.distance || 0;
        const distanceText = distance < 1000
          ? `${Math.round(distance)}m`
          : `${(distance / 1000).toFixed(1)}km`;

        recommendations.push({
          id: `nearby-${place.id}-${Date.now()}-${index}`,
          type: 'nearby_recommendation',
          title: 'Lugar cercano recomendado',
          message: `${place.name} está a ${distanceText}. Te puede gustar por tu interés en ${userInterests[0]}.`,
          timestamp: new Date(),
          priority: 'low',
          icon: 'map-marker-star',
          actionText: 'Ver lugar',
          onAction: () => console.log('Open place', place.id),
          read: false,
        });
      });
    } catch (error) {
      console.error('Error generando recomendaciones cercanas:', error);
    }

    return recommendations;
  }

  /**
   * Genera notificaciones de lugares por cerrar
   */
  public generateClosingTimeAlerts(visitedPlaces: any[]): NotificationItem[] {
    const alerts: NotificationItem[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = currentHour * 100 + currentMinutes;

    visitedPlaces.forEach((place) => {
      if (!place.openingHours) return;

      const currentDay = now.getDay();
      const todaySchedule = place.openingHours.periods?.find(
        (period: any) => period.open.day === currentDay
      );

      if (!todaySchedule?.close) return;

      const closeTime = parseInt(todaySchedule.close.time);
      const closeHour = Math.floor(closeTime / 100);
      const closeMinutes = closeTime % 100;

      // Calcular minutos hasta el cierre
      const minutesUntilClose = (closeHour * 60 + closeMinutes) - (currentHour * 60 + currentMinutes);

      // Alerta 1 hora antes del cierre
      if (minutesUntilClose === 60) {
        alerts.push({
          id: `closing-1h-${place.id}`,
          type: 'place_closing',
          title: 'Lugar por cerrar',
          message: `${place.name} cierra en 1 hora (${closeHour}:${closeMinutes.toString().padStart(2, '0')})`,
          timestamp: now,
          priority: 'medium',
          icon: 'clock-alert',
          actionText: 'Ver lugar',
          onAction: () => console.log('Open place', place.id),
          read: false,
        });
      }

      // Alerta 30 minutos antes
      if (minutesUntilClose === 30) {
        alerts.push({
          id: `closing-30m-${place.id}`,
          type: 'place_closing',
          title: '¡Cierra pronto!',
          message: `${place.name} cierra en 30 minutos. Apresúrate si quieres visitarlo.`,
          timestamp: now,
          priority: 'high',
          icon: 'clock-fast',
          actionText: 'Ver detalles',
          onAction: () => console.log('Open place', place.id),
          read: false,
        });
      }
    });

    return alerts;
  }

  /**
   * Genera alerta de lugares con mucha gente (simulado)
   */
  public generateCrowdAlerts(popularPlaces: any[]): NotificationItem[] {
    const alerts: NotificationItem[] = [];

    // Simular datos de afluencia (en producción vendría de una API)
    popularPlaces.forEach((place) => {
      const crowdLevel = Math.random(); // 0-1

      if (crowdLevel > 0.8) {
        // Muy concurrido
        alerts.push({
          id: `crowd-high-${place.id}`,
          type: 'place_crowded',
          title: 'Mucha gente',
          message: `${place.name} está muy concurrido ahora. Considera visitarlo más tarde.`,
          timestamp: new Date(),
          priority: 'low',
          icon: 'account-group',
          actionText: 'Ver alternativas',
          onAction: () => console.log('Show alternatives for', place.id),
          read: false,
        });
      } else if (crowdLevel < 0.3) {
        // Poco concurrido - buena oportunidad
        alerts.push({
          id: `crowd-low-${place.id}`,
          type: 'place_crowded',
          title: 'Momento ideal para visitar',
          message: `${place.name} tiene poca afluencia ahora. ¡Es buen momento!`,
          timestamp: new Date(),
          priority: 'medium',
          icon: 'check-circle',
          actionText: 'Ver detalles',
          onAction: () => console.log('Open place', place.id),
          read: false,
        });
      }
    });

    return alerts;
  }

  /**
   * Obtiene todas las notificaciones activas
   */
  public getNotifications(): NotificationItem[] {
    return this.notifications;
  }

  /**
   * Agrega una notificación
   */
  public addNotification(notification: NotificationItem): void {
    this.notifications.unshift(notification);
  }

  /**
   * Marca una notificación como leída
   */
  public markAsRead(notificationId: string): void {
    const notification = this.notifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  /**
   * Elimina una notificación
   */
  public removeNotification(notificationId: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== notificationId);
  }

  /**
   * Limpia todas las notificaciones
   */
  public clearAll(): void {
    this.notifications = [];
  }
}

export const notificationsService = NotificationsService.getInstance();
