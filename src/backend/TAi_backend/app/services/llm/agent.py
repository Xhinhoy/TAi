from langchain_groq import ChatGroq
from langchain.agents import initialize_agent, AgentType
from langchain.memory import ConversationBufferMemory
from app.core.config import settings
from .tools import (
    SearchPlacesTool,
    GetPlaceDetailsTool,
    GetReviewsTool,
    FilterPlacesByInterestsTool,
    OptimizeRouteTool
)
from .prompts import TRAVEL_AGENT_SYSTEM_PROMPT, RECOMMENDATION_PROMPT, ITINERARY_PROMPT
import json
import logging

logger = logging.getLogger(__name__)

class TravelAgent:
    """Agente de viajes inteligente con Groq LLM"""
    
    def __init__(self, user_profile: dict):
        self.user_profile = user_profile
        
        # Usar solo Groq
        self.llm = ChatGroq(
            model=settings.GROQ_MODEL,
            groq_api_key=settings.GROQ_API_KEY, # type: ignore
            temperature=settings.GROQ_TEMPERATURE,
            max_tokens=settings.GROQ_MAX_TOKENS
        )
        
        logger.info(f"Agente inicializado con Groq model: {settings.GROQ_MODEL}")
        
        self.tools = self._initialize_tools()
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )
    
    def _initialize_tools(self):
        """Inicializa las herramientas del agente"""
        return [
            SearchPlacesTool(),
            GetPlaceDetailsTool(),
            GetReviewsTool(),
            FilterPlacesByInterestsTool(),
            OptimizeRouteTool()
        ]
    
    async def generate_recommendations(self, location: dict, limit: int = 10) -> dict:
        """Genera recomendaciones personalizadas"""
        try:
            interests_str = ', '.join(self.user_profile.get('interests', []))
            budget = self.user_profile.get('preferences', {}).get('budget', 'no especificado')
            travel_style = self.user_profile.get('preferences', {}).get('travel_style', 'standard')
            
            prompt = RECOMMENDATION_PROMPT.format(
                limit=limit,
                interests=interests_str,
                location=location.get('city', 'ubicación actual'),
                budget=budget,
                travel_style=travel_style
            )
            
            logger.info(f"Generando recomendaciones con Groq ({settings.GROQ_MODEL})...")
            
            response = await self.llm.ainvoke(prompt)
            
            try:
                result = json.loads(response.content) # type: ignore
                return result
            except json.JSONDecodeError:
                logger.warning("Respuesta no es JSON válido")
                return {
                    'recommendations': [],
                    'reasoning': response.content
                }
                
        except Exception as e:
            logger.error(f"Error generando recomendaciones: {str(e)}")
            return {
                'recommendations': [],
                'reasoning': f'Error: {str(e)}'
            }
    
    async def generate_itinerary(self, city: str, days: int) -> dict:
        """Genera un itinerario completo"""
        try:
            interests_str = ', '.join(self.user_profile.get('interests', []))
            budget = self.user_profile.get('preferences', {}).get('budget', 'no especificado')
            travel_style = self.user_profile.get('preferences', {}).get('travel_style', 'standard')
            
            prompt = ITINERARY_PROMPT.format(
                days=days,
                city=city,
                interests=interests_str,
                budget=budget,
                travel_style=travel_style
            )
            
            logger.info(f"Generando itinerario con Groq ({settings.GROQ_MODEL})...")
            
            response = await self.llm.ainvoke(prompt)
            
            try:
                result = json.loads(response.content) # type: ignore
                return result
            except json.JSONDecodeError:
                logger.warning("Respuesta no es JSON válido")
                return {
                    'title': f'Itinerario {days} días en {city}',
                    'days': [],
                    'reasoning': response.content
                }
                
        except Exception as e:
            logger.error(f"Error generando itinerario: {str(e)}")
            return {
                'title': 'Error',
                'days': [],
                'reasoning': f'Error: {str(e)}'
            }
    
    async def chat(self, message: str) -> dict:
        """Conversación natural con el agente"""
        try:
            # Obtener historial de conversación
            history = self.memory.load_memory_variables({})
            history_text = ""
            if history.get('chat_history'):
                history_text = "\n".join([f"{msg.type}: {msg.content}" for msg in history['chat_history'][-5:]])

            # Crear prompt con contexto del usuario
            interests_str = ', '.join(self.user_profile.get('interests', ['turismo', 'cultura']))
            budget = self.user_profile.get('budget', 'medium')

            system_prompt = f"""Eres un asistente experto en viajes y turismo en Chile.

Perfil del usuario:
- Intereses: {interests_str}
- Presupuesto: {budget}

Tu trabajo es:
1. Recomendar lugares turísticos reales en Chile (especialmente Santiago y Providencia)
2. Sugerir actividades según los intereses del usuario
3. Dar consejos prácticos sobre transporte, horarios, costos
4. Ser amigable, informativo y preciso

Historial reciente:
{history_text}

Responde de forma conversacional y útil."""

            full_prompt = f"{system_prompt}\n\nUsuario: {message}\n\nAsistente:"

            logger.info(f"💬 Chat con Groq ({settings.GROQ_MODEL})...")

            # Usar el LLM directamente (sin agent/tools para evitar errores)
            response = await self.llm.ainvoke(full_prompt)
            response_text = response.content if hasattr(response, 'content') else str(response)

            # Guardar en memoria
            from langchain.schema import HumanMessage, AIMessage
            self.memory.chat_memory.add_message(HumanMessage(content=message))
            self.memory.chat_memory.add_message(AIMessage(content=response_text))

            logger.info(f"✅ Respuesta generada: {len(response_text)} caracteres")

            return {
                'response': response_text,
                'actions': [],
                'places': []
            }

        except Exception as e:
            logger.error(f"❌ Error en chat: {str(e)}", exc_info=True)
            return {
                'response': f'Lo siento, hubo un error procesando tu mensaje. Por favor, intenta reformular tu pregunta.',
                'actions': [],
                'places': []
            }