from langchain_groq import ChatGroq
from langchain.agents import initialize_agent, AgentType
from langchain.memory import ConversationBufferMemory
from app.core.config import settings
from .tools import (
    SearchPlacesTool,
    GetPlaceDetailsTool,
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
            groq_api_key=settings.GROQ_API_KEY,
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
                result = json.loads(response.content)
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
                result = json.loads(response.content)
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
            system_prompt = TRAVEL_AGENT_SYSTEM_PROMPT.format(
                user_profile=json.dumps(self.user_profile, indent=2)
            )
            
            logger.info(f"Chat con Groq ({settings.GROQ_MODEL})...")
            
            agent = initialize_agent(
                tools=self.tools,
                llm=self.llm,
                agent=AgentType.CHAT_CONVERSATIONAL_REACT_DESCRIPTION,
                memory=self.memory,
                verbose=True,
                handle_parsing_errors=True,
                max_iterations=3
            )
            
            full_prompt = f"{system_prompt}\n\nUsuario: {message}"
            response = await agent.arun(full_prompt)
            
            return {
                'response': response,
                'actions': [],
                'places': []
            }
            
        except Exception as e:
            logger.error(f"Error en chat: {str(e)}")
            return {
                'response': f'Lo siento, hubo un error: {str(e)}',
                'actions': [],
                'places': []
            }