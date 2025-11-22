from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from typing import Annotated, Sequence, TypedDict
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, ToolMessage, AIMessage
from langchain_core.runnables import RunnableConfig
from datetime import datetime
from app.core.config import settings
from app.utils.cache import firebase_cache
from .tools import (
    SearchPlacesTool,
    GetPlaceDetailsTool,
    GetReviewsTool,
    FilterPlacesByInterestsTool,
    OptimizeRouteTool,
    SearchPlacesWithReviewsTool
)
from .prompts import TRAVEL_AGENT_SYSTEM_PROMPT, RECOMMENDATION_PROMPT, ITINERARY_PROMPT, CHAT_PROMPT 
import json
import logging

logger = logging.getLogger(__name__)

# Definir el State del agente
class AgentState(TypedDict):
    """Estado del agente ReAct"""
    messages: Annotated[Sequence[BaseMessage], add_messages]

class TravelAgent:
    """Agente de viajes inteligente con Google AI (Gemini) usando LangGraph StateGraph"""

    def __init__(self, user_profile: dict, user_id: str = None):
        self.user_profile = user_profile
        self.user_id = user_id or user_profile.get('user_id', 'anonymous')

        # Usar Google AI (Gemini)
        self.llm = ChatGoogleGenerativeAI(
            model=settings.GOOGLE_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=settings.GOOGLE_TEMPERATURE,
            max_tokens=settings.GOOGLE_MAX_TOKENS
        )

        # LLM con modo JSON nativo para generar itinerarios
        self.llm_json = ChatGoogleGenerativeAI(
            model=settings.GOOGLE_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.3,  # Más determinista para JSON
            max_tokens=settings.GOOGLE_MAX_TOKENS,
            response_mime_type="application/json",
        )

        logger.info(f"Agente inicializado con Google AI model: {settings.GOOGLE_MODEL}")

        self.tools = self._initialize_tools()
        self.chat_cache_prefix = 'chat_history'
        self.chat_ttl = 86400  # 24 horas

        # Bind tools al modelo para tool calling
        self.llm_with_tools = self.llm.bind_tools(self.tools)

        # Crear diccionario de tools por nombre
        self.tools_by_name = {tool.name: tool for tool in self.tools}

        # Compilar el grafo una sola vez para reutilizar
        self.agent_graph = self._build_agent_graph()

    def _initialize_tools(self):
        """Inicializa las herramientas del agente"""
        return [
            SearchPlacesWithReviewsTool(),  # Tool híbrida recomendada
            SearchPlacesTool(),              # Mantener por compatibilidad
            GetPlaceDetailsTool(),
            GetReviewsTool(),
            FilterPlacesByInterestsTool(),
            OptimizeRouteTool()
        ]

    def _extract_text_content(self, content) -> str:
        """Extrae texto de contenido que puede ser string, lista de objetos, o bytes"""
        # Si es bytes, decodificar
        if isinstance(content, bytes):
            return content.decode('utf-8')

        # Si es lista de objetos (formato de Google AI)
        if isinstance(content, list):
            text_parts = []
            for part in content:
                if isinstance(part, dict):
                    if part.get('type') == 'text' and 'text' in part:
                        text_parts.append(part['text'])
                    elif 'text' in part:
                        text_parts.append(part['text'])
                elif isinstance(part, str):
                    text_parts.append(part)
            return '\n'.join(text_parts) if text_parts else str(content)

        # Si ya es string, devolverlo
        if isinstance(content, str):
            return content

        # Cualquier otro tipo, convertir a string
        return str(content)

    def _build_agent_graph(self):
        """Construye el grafo del agente usando StateGraph"""

        # Definir el nodo que llama al modelo
        def call_model(state: AgentState, config: RunnableConfig):
            """Llama al LLM con las herramientas disponibles"""
            messages = state["messages"]
            try:
                response = self.llm_with_tools.invoke(messages)
                return {"messages": [response]}
            except Exception as e:
                error_msg = str(e)
                logger.error(f"Error en call_model: {error_msg}")

                # Si es un error de tool use, crear una respuesta sin tool calls
                if "tool" in error_msg.lower() or "json" in error_msg.lower():
                    logger.warning("Error de tool calling detectado, respondiendo sin tools")
                    # Reintentar sin tools
                    response = self.llm.invoke(messages)
                    return {"messages": [response]}
                raise

        # Definir el nodo que ejecuta las herramientas
        def tool_node(state: AgentState):
            """Ejecuta las herramientas solicitadas por el LLM"""
            messages = state["messages"]
            last_message = messages[-1]

            # Ejecutar todas las tool calls
            tool_messages = []
            if hasattr(last_message, 'tool_calls') and last_message.tool_calls: # type: ignore
                for tool_call in last_message.tool_calls: # type: ignore
                    tool_name = tool_call["name"]
                    tool_args = tool_call["args"]
                    tool_id = tool_call["id"]

                    logger.info(f"🔧 Ejecutando tool: {tool_name} con args: {tool_args}")

                    # Obtener la herramienta
                    tool = self.tools_by_name.get(tool_name)
                    if tool:
                        try:
                            # Ejecutar la herramienta
                            result = tool.invoke(tool_args)
                            tool_messages.append(
                                ToolMessage(
                                    content=str(result),
                                    tool_call_id=tool_id,
                                    name=tool_name
                                )
                            )
                        except Exception as e:
                            logger.error(f"Error ejecutando tool {tool_name}: {str(e)}")
                            tool_messages.append(
                                ToolMessage(
                                    content=f"Error: {str(e)}",
                                    tool_call_id=tool_id,
                                    name=tool_name
                                )
                            )
                    else:
                        logger.warning(f"Tool no encontrada: {tool_name}")
                        tool_messages.append(
                            ToolMessage(
                                content=f"Tool {tool_name} no encontrada",
                                tool_call_id=tool_id,
                                name=tool_name
                            )
                        )

            return {"messages": tool_messages}

        # Definir función de routing
        def should_continue(state: AgentState):
            """Decide si continuar con tools o terminar"""
            messages = state["messages"]
            last_message = messages[-1]

            # Si el último mensaje tiene tool_calls, ir a tools
            if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
                return "tools"
            # Si no, terminar
            return END

        # Crear el grafo
        workflow = StateGraph(AgentState)

        # Agregar nodos
        workflow.add_node("agent", call_model)
        workflow.add_node("tools", tool_node)

        # Definir el punto de entrada
        workflow.set_entry_point("agent")

        # Agregar edges condicionales
        workflow.add_conditional_edges(
            "agent",
            should_continue,
            {
                "tools": "tools",
                END: END
            }
        )

        # Edge de tools de vuelta a agent
        workflow.add_edge("tools", "agent")

        # Compilar el grafo con límite de recursión
        return workflow.compile(
            checkpointer=None,
            interrupt_before=None,
            interrupt_after=None,
            debug=False
        )

    def _get_chat_history(self) -> list:
        """Obtiene el historial de chat desde Firebase"""
        try:
            history = firebase_cache.get(self.chat_cache_prefix, self.user_id)
            if history is None:
                logger.info(f"No hay historial de chat para user {self.user_id}")
                return []
            logger.info(f"Historial de chat cargado para user {self.user_id}: {len(history)} mensajes")
            return history
        except Exception as e:
            logger.error(f"Error obteniendo historial de chat: {str(e)}")
            return []

    def _save_chat_history(self, history: list) -> bool:
        """Guarda el historial de chat en Firebase"""
        try:
            # Limitar a los últimos 20 mensajes para no sobrecargar
            limited_history = history[-20:] if len(history) > 20 else history
            success = firebase_cache.set(
                self.chat_cache_prefix,
                self.user_id,
                limited_history,
                self.chat_ttl
            )
            if success:
                logger.info(f"Historial de chat guardado para user {self.user_id}")
            return success
        except Exception as e:
            logger.error(f"Error guardando historial de chat: {str(e)}")
            return False

    def _detect_itinerary_request(self, message: str) -> bool:
        """Detecta si el mensaje del usuario está pidiendo un itinerario"""
        message_lower = message.lower()
        keywords = [
            'itinerario', 'itinerary', 'plan de viaje', 'trip plan',
            'ruta', 'route', 'planifica', 'plan', 'agenda',
            'día', 'dias', 'days', 'qué hacer en'
        ]
        return any(keyword in message_lower for keyword in keywords)

    async def _generate_itinerary_json_only(self, conversational_response: str, context_messages: list) -> dict:
        """
        Genera SOLO el JSON del itinerario en una llamada separada.
        Esto evita mezclar texto markdown con JSON estructurado.
        """
        logger.info("📝 Generando JSON limpio del itinerario en segunda llamada...")

        # Crear un prompt específico que SOLO pida el JSON
        json_only_prompt = f"""
Basándote en el itinerario que acabas de describir, genera SOLAMENTE el JSON estructurado.

INSTRUCCIONES CRÍTICAS:
1. Responde ÚNICAMENTE con el JSON, sin texto adicional
2. NO uses bloques de código (```json```)
3. NO agregues explicaciones antes o después
4. El JSON debe empezar con {{ y terminar con }}
5. NO uses comillas dobles (") dentro de los valores de texto
6. NO uses apóstrofes (') ni signos de exclamación (!)
7. Usa solo: letras, números, espacios, comas, puntos, paréntesis y guiones

Formato requerido:
{{
    "title": "Itinerario de X dias en Ciudad",
    "days": [
        {{
            "day": 1,
            "activities": [
                {{
                    "place_id": "identificador_unico",
                    "place_name": "Nombre del lugar",
                    "start": "09:00",
                    "end": "12:00",
                    "price_level": 2,
                    "price_display": "$$",
                    "notes": "Descripcion sin comillas ni exclamaciones"
                }}
            ]
        }}
    ],
    "reasoning": "Explicacion breve"
}}

Genera AHORA el JSON basándote en el itinerario que describiste.
"""

        # Hacer la llamada al LLM con modo JSON nativo
        # Usar el LLM configurado con response_mime_type="application/json"
        json_response = await self.llm_json.ainvoke(json_only_prompt)

        # Extraer contenido
        json_response = self._extract_text_content(json_response.content)

        logger.info(f"📄 Respuesta JSON (primeros 300 chars): {json_response[:300]}")
        logger.info(f"📄 Respuesta JSON (últimos 300 chars): {json_response[-300:]}")

        # Ahora extraer y parsear el JSON
        try:
            itinerary_data = self._extract_itinerary_from_response(json_response)
            return itinerary_data
        except Exception as e:
            logger.error(f"❌ Error extrayendo JSON del itinerario: {str(e)}")
            return None

    def _extract_itinerary_from_response(self, response: str) -> dict:
        """Extrae el itinerario estructurado de la respuesta"""
        try:
            import re

            logger.info("🔎 Buscando JSON en respuesta...")

            # Buscar bloques de código JSON primero (```json``` o ```)
            code_block_match = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', response)
            if code_block_match:
                json_str = code_block_match.group(1)
                logger.info(f"✅ Encontrado JSON en bloque de código ({len(json_str)} chars)")
            else:
                # Buscar JSON directo
                start_idx = response.find('{')
                end_idx = response.rfind('}')

                if start_idx == -1 or end_idx == -1 or end_idx <= start_idx:
                    logger.error("❌ No se encontró JSON en respuesta")
                    return None

                json_str = response[start_idx:end_idx + 1]
                logger.info(f"✅ Encontrado JSON directo ({len(json_str)} chars)")

            logger.info(f"📄 JSON (primeros 200): {json_str[:200]}")

            logger.info("🧹 Limpiando JSON...")
            json_str = self._clean_json_string(json_str)

            logger.info("🔧 Parseando JSON...")
            parsed = json.loads(json_str)
            logger.info(f"✅ JSON parseado, keys: {list(parsed.keys())}")

            # Verificar estructura
            if 'days' in parsed and isinstance(parsed['days'], list) and len(parsed['days']) > 0:
                logger.info(f"✅ Itinerario válido: {len(parsed['days'])} días")
                return parsed
            else:
                logger.warning(f"⚠️ JSON sin estructura válida. Keys: {list(parsed.keys())}")
                return None

        except json.JSONDecodeError as e:
            logger.error(f"❌ Error parseando JSON: {str(e)} en posición {e.pos}")
            if hasattr(e, 'pos') and 'json_str' in locals():
                start = max(0, e.pos - 100)
                end = min(len(json_str), e.pos + 100)
                logger.error(f"📄 Snippet del error:\n{json_str[start:end]}")
            return None
        except Exception as e:
            logger.error(f"❌ Error inesperado: {str(e)}")
            logger.exception(e)
            return None

    def _clean_json_string(self, json_str: str) -> str:
        """Limpia un string JSON para hacerlo parseable"""
        import re

        logger.info("🧹 Limpiando JSON...")

        # Remover comentarios de línea
        json_str = re.sub(r'//.*$', '', json_str, flags=re.MULTILINE)
        logger.info("  ✓ Comentarios removidos")

        # Remover trailing commas antes de } o ]
        json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
        logger.info("  ✓ Trailing commas removidas")

        # Remover caracteres de control (excepto \n, \r, \t que son válidos en JSON strings)
        json_str = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', json_str)
        logger.info("  ✓ Caracteres de control removidos")

        # SOLUCIÓN AGRESIVA: Escapar comillas dobles dentro de valores de string
        # Usar un parser simple de estados para encontrar y escapar comillas internas
        result = []
        in_string = False
        in_key = False
        escape_next = False
        prev_char = ''

        for i, char in enumerate(json_str):
            if escape_next:
                result.append(char)
                escape_next = False
                prev_char = char
                continue

            if char == '\\':
                result.append(char)
                escape_next = True
                prev_char = char
                continue

            if char == '"':
                # Determinar si estamos en una key o un value
                # Si encontramos un ":" después, es una key
                # Si no, es parte de un value
                if not in_string:
                    # Comenzando un string (key o value)
                    in_string = True
                    result.append(char)
                    # Mirar hacia adelante para ver si es una key
                    rest = json_str[i+1:i+50]  # mirar los próximos 50 chars
                    if '"' in rest:
                        closing_quote_pos = rest.index('"')
                        after_closing = rest[closing_quote_pos+1:].lstrip()
                        if after_closing.startswith(':'):
                            in_key = True
                else:
                    # Estamos dentro de un string, esta es una comilla de cierre
                    # A menos que sea parte del contenido
                    # Verificar si lo siguiente es : o , o } o ] (indicadores de final de valor)
                    next_chars = json_str[i+1:i+10].lstrip()
                    if next_chars and next_chars[0] in [',', '}', ']', '\n']:
                        # Es una comilla de cierre legítima
                        in_string = False
                        in_key = False
                        result.append(char)
                    else:
                        # Es una comilla dentro del valor, escaparla
                        if not in_key:
                            result.append('\\')
                        result.append(char)
            else:
                result.append(char)

            prev_char = char

        json_str = ''.join(result)
        logger.info("  ✓ Comillas internas escapadas")

        # Log de longitud final
        logger.info(f"  ✓ JSON limpiado: {len(json_str)} caracteres")

        return json_str

    def _save_itinerary_to_firestore(self, itinerary_data: dict, city: str = None) -> str:
        """Normaliza el itinerario al formato esperado y lo guarda."""
        try:
            from app.repositories.itinerary_repository import itinerary_repository
            from datetime import datetime
            import re

            logger.info("💾 Guardando itinerario en Firestore...")
            title = itinerary_data.get("title", "Itinerario generado")
            days_list = itinerary_data.get("days", [])

            # Determinar ciudad
            if not city:
                city = itinerary_data.get("city")
            if not city and title:
                match = re.search(r"en\s+(.+)$", title, re.IGNORECASE)
                if match:
                    city = match.group(1).strip()
            city = city or "Ciudad"

            # Normalizar días y actividades al formato esperado
            normalized_days = []
            for day_entry in days_list:
                day_number = day_entry.get("day") or day_entry.get("numero") or day_entry.get("dia")
                try:
                    day_number = int(day_number)
                except Exception:
                    day_number = None

                activities = []
                for act in day_entry.get("activities", []):
                    price_level = act.get("price_level")
                    price_display = act.get("price_display")

                    if price_display is None and price_level is not None:
                        try:
                            level_int = int(price_level)
                        except Exception:
                            level_int = None

                        price_display_map = {
                            0: "Gratis",
                            1: "$",
                            2: "$$",
                            3: "$$$",
                            4: "$$$$",
                        }
                        price_display = price_display_map.get(level_int)

                    activities.append({
                        "start": act.get("start"),
                        "end": act.get("end"),
                        "notes": act.get("notes"),
                        "place_id": act.get("place_id"),
                        "place_name": act.get("place_name"),
                        "price_display": price_display,
                        "price_level": price_level,
                    })

                normalized_days.append({
                    "day": day_number if day_number else len(normalized_days) + 1,
                    "activities": activities,
                })

            itinerary_to_save = {
                "title": title,
                "city": city,
                "days": normalized_days,
                "owner_uid": self.user_id,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }

            # Validar fecha obligatoria (fallback a hoy si falta)
            start_date = itinerary_data.get("start_date")
            if not start_date:
                start_date = datetime.utcnow().date().isoformat()
                logger.warning("start_date faltaba; usando fecha actual como fallback")

            itinerary_to_save["start_date"] = start_date

            itinerary_id = itinerary_repository.create_itinerary(itinerary_to_save)
            logger.info(f"✅ Itinerario guardado en Firestore con ID: {itinerary_id}")
            return itinerary_id

        except Exception as e:
            logger.error(f"❌ Error guardando itinerario en Firestore: {str(e)}")
            logger.exception(e)
            return None

    def clear_chat_history(self) -> bool:
        """Limpia el historial de chat del usuario"""
        try:
            success = firebase_cache.delete(self.chat_cache_prefix, self.user_id)
            if success:
                logger.info(f"Historial de chat limpiado para user {self.user_id}")
            return success
        except Exception as e:
            logger.error(f"Error limpiando historial de chat: {str(e)}")
            return False

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
            
            logger.info(f"Generando recomendaciones con Google AI ({settings.GOOGLE_MODEL})...")

            response = await self.llm.ainvoke(prompt)

            # Extraer contenido como string
            content = self._extract_text_content(response.content)

            try:
                result = json.loads(content)
                return result
            except json.JSONDecodeError:
                logger.warning("Respuesta no es JSON válido")
                return {
                    'recommendations': [],
                    'reasoning': content
                }
                
        except Exception as e:
            logger.error(f"Error generando recomendaciones: {str(e)}")
            return {
                'recommendations': [],
                'reasoning': f'Error: {str(e)}'
            }
    
    async def generate_itinerary(self, city: str, days: int) -> dict:
        """Genera un itinerario completo usando Tool-Calling Agent con StateGraph"""
        try:
            interests_str = ', '.join(self.user_profile.get('interests', []))
            budget = self.user_profile.get('preferences', {}).get('budget', 'no especificado')
            travel_style = self.user_profile.get('preferences', {}).get('travel_style', 'standard')

            # System prompt con el perfil del usuario
            system_prompt = TRAVEL_AGENT_SYSTEM_PROMPT.format(
                user_profile=json.dumps(self.user_profile, indent=2)
            )

            # Request para el itinerario
            itinerary_request = ITINERARY_PROMPT.format(
                days=days,
                city=city,
                interests=interests_str,
                budget=budget,
                travel_style=travel_style
            )

            logger.info(f"🤖 Generando itinerario CON STATEGRAPH AGENT...")
            logger.info(f"📍 {city} | 📅 {days} días | 🎯 {interests_str}")

            # Preparar mensajes para el grafo
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=itinerary_request)
            ]

            # Ejecutar grafo - Gemini razona y usa tools
            logger.info("🔄 Agente razonando y usando tools...")
            result = self.agent_graph.invoke(
                {"messages": messages},
                {"recursion_limit": 10}  # Máximo 10 iteraciones agent→tools→agent
            )

            # Obtener respuesta
            response_content = self._extract_text_content(result["messages"][-1].content)
            logger.info(f"✅ Respuesta recibida ({len(response_content)} chars)")

            try:
                content = response_content

                # Buscar JSON en la respuesta (podría tener texto adicional)
                import re
                json_match = re.search(r'\{[\s\S]*\}', content)

                if json_match:
                    json_str = json_match.group(0)
                    parsed_result = json.loads(json_str)
                else:
                    # Intentar parsear toda la respuesta
                    parsed_result = json.loads(content)

                # Verificar que el JSON tenga la estructura correcta
                if 'days' not in parsed_result:
                    logger.error("❌ Respuesta sin campo 'days'")
                    return {
                        'title': f'Itinerario {days} días en {city}',
                        'days': [],
                        'reasoning': content
                    }

                logger.info(f"✅ Itinerario parseado: {len(parsed_result.get('days', []))} días")
                logger.info(f"🎯 Agente usó tools para personalizar según perfil")

                return parsed_result

            except (json.JSONDecodeError, AttributeError) as e:
                logger.error(f"❌ Error JSON decode: {str(e)}")
                logger.error(f"📄 Respuesta (500 chars): {response_content[:500]}")
                return {
                    'title': f'Itinerario {days} días en {city}',
                    'days': [],
                    'reasoning': response_content
                }

        except Exception as e:
            logger.error(f"❌ Error generando itinerario: {str(e)}")
            return {
                'title': 'Error',
                'days': [],
                'reasoning': f'Error: {str(e)}'
            }
    
    async def chat(self, message: str) -> dict:
        """Conversación natural con el agente con historial persistente en Firebase usando StateGraph"""
        try:
            # Usar CHAT_PROMPT para modo chatbot conversacional con perfil del usuario
            system_prompt = CHAT_PROMPT.format(
                user_profile=json.dumps(self.user_profile, indent=2),
                current_date=datetime.utcnow().strftime("%Y-%m-%d")
            )

            logger.info(f"Chat con Google AI ({settings.GOOGLE_MODEL}) para user {self.user_id}...")

            # Detectar si el usuario está pidiendo un itinerario
            is_itinerary_request = self._detect_itinerary_request(message)

            # Obtener historial de chat desde Firebase
            chat_history = self._get_chat_history()

            # Preparar mensajes para el grafo
            messages = []
            messages.append(SystemMessage(content=system_prompt))

            # Agregar historial de chat desde Firebase
            for msg in chat_history:
                role, content = msg
                if role == "human":
                    messages.append(HumanMessage(content=content))
                elif role == "assistant":
                    messages.append(AIMessage(content=content))

            # Agregar mensaje actual del usuario
            messages.append(HumanMessage(content=message))

            # Ejecutar grafo con límite de recursión
            result = self.agent_graph.invoke(
                {"messages": messages},
                {"recursion_limit": 10}  # Máximo 10 iteraciones agent→tools→agent
            )

            # Obtener respuesta del último mensaje
            last_message = result["messages"][-1]
            response_content = self._extract_text_content(last_message.content)

            # Intentar extraer itinerario si se detectó una solicitud
            itinerary_data = None
            saved_itinerary_id = None

            logger.info(f"🔍 is_itinerary_request: {is_itinerary_request}")

            # NUEVO: Si el agente generó un itinerario en el chat, extraerlo y guardarlo
            if is_itinerary_request:
                logger.info("🎯 Solicitud de itinerario detectada - intentando extraer JSON...")
                extracted = self._extract_itinerary_from_response(response_content)

                if extracted:
                    logger.info("✅ JSON de itinerario extraído exitosamente")
                    logger.info(f"📦 Contenido del itinerario extraído: {list(extracted.keys())}")
                    itinerary_data = extracted

                    # Intentar extraer ciudad del JSON o del título
                    city = None
                    if 'city' in extracted:
                        city = extracted['city']
                        logger.info(f"📍 Ciudad obtenida del campo 'city': {city}")
                    else:
                        # Si no hay campo city, extraer del título
                        title = extracted.get('title', '')
                        if title:
                            import re
                            match = re.search(r'en\s+(.+?)(?:\s*-|\s*$)', title, re.IGNORECASE)
                            if match:
                                city = match.group(1).strip()
                                logger.info(f"📍 Ciudad extraída del título: {city}")

                    # Guardar automáticamente en Firestore
                    saved_itinerary_id = self._save_itinerary_to_firestore(extracted, city)

                    if saved_itinerary_id:
                        logger.info(f"💾 Itinerario guardado automáticamente con ID: {saved_itinerary_id}")
                    else:
                        logger.warning("⚠️ No se pudo guardar el itinerario en Firestore")
                else:
                    logger.info("ℹ️ No se encontró JSON de itinerario en la respuesta (solo texto conversacional)")

            # Actualizar historial
            chat_history.append(["human", message])
            chat_history.append(["assistant", response_content])

            # Guardar historial actualizado en Firebase
            self._save_chat_history(chat_history)

            result = {
                'response': response_content,
                'format': 'markdown',
                'actions': [],
                'places': [],
                'itinerary': itinerary_data  # Incluir itinerario si se generó
            }

            # Agregar ID del itinerario guardado si existe
            if saved_itinerary_id:
                result['saved_itinerary_id'] = saved_itinerary_id

            return result

        except Exception as e:
            logger.error(f"Error en chat: {str(e)}")
            return {
                'response': f'Lo siento, hubo un error: {str(e)}',
                'format': 'markdown',
                'actions': [],
                'places': []
            }
