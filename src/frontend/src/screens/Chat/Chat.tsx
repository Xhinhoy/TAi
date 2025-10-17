import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { chatService, ChatMessage } from '../../api/services';
import { useAuth } from '../../hooks/useAuth';
import { usePreferences } from '../../contexts/PreferencesContext';

interface Message extends ChatMessage {
  id: string;
  isUser: boolean;
}

const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const scrollViewRef = useRef<ScrollView>(null);
  const { user } = useAuth();
  const { preferences } = usePreferences();

  useEffect(() => {
    // Initial welcome message
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: '¡Hola! Soy tu asistente de viajes con IA. ¿En qué puedo ayudarte hoy?',
        isUser: false,
      },
    ]);
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSend = async () => {
  if (!inputText.trim() || !user) return;

  const userMessage: Message = {
    id: Date.now().toString(),
    role: 'user',
    content: inputText,
    isUser: true,
  };

  setMessages(prev => [...prev, userMessage]);
  setInputText('');
  setLoading(true);

  try {
    const response = await chatService.sendMessage({
      user_id: user.uid,
      session_id: conversationId ?? 'default',
      message: inputText ?? '',
      context: {},
    });

    // --- Mensaje principal del asistente ---
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response.response
        ? response.response
        : 'No se obtuvo respuesta del asistente.',
      isUser: false,
    };
    setMessages(prev => [...prev, assistantMessage]);

    // --- Mostrar lugares sugeridos ---
    if (Array.isArray(response.places) && response.places.length > 0) {
      const formatted = response.places
        .map(
          (p, i) =>
            `${i + 1}. ${p.name}${p.rating ? ` (⭐ ${p.rating})` : ''}${
              p.address ? ` — ${p.address}` : ''
            }`
        )
        .join('\n');

      const placesMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `Estos son algunos lugares que encontré:\n${formatted}`,
        isUser: false,
      };
      setMessages(prev => [...prev, placesMessage]);
    }

    // --- Guardar ID de conversación si existe ---
    if (response.conversation_id) {
      setConversationId(response.conversation_id);
    }

    // --- Mostrar sugerencias adicionales si existen ---
    if (response.suggestions && response.suggestions.length > 0) {
      const suggestionsMessage: Message = {
        id: (Date.now() + 3).toString(),
        role: 'assistant',
        content: `Algunas sugerencias:\n${response.suggestions
          .map((s, i) => `${i + 1}. ${s}`)
          .join('\n')}`,
        isUser: false,
      };
      setMessages(prev => [...prev, suggestionsMessage]);
    }
  } catch (error) {
    console.error('Error sending message:', error);

    const errorMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content:
        'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.',
      isUser: false,
    };

    setMessages(prev => [...prev, errorMessage]);
  } finally {
    setLoading(false);
  }
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

  const handleQuickAction = (text: string) => {
    setInputText(text);
  };

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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <MaterialCommunityIcons
              name="robot"
              size={24}
              color={theme.colors.primary.main}
            />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Asistente de Viajes IA</Text>
              <Text style={styles.headerSubtitle}>Pregúntame lo que quieras</Text>
            </View>
          </View>
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
            <View
              key={message.id}
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
                <Text
                  style={[
                    styles.messageText,
                    message.isUser ? styles.userMessageText : styles.assistantMessageText,
                  ]}
                >
                  {message.content}
                </Text>
              </View>
            </View>
          ))}

          {loading && (
            <View style={[styles.messageBubble, styles.assistantMessage]}>
              <View style={styles.assistantAvatar}>
                <MaterialCommunityIcons
                  name="robot"
                  size={16}
                  color={theme.colors.primary.main}
                />
              </View>
              <View style={[styles.messageContent, styles.assistantMessageContent]}>
                <ActivityIndicator size="small" color={theme.colors.primary.main} />
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
  },
  headerContent: {
    flexDirection: 'row',
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
});

export default ChatScreen;
