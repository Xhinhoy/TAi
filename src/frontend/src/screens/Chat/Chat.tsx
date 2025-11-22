// Cargar polyfills para Markdown PRIMERO
import '../../../polyfills';

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
  Alert,
  Share,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { theme } from '../../styles/theme';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { chatService, ChatMessage, ChatAction, usersService, itinerariesService } from '../../api/services';
import { useAuth } from '../../hooks/useAuth';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useNavigation } from '@react-navigation/native';
import { ChatSidebar, ChatSidebarRef } from '../../components/chat/ChatSidebar';

interface Message extends ChatMessage {
  id: string;
  isUser: boolean;
  places?: any[];
  actions?: ChatAction[];
  itinerary?: any;  // Itinerario generado por la IA
}

// Función para extraer texto limpio de respuestas del backend
const extractCleanContent = (content: any): string => {
  // Si ya es un string, devolverlo
  if (typeof content === 'string') {
    return content;
  }

  // Si es un objeto de LangChain con content
  if (content && typeof content === 'object') {
    // Intentar extraer el campo content
    if (content.content && typeof content.content === 'string') {
      console.log('✅ Extrayendo contenido de objeto LangChain');
      return content.content;
    }

    // Si es un error serializado como string
    if (content.message && typeof content.message === 'string') {
      return content.message;
    }
  }

  // Si nada funciona, convertir a string
  console.warn('⚠️ Contenido en formato inesperado, convirtiendo a string');
  return String(content);
};

// Función para detectar y extraer JSON de itinerarios del contenido
const detectAndParseItinerary = (content: string): { isItinerary: boolean; data: any; remaining: string } => {
  try {
    // Intentar parsear todo el contenido como JSON
    const parsed = JSON.parse(content);
    if (parsed && parsed.title && parsed.days && Array.isArray(parsed.days)) {
      console.log('🗺️ Itinerario JSON detectado y parseado');
      return { isItinerary: true, data: parsed, remaining: '' };
    }
  } catch (e) {
    // No es JSON completo, buscar JSON embebido
  }

  // Buscar bloques de código JSON primero
  const codeBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/;
  const codeBlockMatch = content.match(codeBlockRegex);

  let potentialJson = '';
  let startIdx = -1;
  let endIdx = -1;

  if (codeBlockMatch) {
    potentialJson = codeBlockMatch[1];
    startIdx = content.indexOf(codeBlockMatch[0]);
    endIdx = startIdx + codeBlockMatch[0].length;
  } else {
    // Buscar JSON sin bloques de código
    startIdx = content.indexOf('{');
    endIdx = content.lastIndexOf('}');

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      potentialJson = content.substring(startIdx, endIdx + 1);
    }
  }

  if (potentialJson) {
    // Limpiar el JSON: remover comentarios, trailing commas, etc
    let cleanedJson = potentialJson
      .replace(/\/\/.*$/gm, '')  // Remover comentarios de línea
      .replace(/,(\s*[}\]])/g, '$1')  // Remover trailing commas
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');  // Remover caracteres de control

    try {
      const parsed = JSON.parse(cleanedJson);
      if (parsed && parsed.title && parsed.days && Array.isArray(parsed.days)) {
        console.log('🗺️ Itinerario JSON detectado y parseado');
        const remaining = startIdx !== -1 && endIdx !== -1
          ? content.substring(0, startIdx) + content.substring(endIdx + 1)
          : '';
        return { isItinerary: true, data: parsed, remaining: remaining.trim() };
      }
    } catch (e: any) {
      console.warn('⚠️ JSON encontrado pero no válido:', e.message);
      // Mostrar una parte del JSON problemático para debug
      const errorPos = e.message.match(/position (\d+)/);
      if (errorPos) {
        const pos = parseInt(errorPos[1]);
        const snippet = cleanedJson.substring(Math.max(0, pos - 50), Math.min(cleanedJson.length, pos + 50));
        console.warn('📍 Snippet del error:', snippet);
      }
    }
  }

  return { isItinerary: false, data: null, remaining: content };
};

