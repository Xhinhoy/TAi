from langchain_groq import ChatGroq
from langchain.agents import initialize_agent, AgentType
from langchain.memory import ConversationBufferMemory
from langchain.agents import AgentExecutor, create_react_agent
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import SystemMessage, HumanMessage
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

MAX_MEMORY_MESSAGES = 50

class TravelAgent:
    """Agente de viajes inteligente con Groq LLM"""

    def __init__(self, user_profile: dict):
        self.user_profile = user_profile

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
            return_messages=True,
            max_token_limit=MAX_MEMORY_MESSAGES
        )

    def _initialize_tools(self):
        """Inicializa las herramientas del agente"""
        return [
            SearchPlacesTool(),
            GetPlaceDetailsTool(),
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
        try:
            # 🔹 Serializa y escapa el perfil del usuario
            profile_str = json.dumps(self.user_profile, indent=2)
            profile_str = profile_str.replace("{", "{{").replace("}", "}}")

            # 🔹 Prompt del sistema mejorado para ReAct
            system_prompt = f"""
            Eres un agente de viajes inteligente llamado TAi. 
            Tu función es ayudar al usuario a planificar viajes, recomendar lugares y crear itinerarios personalizados.
            Tienes acceso a las siguientes herramientas:
            - search_places
            - get_place_details
            - filter_by_interests
            - optimize_route

            Usa el formato de razonamiento ReAct ESTRICTAMENTE:
            Thought: (explica tu razonamiento)
            Action: (nombre exacto de la herramienta a usar, por ejemplo search_places)
            Action Input: (argumento o texto que enviarás a la herramienta, en formato JSON si es necesario)
            Observation: (resultado devuelto por la herramienta)
            ... repite Thought/Action/Action Input/Observation hasta que tengas suficiente información ...
            Final Answer: (tu respuesta final y completa para el usuario)

            Ejemplo:
            Thought: El usuario quiere museos en Santiago.
            Action: search_places
            Action Input: "museos en Santiago"
            Observation: Museo de Bellas Artes, Museo de Arte Contemporáneo.
            Final Answer: Te recomiendo visitar el Museo de Bellas Artes y el Museo de Arte Contemporáneo en Santiago.

            Perfil actual del usuario:
            {profile_str}

            Responde SIEMPRE siguiendo el formato indicado, sin saltarte las etiquetas.
            """

            logger.info(f"Chat con Groq ({settings.GROQ_MODEL})...")

            # 🔹 Construye el prompt con soporte a memoria y scratchpad
            prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt),
                MessagesPlaceholder(variable_name="chat_history"),
                ("system", "Herramientas disponibles:\n{tools}\nPuedes usarlas llamándolas según corresponda."),
                ("system", "Lista de nombres de herramientas:\n{tool_names}"),
                ("human", "{input}"),
                ("system", "Razonamiento previo:\n{agent_scratchpad}")
            ])

            # 🔹 Crea el agente compatible con herramientas
            react_agent = create_react_agent(self.llm, self.tools, prompt)

            # 🔹 Executor con memoria y control
            executor = AgentExecutor(
                agent=react_agent,
                tools=self.tools,
                verbose=True,
                memory=self.memory,
                handle_parsing_errors=True,
                max_iterations=4,  # sigue igual
                early_stopping_method="force"  # ✅ fuerza salida limpia
            )

            # 🔹 Ejecución moderna
            response = await executor.ainvoke({"input": message})
            final_text = response.get("output", "").strip()

            #  Limpieza del texto final (soporta o no "Final Answer:")
            if "Final Answer:" in final_text:
                final_text = final_text.split("Final Answer:")[-1].strip()

            #  Detección de lugares con estrellas o resultados
            if "Encontré algunos lugares" in final_text or "⭐" in final_text:
                return {
                    "response": final_text,
                    "actions": ["search_places"],
                    "places": self._extract_places_from_text(final_text)
                }

            #  Si el agente no llegó a una respuesta final, intentamos rescatar los lugares del último resultado
            if not final_text or "agent stopped" in final_text.lower():
                # Buscar lugares en caché o dentro del texto de ejecución
                extracted_places = self._extract_places_from_text(final_text)
                
                # Si no se extrajeron, buscar en memoria del agente (últimos mensajes)
                if not extracted_places and hasattr(self.memory, "chat_memory"):
                    for msg in reversed(self.memory.chat_memory.messages):
                        if isinstance(msg.content, str) and "Encontré algunos lugares" in msg.content:
                            extracted_places = self._extract_places_from_text(msg.content)
                            break

                # Tomar los primeros 2 lugares válidos
                if extracted_places:
                    top_places = [p["name"] for p in extracted_places[:2]]
                    place_list = " y ".join(top_places)
                    final_text = (
                        f"Encontré algunos lugares interesantes como {place_list}. "
                        "¿Quieres que te prepare un itinerario con ellos?"
                    )
                else:
                    final_text = (
                        "No logré obtener los lugares exactos, pero puedo buscar opciones cercanas. "
                        "¿Quieres que te recomiende algunos?"
                    )
            # ✅ Si llegó hasta aquí, devolvemos una respuesta segura
            return {
                "response": final_text or "No tengo información disponible en este momento.",
                "actions": [],
                "places": self._extract_places_from_text(final_text) or []
            }
        
        except Exception as e:
            logger.error(f"Error en chat: {str(e)}")
            return {
                "response": f"Lo siento, ocurrió un error: {str(e)}",
                "actions": [],
                "places": []
            }
        
    def _extract_places_from_text(self, text: str) -> list[dict]:
        """Extrae nombres y direcciones de lugares desde el texto del bot"""
        places = []
        for line in text.split("\n"):
            if line.strip().startswith(tuple(str(i) + "." for i in range(1, 10))):
                parts = line.split("—")
                if len(parts) >= 2:
                    name = parts[0].split(".")[1].strip()
                    address = parts[1].strip()
                    places.append({"name": name, "address": address})
        return places
