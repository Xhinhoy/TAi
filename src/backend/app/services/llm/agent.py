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
            No repitas la misma herramienta más de una vez seguida y no vuelvas a usar una herramienta si ya obtuviste resultados válidos.
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

            # 🚫 Evitar repeticiones innecesarias de la misma herramienta
            # Este wrapper intercepta llamadas duplicadas consecutivas del mismo tipo
            last_action = {"tool": None}

            async def limited_invoke(input_data):
                nonlocal last_action
                if "Action:" in input_data.get("input", ""):
                    current_tool = None
                    for tool in ["search_places", "filter_by_interests", "get_place_details", "optimize_route"]:
                        if tool in input_data["input"]:
                            current_tool = tool
                            break
                    if current_tool == last_action["tool"]:
                        logger.warning(f"🛑 Repetición evitada de herramienta: {current_tool}")
                        return {"output": "Agent stopped: repeated tool usage prevented."}
                    last_action["tool"] = current_tool
                return await executor.ainvoke(input_data)

            # 🔹 Executor con memoria y control
            executor = AgentExecutor(
                agent=react_agent,
                tools=self.tools,
                verbose=True,
                memory=self.memory,
                handle_parsing_errors=True,
                max_iterations=3,
                early_stopping_method="force"
            )
            # 🧠 Preprocesamiento adicional antes de ejecutar
            # Si el mensaje del usuario menciona "lugares" o "recomiendas", el agente se prepara para devolver JSON limpio
            if any(keyword in message.lower() for keyword in ["lugar", "recomienda", "recomendación"]):
                message = (
                    f"{message.strip()}\n\n"
                    "IMPORTANTE: Cuando devuelvas los resultados de 'search_places', "
                    "usa formato JSON con la estructura exacta:\n"
                    "[{'name': 'Nombre', 'address': 'Dirección', 'rating': 4.5}].\n"
                    "Evita listas numeradas o texto plano. Esto permitirá usar 'filter_by_interests' correctamente."
                )

            # 🔹 Ejecuta el flujo ReAct
            response = await limited_invoke({"input": message})
            final_text = response.get("output", "").strip()
                        # 🔍 Interceptar JSON_RESULT si el modelo lo generó dentro del texto
            if "JSON_RESULT=" in final_text:
                try:
                    json_part = final_text.split("JSON_RESULT=")[-1].strip()
                    if json_part.startswith("[") and "]" in json_part:
                        json_data = json_part.split("]")[0] + "]"
                        places_json = json.loads(json_data)

                        # 🔹 Filtrar los lugares por intereses del usuario
                        from app.services.llm.tools import FilterPlacesByInterestsTool
                        filter_tool = FilterPlacesByInterestsTool()
                        filtered_json = filter_tool._run(
                            input={
                                "places": places_json,
                                "interests": self.user_profile.get("interests", ["museos", "parques", "monumentos"])
                            }
                        )

                        filtered_places = json.loads(filtered_json)

                        # 🔹 Preparar texto final para el usuario
                        if filtered_places:
                            top_places = [p["name"] for p in filtered_places[:2]]
                            place_list = " y ".join(top_places)
                            final_text = (
                                f"Te recomiendo visitar {place_list}. "
                                "¿Quieres que te prepare un itinerario con ellos?"
                            )
                        else:
                            top_places = [p["name"] for p in places_json[:2]]
                            place_list = " y ".join(top_places)
                            final_text = (
                                f"Encontré algunos lugares interesantes como {place_list}. "
                                "¿Quieres que te prepare un itinerario con ellos?"
                            )

                        return {
                            "response": final_text,
                            "actions": ["search_places", "filter_by_interests"],
                            "places": filtered_places or places_json
                        }

                except Exception as e:
                    logger.warning(f"Error procesando JSON_RESULT inline: {e}")
            # ✅ Procesamiento inline de JSON_RESULT detectado en la salida
            if "JSON_RESULT=" in final_text:
                try:
                    json_part = final_text.split("JSON_RESULT=")[-1].strip()
                    if json_part.startswith("[") and "]" in json_part:
                        json_data = json_part.split("]")[0] + "]"
                        places_json = json.loads(json_data)

                        from app.services.llm.tools import FilterPlacesByInterestsTool
                        filter_tool = FilterPlacesByInterestsTool()
                        filtered_json = filter_tool._run(
                            input={
                                "places": places_json,
                                "interests": self.user_profile.get("interests", ["museos", "parques", "monumentos"])
                            }
                        )

                        filtered_places = json.loads(filtered_json)

                        if filtered_places:
                            top_places = [p["name"] for p in filtered_places[:2]]
                            place_list = " y ".join(top_places)
                            final_text = (
                                f"Te recomiendo visitar {place_list}. "
                                "¿Quieres que te prepare un itinerario con ellos?"
                            )
                        else:
                            top_places = [p["name"] for p in places_json[:2]]
                            place_list = " y ".join(top_places)
                            final_text = (
                                f"Encontré algunos lugares interesantes como {place_list}. "
                                "¿Quieres que te prepare un itinerario con ellos?"
                            )

                        return {
                            "response": final_text,
                            "actions": ["search_places", "filter_by_interests"],
                            "places": filtered_places or places_json
                        }

                except Exception as e:
                    logger.warning(f"Error procesando JSON_RESULT inline: {e}")

            # ⚙️ Si el agente se detuvo sin "Final Answer", rescatar lugares del texto
                        # ⚙️ Si el agente se detuvo sin "Final Answer", intentar rescatar lugares del texto o JSON embebido
            if "Agent stopped" in final_text or not final_text:
                extracted_places = self._extract_places_from_text(str(response))

                # 🧩 Si existe JSON_RESULT, procesarlo directamente
                if "JSON_RESULT=" in str(response):
                    try:
                        json_data = str(response).split("JSON_RESULT=")[-1].strip()
                        if json_data.endswith("]") or json_data.endswith("}"):
                            places_json = json.loads(json_data.split("JSON_RESULT=")[-1])
                            # 🔹 Llamar automáticamente al filtro por intereses
                            from app.services.llm.tools import FilterPlacesByInterestsTool
                            filter_tool = FilterPlacesByInterestsTool()
                            filtered_json = filter_tool._run(
                                input={
                                    "places": places_json,
                                    "interests": self.user_profile.get("interests", ["museos", "parques", "monumentos"])
                                }
                            )
                            filtered_places = json.loads(filtered_json)
                            if filtered_places:
                                top_places = [p["name"] for p in filtered_places[:2]]
                                place_list = " y ".join(top_places)
                                final_text = (
                                    f"Te recomiendo visitar {place_list}. "
                                    "¿Quieres que te prepare un itinerario con ellos?"
                                )
                                return {
                                    "response": final_text,
                                    "actions": ["search_places", "filter_by_interests"],
                                    "places": filtered_places
                                }
                    except Exception as e:
                        logger.warning(f"Error procesando JSON_RESULT: {e}")

                # 🔹 Si no hay JSON, usa la extracción por texto
                if extracted_places:
                    top_places = [p["name"] for p in extracted_places[:2]]
                    place_list = " y ".join(top_places)
                    final_text = (
                        f"Encontré algunos lugares interesantes como {place_list}. "
                        "¿Quieres que te prepare un itinerario con ellos?"
                    )
                else:
                    final_text = (
                        "Parece que no logré completar la búsqueda, pero puedo ofrecerte nuevas recomendaciones. "
                        "¿Quieres que lo intente nuevamente?"
                    )

            # ✅ Limpieza del texto final
            if "Final Answer:" in final_text:
                final_text = final_text.split("Final Answer:")[-1].strip()

            # ✅ Detecta lugares con estrellas o listado
            if "Encontré algunos lugares" in final_text or "⭐" in final_text:
                return {
                    "response": final_text,
                    "actions": ["search_places"],
                    "places": self._extract_places_from_text(final_text)
                }

            # 🧩 Si el agente no llegó a una respuesta final, intenta recuperar los lugares
            extracted_places = self._extract_places_from_text(final_text)

            if not extracted_places and hasattr(self.memory, "chat_memory"):
                for msg in reversed(self.memory.chat_memory.messages):
                    if isinstance(msg.content, str) and "Encontré algunos lugares" in msg.content:
                        extracted_places = self._extract_places_from_text(msg.content)
                        break

            # ✅ Si hay lugares, genera una respuesta amigable con los dos primeros
            if extracted_places:
                top_places = [p["name"] for p in extracted_places[:2]]
                place_list = " y ".join(top_places)
                final_text = (
                    f"Encontré algunos lugares interesantes como {place_list}. "
                    "¿Quieres que te prepare un itinerario con ellos?"
                )

                        # ✅ Si llegamos aquí y hay JSON_RESULT en el texto, procesarlo automáticamente
                        # ✅ Detección automática del JSON_RESULT (sin depender del modelo)
            if "JSON_RESULT=" in str(response) or "JSON_RESULT=" in final_text:
                try:
                    raw_text = str(response) if "JSON_RESULT=" in str(response) else final_text
                    json_part = raw_text.split("JSON_RESULT=")[-1].strip()

                    # Extraer JSON limpio
                    if json_part.startswith("[") and "]" in json_part:
                        json_data = json_part.split("]")[0] + "]"
                        places_json = json.loads(json_data)

                        # 🔹 Ejecutar el filtrado localmente (bypass del LLM)
                        from app.services.llm.tools import FilterPlacesByInterestsTool
                        filter_tool = FilterPlacesByInterestsTool()
                        filtered_json = filter_tool._run(
                            input={
                                "places": places_json,
                                "interests": self.user_profile.get("interests", ["museos", "parques", "monumentos"])
                            }
                        )

                        filtered_places = json.loads(filtered_json)

                        if filtered_places:
                            top_places = [p["name"] for p in filtered_places[:2]]
                            place_list = " y ".join(top_places)
                            final_text = (
                                f"Te recomiendo visitar {place_list}. "
                                "¿Quieres que te prepare un itinerario con ellos?"
                            )

                            return {
                                "response": final_text,
                                "actions": ["search_places", "filter_by_interests"],
                                "places": filtered_places
                            }
                        else:
                            # fallback si el filtro no encontró coincidencias
                            top_places = [p["name"] for p in places_json[:2]]
                            place_list = " y ".join(top_places)
                            final_text = (
                                f"Encontré algunos lugares interesantes como {place_list}. "
                                "¿Quieres que te prepare un itinerario con ellos?"
                            )

                            return {
                                "response": final_text,
                                "actions": ["search_places"],
                                "places": places_json
                            }

                except Exception as e:
                    logger.warning(f"Error procesando JSON_RESULT: {e}")


            # ✅ Si no hubo JSON_RESULT o no se filtró nada
            return {
                "response": final_text or "No tengo información disponible en este momento.",
                "actions": ["search_places"] if extracted_places else [],
                "places": extracted_places or []
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