// Componente visual mejorado para mostrar itinerarios JSON
const ItineraryVisualCard: React.FC<{ itinerary: any }> = ({ itinerary }) => {
  return (
    <View style={styles.itineraryVisualCard}>
      {/* Header del itinerario */}
      <View style={styles.itineraryVisualHeader}>
        <MaterialCommunityIcons name="map-marker-path" size={24} color={theme.colors.primary.main} />
        <Text style={styles.itineraryVisualTitle}>{itinerary.title || 'Itinerario generado'}</Text>
      </View>

      {/* Días del itinerario */}
      {itinerary.days && itinerary.days.map((day: any, dayIndex: number) => (
        <View key={dayIndex} style={styles.dayCard}>
          <View style={styles.dayHeader}>
            <View style={styles.dayBadge}>
              <Text style={styles.dayBadgeText}>Día {day.day}</Text>
            </View>
          </View>

          {/* Actividades del día */}
          {day.activities && day.activities.map((activity: any, actIndex: number) => (
            <View key={actIndex} style={styles.activityCard}>
              <View style={styles.activityTime}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors.primary.main} />
                <Text style={styles.activityTimeText}>
                  {activity.start} - {activity.end}
                </Text>
              </View>

              <View style={styles.activityContent}>
                <Text style={styles.activityName}>{activity.place_name}</Text>

                {activity.notes && (
                  <Text style={styles.activityNotes}>{activity.notes}</Text>
                )}

                <View style={styles.activityMeta}>
                  {activity.price_display && (
                    <View style={styles.activityMetaItem}>
                      <MaterialCommunityIcons name="currency-usd" size={14} color={theme.colors.text.secondary} />
                      <Text style={styles.activityMetaText}>{activity.price_display}</Text>
                    </View>
                  )}
                  {activity.price_level !== undefined && (
                    <View style={styles.activityMetaItem}>
                      <Text style={styles.activityMetaText}>Nivel: {activity.price_level}/4</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      ))}

      {/* Reasoning del itinerario */}
      {itinerary.reasoning && (
        <View style={styles.itineraryReasoning}>
          <MaterialCommunityIcons name="information-outline" size={16} color={theme.colors.primary.main} />
          <Text style={styles.itineraryReasoningText}>{itinerary.reasoning}</Text>
        </View>
      )}
    </View>
  );
};

// Componente seguro para renderizar Markdown con fallback
const SafeMarkdown: React.FC<{ content: string; style: any }> = ({ content, style }) => {
  const [hasError, setHasError] = useState(false);

  // Limpiar el contenido primero
  const cleanContent = extractCleanContent(content);

  // Detectar si es un itinerario JSON
  const itineraryResult = detectAndParseItinerary(cleanContent);

  // Si es un itinerario JSON, renderizarlo visualmente
  if (itineraryResult.isItinerary) {
    return (
      <View>
        <ItineraryVisualCard itinerary={itineraryResult.data} />
        {/* Si hay texto adicional además del JSON, renderizarlo también */}
        {itineraryResult.remaining && (
          <View style={{ marginTop: 12 }}>
            <Markdown style={style} mergeStyle={true}>
              {itineraryResult.remaining}
            </Markdown>
          </View>
        )}
      </View>
    );
  }

  // Detectar si el contenido tiene tablas (markdown tables)
  const hasTable = cleanContent.includes('|') && cleanContent.includes('---');

  if (hasError) {
    // Si hay error, mostrar como texto plano con formato básico
    return (
      <Text style={{ color: theme.colors.text.primary, fontSize: 14, lineHeight: 20 }}>
        {cleanContent}
      </Text>
    );
  }

  // Si hay tabla, procesar el contenido para remover sintaxis problemática
  const processedContent = cleanContent;
  if (hasTable) {
    // Reemplazar tablas markdown por una versión más simple o texto
    // Por ahora, simplemente advertimos pero intentamos renderizar
    console.log('📊 Detectada tabla en el mensaje, intentando renderizar...');
  }

  try {
    return (
      <Markdown
        style={style}
        mergeStyle={true}
        onError={(error) => {
          console.warn('⚠️ Error renderizando Markdown:', error, 'Contenido:', processedContent.substring(0, 100));
          setHasError(true);
        }}
      >
        {processedContent}
      </Markdown>
    );
  } catch (error) {
    console.error('❌ Error crítico en Markdown:', error);
    return (
      <Text style={{ color: theme.colors.text.primary, fontSize: 14, lineHeight: 20 }}>
        {cleanContent}
      </Text>
    );
  }
};

// Componente de puntos animados para typing indicator
const TypingDots: React.FC = () => {
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(dot1Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(dot2Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(dot3Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(dot1Opacity, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Opacity, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Opacity, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => animate());
    };

    animate();
  }, []);

  return (
    <View style={styles.typingIndicator}>
      <Animated.View style={[styles.typingDot, { opacity: dot1Opacity }]} />
      <View style={{ width: 6 }} />
      <Animated.View style={[styles.typingDot, { opacity: dot2Opacity }]} />
      <View style={{ width: 6 }} />
      <Animated.View style={[styles.typingDot, { opacity: dot3Opacity }]} />
    </View>
  );
};

const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => `session-${Date.now()}`);
  const [isTyping, setIsTyping] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [wsDisabled, setWsDisabled] = useState(false); // Si el WS falla (p.ej. en móvil), caemos a HTTP
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const sidebarRef = useRef<ChatSidebarRef>(null);
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const navigation = useNavigation();

  // Load session from storage on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const savedSessionId = await AsyncStorage.getItem('current_chat_session');
        if (savedSessionId && user) {
          setSessionId(savedSessionId);
          // Load history
          const history = await chatService.getHistory(savedSessionId, 50);
          if (history.length > 0) {
            const formattedMessages: Message[] = history.map((msg, idx) => ({
              id: `${idx}`,
              role: msg.role,
              content: msg.content,
              isUser: msg.role === 'user',
            }));
            setMessages(formattedMessages);
            return;
          }
        }
      } catch (error) {
        console.error('Error loading session:', error);
      }

      // Default welcome message
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: '¡Bienvenido a TAi, tu guía de viajes inteligente! 🌍✈️ Estoy aquí para ayudarte a planificar el viaje perfecto. ¿En qué te puedo ayudar hoy?',
          isUser: false,
        },
      ]);
    };

    if (user) {
      loadSession();
    }
  }, [user]);

  // Save session to storage when it changes
  useEffect(() => {
    if (sessionId) {
      AsyncStorage.setItem('current_chat_session', sessionId);
    }
  }, [sessionId]);

  // WebSocket connection (works on web, iOS, and Android)
  useEffect(() => {
    if (!user || !sessionId || wsDisabled) return;

    try {
      const connect = async () => {
        const token = await user.getIdToken();
        const websocket = chatService.connectWebSocket(user.uid, sessionId, token);

        websocket.onopen = () => {
          console.log('✅ WebSocket connected on', Platform.OS);
          setWs(websocket);
        };

        websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'typing') {
              setIsTyping(data.isTyping);
            } else if (data.response) {
              console.log('📦 Mensaje WebSocket recibido:', data);

              // Extraer contenido limpio (por si el backend devuelve objeto LangChain)
              let cleanResponse = data.response;
              if (typeof data.response === 'object' && data.response.content) {
                console.log('⚠️ WebSocket: Backend devolvió objeto LangChain, extrayendo contenido...');
                cleanResponse = data.response.content;
              }

              const assistantMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: cleanResponse,
                isUser: false,
                places: data.places || [],
                actions: data.actions || [],
                itinerary: data.itinerary || null,
              };
              setMessages(prev => [...prev, assistantMessage]);
              setIsTyping(false);
              setLoading(false);

              // Refresh automático del sidebar después de recibir mensaje por WebSocket
              setTimeout(() => {
                if (sidebarRef.current) {
                  sidebarRef.current.refresh();
                }
              }, 1000);
            }
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
            setIsTyping(false);
            setLoading(false);
          }
        };

        websocket.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          // Don't set ws to null here, let onclose handle it
        };

        websocket.onclose = (event) => {
          console.log('🔌 WebSocket disconnected. Code:', event.code, 'Reason:', event.reason);
          setWs(null);

          // Si el cierre fue anómalo, desactivamos WS para esta sesión y usamos HTTP
          if (event.code === 1006) {
            console.log('⚠️ WebSocket falló (1006). Usaremos HTTP para este chat.');
            setWsDisabled(true);
            setIsTyping(false);
            setLoading(false);
            return;
          }

          // Auto-reconnect after 3 seconds if it wasn't a normal closure
          if (event.code !== 1000 && user && sessionId) {
            console.log('🔄 Attempting to reconnect in 3 seconds...');
            setTimeout(() => {
              if (!ws || ws.readyState === WebSocket.CLOSED) {
                console.log('🔄 Reconnecting WebSocket...');
                // The useEffect will handle reconnection on next render
              }
            }, 3000);
          }
        };

        return () => {
          if (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING) {
            websocket.close(1000, 'Component unmounting');
          }
        };
      };

      connect();
    } catch (error) {
      console.error('❌ Error connecting WebSocket:', error);
      console.log('⚠️ Falling back to HTTP requests');
      setWsDisabled(true);
    }
  }, [user, sessionId, wsDisabled]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputText.trim() || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      isUser: true,
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputText;
    setInputText('');

    // Activar indicador de typing (agente está pensando)
    setIsTyping(true);
    setLoading(true);

    // If WebSocket is connected, send through it
    if (!wsDisabled && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        message: messageText,
        user_id: user.uid,
        session_id: sessionId,
      }));
      // No desactivar loading aquí, se desactivará cuando llegue la respuesta por WebSocket
      return;
    }

    // Otherwise use HTTP
    try {
      const response = await chatService.sendMessage({
        user_id: user.uid,
        session_id: sessionId,
        message: messageText,
        context: {},
      });

      console.log('📦 Respuesta del chat:', response);

      // Extraer contenido limpio (por si el backend devuelve objeto LangChain)
      let cleanResponse = response.response;
      if (typeof response.response === 'object' && response.response.content) {
        console.log('⚠️ Backend devolvió objeto LangChain, extrayendo contenido...');
        cleanResponse = response.response.content;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: cleanResponse,
        isUser: false,
        places: response.places || [],
        actions: response.actions || [],
        itinerary: response.itinerary || null,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Desactivar indicador de typing
      setIsTyping(false);

      // Guardar sesión después de recibir respuesta
      setTimeout(() => saveCurrentSession(), 500);

      // Refresh automático del sidebar (si está abierto o para la próxima vez que se abra)
      setTimeout(() => {
        if (sidebarRef.current) {
          sidebarRef.current.refresh();
        }
      }, 1000);

      // Si el itinerario fue guardado automáticamente, mostrar notificación
      if (response.saved_itinerary_id) {
        console.log('✅ Itinerario guardado automáticamente con ID:', response.saved_itinerary_id);
        Alert.alert(
          '✅ Itinerario Guardado',
          'Tu itinerario ha sido guardado automáticamente. Puedes verlo en la pestaña Home.',
          [
            { text: 'OK' },
            {
              text: 'Ver ahora',
              onPress: () => navigation.navigate('Home' as never),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('❌ Error sending message:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));

      // Intentar extraer mensaje de error útil
      let errorContent = 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.';

      if (error.response?.data?.detail) {
        errorContent = `Error del servidor: ${error.response.data.detail}`;
      } else if (error.response?.data?.message) {
        errorContent = error.response.data.message;
      } else if (error.message) {
        // Si el error contiene "Got unknown type", es un error del backend que debemos mostrar limpio
        if (error.message.includes('Got unknown type')) {
          console.error('⚠️ El backend devolvió un objeto LangChain completo en lugar de solo el texto');
          errorContent = 'Error: El servidor devolvió datos en formato incorrecto. Revisa los logs del backend.';
        } else {
          errorContent = `Error: ${error.message}`;
        }
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        isUser: false,
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  const saveCurrentSession = async () => {
    // Las sesiones ya se guardan automáticamente en el backend (Realtime Database)
    // cuando se envían mensajes. Este método queda como placeholder para futuras
    // funcionalidades o metadata adicional que queramos guardar.
    try {
      if (messages.length <= 1) return;
      // Aquí podrías agregar lógica adicional si necesitas guardar metadata extra
      console.log('Session already saved in backend:', sessionId);
    } catch (error) {
      console.error('Error in saveCurrentSession:', error);
    }
  };

  const handleSelectSession = async (selectedSessionId: string) => {
    try {
      // Guardar sesión actual antes de cambiar
      await saveCurrentSession();

      setSessionId(selectedSessionId);
      await AsyncStorage.setItem('current_chat_session', selectedSessionId);

      // Cargar historial de la sesión seleccionada
      const history = await chatService.getHistory(selectedSessionId, 50);
      if (history.length > 0) {
        const formattedMessages: Message[] = history.map((msg, idx) => ({
          id: `${idx}`,
          role: msg.role,
          content: msg.content,
          isUser: msg.role === 'user',
        }));
        setMessages(formattedMessages);
      } else {
        setMessages([
          {
            id: '1',
            role: 'assistant',
            content: '¡Bienvenido a TAi, tu guía de viajes inteligente! 🌍✈️ Estoy aquí para ayudarte a planificar el viaje perfecto. ¿En qué te puedo ayudar hoy?',
            isUser: false,
          },
        ]);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const handleNewConversation = async () => {
    // Guardar sesión actual
    await saveCurrentSession();

    const newSessionId = `session-${Date.now()}`;
    setSessionId(newSessionId);
    await AsyncStorage.setItem('current_chat_session', newSessionId);
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: '¡Bienvenido a TAi, tu guía de viajes inteligente! 🌍✈️ Estoy aquí para ayudarte a planificar el viaje perfecto. ¿En qué te puedo ayudar hoy?',
        isUser: false,
      },
    ]);
  };

  const QuickAction: React.FC<{ text: string; icon: string; onPress: () => void }> = ({
    text,
    icon,
    onPress,
  }) => (
    <AnimatedPressable style={styles.quickAction} onPress={onPress}>
      <MaterialCommunityIcons name={icon as any} size={16} color={theme.colors.primary.main} />
      <Text style={styles.quickActionText}>{text}</Text>
    </AnimatedPressable>
  );

  const PlaceCard: React.FC<{ place: any; onPress: () => void }> = ({ place, onPress }) => (
    <AnimatedPressable style={styles.placeCard} onPress={onPress}>
      <View style={styles.placeImageContainer}>
        {place.photos && place.photos[0] ? (
          <Image
            source={{ uri: place.photos[0] }}
            style={styles.placeImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeImagePlaceholder}>
            <MaterialCommunityIcons name="map-marker" size={24} color={theme.colors.text.tertiary} />
          </View>
        )}
      </View>
      <View style={styles.placeInfo}>
        <Text style={styles.placeName} numberOfLines={1}>{place.name}</Text>
        {place.rating && (
          <View style={styles.placeRating}>
            <MaterialCommunityIcons name="star" size={14} color="#f59e0b" />
            <Text style={styles.placeRatingText}>{place.rating.toFixed(1)}</Text>
          </View>
        )}
        {place.address && (
          <Text style={styles.placeAddress} numberOfLines={1}>{place.address}</Text>
        )}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.text.tertiary} />
    </AnimatedPressable>
  );

  const ActionButton: React.FC<{ action: ChatAction }> = ({ action }) => {
    const getActionIcon = (type: string) => {
      const icons: Record<string, string> = {
        view_on_map: 'map-marker',
        create_itinerary: 'calendar-plus',
        add_favorite: 'heart-outline',
        share: 'share-variant',
      };
      return icons[type] || 'information';
    };

    const getActionLabel = (type: string) => {
      const labels: Record<string, string> = {
        view_on_map: 'Ver en mapa',
        create_itinerary: 'Crear itinerario',
        add_favorite: 'Guardar',
        share: 'Compartir',
      };
      return labels[type] || type;
    };

    const handleAction = async () => {
      if (!user) return;

      try {
        switch (action.type) {
          case 'view_on_map':
            // Navigate to Search/Map screen
            navigation.navigate('Búsqueda' as never);
            break;

          case 'create_itinerary':
            // Navigate to Itinerary Builder
            navigation.navigate('Nuevo Itinerario' as never);
            break;

          case 'add_favorite':
            // Add to favorites
            if (action.data.place_id) {
              await usersService.addFavorite(user.uid, action.data.place_id);
              Alert.alert('Guardado', 'Lugar agregado a favoritos');
            }
            break;

          case 'share':
            // Share functionality
            const shareMessage = action.data.message || 'Mira esta recomendación de viaje!';
            if (Platform.OS === 'web') {
              // Copy to clipboard on web
              Alert.alert('Compartir', shareMessage);
            } else {
              await Share.share({
                message: shareMessage,
                title: 'Recomendación de TAi',
              });
            }
            break;

          default:
            console.log('Unknown action:', action.type);
        }
      } catch (error) {
        console.error('Error handling action:', error);
        Alert.alert('Error', 'No se pudo completar la acción');
      }
    };

    return (
      <AnimatedPressable style={styles.actionButton} onPress={handleAction}>
        <MaterialCommunityIcons
          name={getActionIcon(action.type) as any}
          size={16}
          color={theme.colors.primary.main}
        />
        <Text style={styles.actionButtonText}>{getActionLabel(action.type)}</Text>
      </AnimatedPressable>
    );
  };

  const handleQuickAction = (text: string) => {
    setInputText(text);
  };

  const handleSaveItinerary = async (itinerary: any, messageId: string) => {
    if (!user) return;

    try {
      console.log('💾 Guardando itinerario:', itinerary);

      // Extraer la ciudad del título del itinerario (formato: "X días en [Ciudad]")
      let city = 'Ciudad';
      if (itinerary.title) {
        const match = itinerary.title.match(/en\s+(.+)$/i);
        if (match && match[1]) {
          city = match[1].trim();
        }
      }

      // Normalizar días/actividades al formato del backend
      const daysPayload = Array.isArray(itinerary.days)
        ? itinerary.days.map((day: any, idx: number) => ({
            day: day.day ?? idx + 1,
            activities: Array.isArray(day.activities)
              ? day.activities.map((activity: any, aIdx: number) => ({
                  place_id: activity.place_id || `place_${Date.now()}_${idx}_${aIdx}`,
                  place_name: activity.place_name || 'Lugar sin nombre',
                  start: activity.start || '09:00',
                  end: activity.end || '10:00',
                  price_level: typeof activity.price_level === 'number' ? activity.price_level : 0,
                  price_display: activity.price_display || (activity.price_level ? '$'.repeat(activity.price_level) : 'Gratis'),
                  notes: activity.notes || '',
                }))
              : [],
          }))
        : [];

      const startDate =
        itinerary.start_date ||
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // fallback: mañana

      // Guardar en el backend
      const savedItinerary = await itinerariesService.create(user.uid, {
        title: itinerary.title || 'Itinerario sin título',
        city,
        days: daysPayload,
        start_date: startDate,
        reasoning: itinerary.reasoning,
      });

      Alert.alert(
        '✅ Itinerario guardado',
        'Tu itinerario ha sido guardado exitosamente. Puedes verlo en la pestaña Home.',
        [
          { text: 'OK' },
          {
            text: 'Ver itinerario',
            onPress: () => navigation.navigate('Home' as never),
          },
        ]
      );

      console.log('✅ Itinerario guardado exitosamente:', savedItinerary);
    } catch (error) {
      console.error('❌ Error guardando itinerario:', error);
      Alert.alert('Error', 'No se pudo guardar el itinerario. Intenta nuevamente.');
    }
  };

  const ItineraryCard: React.FC<{ itinerary: any; messageId: string }> = ({ itinerary, messageId }) => (
    <View style={styles.itineraryCard}>
      <View style={styles.itineraryHeader}>
        <MaterialCommunityIcons name="map-marker-path" size={20} color={theme.colors.primary.main} />
        <Text style={styles.itineraryTitle}>{itinerary.title || 'Itinerario generado'}</Text>
      </View>
      <Text style={styles.itinerarySubtitle}>
        {itinerary.days?.length || 0} días • Generado por IA
      </Text>
      <AnimatedPressable
        style={styles.saveItineraryButton}
        onPress={() => handleSaveItinerary(itinerary, messageId)}
      >
        <MaterialCommunityIcons name="content-save" size={18} color="#fff" />
        <Text style={styles.saveItineraryButtonText}>Guardar itinerario</Text>
      </AnimatedPressable>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.loginText}>Inicia sesión para usar el chat</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={90}
      >
        {/* Chat Sidebar */}
        <ChatSidebar
          ref={sidebarRef}
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
          currentSessionId={sessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewConversation}
        />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <AnimatedPressable
              style={styles.menuButton}
              onPress={() => setSidebarVisible(true)}
            >
              <MaterialCommunityIcons
                name="menu"
                size={24}
                color={theme.colors.primary.main}
              />
            </AnimatedPressable>
            <View style={styles.headerContent}>
              <MaterialCommunityIcons
                name="robot"
                size={24}
                color={theme.colors.primary.main}
              />
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Asistente de Viajes IA</Text>
                <Text style={styles.headerSubtitle}>
                  {ws ? '🟢 Conectado' : 'Pregúntame lo que quieras'}
                </Text>
              </View>
            </View>
          </View>
          <AnimatedPressable
            style={styles.newChatButton}
            onPress={handleNewConversation}
          >
            <MaterialCommunityIcons
              name="message-plus"
              size={20}
              color={theme.colors.primary.main}
            />
          </AnimatedPressable>
        </View>

        {/* Quick Actions */}
        {messages.length === 1 && (
          <View style={styles.quickActionsContainer}>
            <Text style={styles.quickActionsTitle}>Sugerencias rápidas:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <QuickAction
                text="¿Qué lugares me recomiendas?"
                icon="compass"
                onPress={() => handleQuickAction('¿Qué lugares me recomiendas en Santiago?')}
              />
              <QuickAction
                text="Crea un itinerario"
                icon="calendar-check"
                onPress={() => handleQuickAction('Crea un itinerario de 3 días en Santiago')}
              />
              <QuickAction
                text="Lugares para comer"
                icon="silverware-fork-knife"
                onPress={() => handleQuickAction('¿Dónde puedo comer comida típica chilena?')}
              />
              <QuickAction
                text="Actividades gratis"
                icon="star-outline"
                onPress={() => handleQuickAction('¿Qué actividades gratuitas me recomiendas?')}
              />
            </ScrollView>
          </View>
        )}

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <View key={message.id}>
              <View
                style={[
                  styles.messageBubble,
                  message.isUser ? styles.userMessage : styles.assistantMessage,
                ]}
              >
                {!message.isUser && (
                  <View style={styles.assistantAvatar}>
                    <MaterialCommunityIcons
                      name="robot"
                      size={16}
                      color={theme.colors.primary.main}
                    />
                  </View>
                )}
                <View
                  style={[
                    styles.messageContent,
                    message.isUser ? styles.userMessageContent : styles.assistantMessageContent,
                  ]}
                >
                  {message.isUser ? (
                    <Text
                      style={[
                        styles.messageText,
                        styles.userMessageText,
                      ]}
                    >
                      {message.content}
                    </Text>
                  ) : (
                    <SafeMarkdown
                      content={message.content}
                      style={markdownStyles}
                    />
                  )}
                </View>
              </View>

              {/* Places */}
              {!message.isUser && message.places && message.places.length > 0 && (
                <View style={styles.placesContainer}>
                  <Text style={styles.placesTitle}>📍 Lugares recomendados:</Text>
                  {message.places.map((place, index) => (
                    <PlaceCard
                      key={index}
                      place={place}
                      onPress={() => console.log('Place pressed:', place)}
                    />
                  ))}
                </View>
              )}

              {/* Itinerary */}
              {!message.isUser && message.itinerary && (
                <View style={styles.itineraryContainer}>
                  <ItineraryVisualCard itinerary={message.itinerary} />
                </View>
              )}

              {/* Actions */}
              {!message.isUser && message.actions && message.actions.length > 0 && (
                <View style={styles.actionsContainer}>
                  {message.actions.map((action, index) => (
                    <ActionButton key={index} action={action} />
                  ))}
                </View>
              )}
            </View>
          ))}

          {(loading || isTyping) && (
            <View style={[styles.messageBubble, styles.assistantMessage]}>
              <View style={styles.assistantAvatar}>
                <MaterialCommunityIcons
                  name="robot"
                  size={16}
                  color={theme.colors.primary.main}
                />
              </View>
              <View style={[styles.messageContent, styles.assistantMessageContent]}>
                <TypingDots />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={theme.colors.text.tertiary}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            multiline
            maxLength={500}
            editable={!loading}
          />
          <AnimatedPressable
            style={[
              styles.sendButton,
              (!inputText.trim() || loading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || loading}
          >
            <MaterialCommunityIcons
              name="send"
              size={20}
              color={
                !inputText.trim() || loading
                  ? theme.colors.text.tertiary
                  : theme.colors.text.inverse
              }
            />
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Markdown styles for AI assistant messages
const markdownStyles = {
  body: {
    color: theme.colors.text.primary,
    fontSize: 14,
    lineHeight: 20,
  },
  heading1: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: theme.colors.text.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  heading2: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: theme.colors.text.primary,
    marginTop: 10,
    marginBottom: 6,
  },
  heading3: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.text.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text.primary,
  },
  strong: {
    fontWeight: '700' as const,
    color: theme.colors.text.primary,
  },
  em: {
    fontStyle: 'italic' as const,
  },
  link: {
    color: theme.colors.primary.main,
    textDecorationLine: 'underline' as const,
  },
  bullet_list: {
    marginTop: 4,
    marginBottom: 8,
  },
  ordered_list: {
    marginTop: 4,
    marginBottom: 8,
  },
  list_item: {
    marginTop: 2,
    marginBottom: 2,
    flexDirection: 'row' as const,
  },
  bullet_list_icon: {
    marginLeft: 0,
    marginRight: 8,
    ...Platform.select({
      web: { lineHeight: 20 },
      default: {},
    }),
  },
  bullet_list_content: {
    flex: 1,
  },
  code_inline: {
    backgroundColor: theme.colors.background.secondary,
    color: theme.colors.primary.main,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 13,
  },
  code_block: {
    backgroundColor: theme.colors.background.secondary,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary.main,
  },
  fence: {
    backgroundColor: theme.colors.background.secondary,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary.main,
  },
  blockquote: {
    backgroundColor: theme.colors.background.secondary,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary.main,
    marginTop: 8,
    marginBottom: 8,
  },
  hr: {
    backgroundColor: theme.colors.border.primary,
    height: 1,
    marginTop: 12,
    marginBottom: 12,
  },
  table: {
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
    overflow: 'hidden' as const,
  },
  thead: {
    backgroundColor: theme.colors.background.secondary,
  },
  tbody: {
    backgroundColor: theme.colors.surface.primary,
  },
  th: {
    padding: 8,
    fontWeight: '600' as const,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border.primary,
    fontSize: 13,
  },
  tr: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.secondary,
  },
  td: {
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border.secondary,
    fontSize: 13,
    flex: 1,
  },
  // Elementos adicionales que pueden aparecer
  text: {
    color: theme.colors.text.primary,
    fontSize: 14,
  },
  textgroup: {
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  hardbreak: {
    height: 1,
  },
  softbreak: {},
  pre: {
    backgroundColor: theme.colors.background.secondary,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  inline: {
    fontSize: 14,
  },
  span: {
    fontSize: 14,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  loginText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: theme.spacing.xxxl,
  },
  header: {
    backgroundColor: theme.colors.surface.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.secondary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  newChatButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  quickActionsContainer: {
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.secondary,
  },
  quickActionsTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text.secondary,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.full,
    marginLeft: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  quickActionText: {
    fontSize: 12,
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.xs,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: theme.spacing.lg,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  assistantMessage: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  messageContent: {
    maxWidth: '75%',
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  userMessageContent: {
    backgroundColor: theme.colors.primary.main,
    borderBottomRightRadius: theme.radius.xs,
  },
  assistantMessageContent: {
    backgroundColor: theme.colors.surface.primary,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderBottomLeftRadius: theme.radius.xs,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: theme.colors.text.inverse,
  },
  assistantMessageText: {
    color: theme.colors.text.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    paddingBottom: Platform.OS === 'ios' ? theme.spacing.md : theme.spacing.lg,
    backgroundColor: theme.colors.surface.primary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.secondary,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingTop: Platform.OS === 'ios' ? theme.spacing.sm : theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.text.primary,
    maxHeight: 100,
    marginRight: theme.spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.background.tertiary,
  },
  placesContainer: {
    marginLeft: 44,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  placesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface.primary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  placeImageContainer: {
    width: 50,
    height: 50,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    marginRight: theme.spacing.sm,
  },
  placeImage: {
    width: '100%',
    height: '100%',
  },
  placeImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  placeRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  placeRatingText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginLeft: 4,
  },
  placeAddress: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: 44,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[50],
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary.main,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.primary.main,
    marginLeft: 4,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  typingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary.main,
  },
  itineraryContainer: {
    marginLeft: 44,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  itineraryCard: {
    backgroundColor: theme.colors.surface.primary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary.main,
    borderLeftWidth: 4,
  },
  itineraryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  itineraryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  itinerarySubtitle: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  saveItineraryButton: {
    backgroundColor: theme.colors.primary.main,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    gap: theme.spacing.xs,
  },
  saveItineraryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  // Estilos para el componente visual de itinerario JSON
  itineraryVisualCard: {
    backgroundColor: theme.colors.surface.primary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    marginTop: theme.spacing.xs,
  },
  itineraryVisualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary.main,
  },
  itineraryVisualTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  dayCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
  },
  dayHeader: {
    marginBottom: theme.spacing.sm,
  },
  dayBadge: {
    backgroundColor: theme.colors.primary.main,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.full,
    alignSelf: 'flex-start',
  },
  dayBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  activityCard: {
    backgroundColor: theme.colors.surface.primary,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary.main,
  },
  activityTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  activityTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary.main,
    marginLeft: 4,
  },
  activityContent: {
    marginLeft: 20,
  },
  activityName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  activityNotes: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
    lineHeight: 18,
  },
  activityMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: 4,
  },
  activityMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.tertiary,
    paddingVertical: 2,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.radius.xs,
  },
  activityMetaText: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    marginLeft: 2,
  },
  itineraryReasoning: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary[50],
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary.main,
  },
  itineraryReasoningText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.xs,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});

export default ChatScreen;
