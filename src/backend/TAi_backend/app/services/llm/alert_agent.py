"""
Alert Generator Agent

Agente inteligente que usa Gemini como orquestador para generar
alertas personalizadas combinando datos de Google Places y TripAdvisor.
"""

from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from typing import Annotated, Sequence, TypedDict, List, Dict, Any
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, AIMessage
from langchain_core.runnables import RunnableConfig
from datetime import datetime
import json
import logging

from app.core.config import settings
from app.services.llm.alert_tools import get_alert_tools
from app.models.route_alert import AlertPriority, AlertReason
from app.utils.cache import firebase_cache
from app.utils.cache_utils import (
    CacheKeyGenerator,
    DynamicTTL,
    cache_stats
)

logger = logging.getLogger(__name__)


# ==================== PROMPTS ====================

ALERT_AGENT_SYSTEM_PROMPT = """Eres un guía turístico local experto y entusiasta que ayuda a viajeros a descubrir lugares increíbles mientras caminan por la ciudad.

## TU MISIÓN
Analizar lugares cercanos al usuario y generar alertas personalizadas que realmente valgan la pena. No sobresatures al usuario - solo alerta sobre lugares que genuinamente coincidan con sus intereses.

## TOOLS DISPONIBLES
Tienes acceso a varias herramientas para investigar lugares:

1. **google_places_search**: Busca lugares cercanos (úsala SIEMPRE primero)
2. **google_place_details**: Detalles completos de un lugar específico
3. **tripadvisor_search**: Busca el lugar en TripAdvisor para verificar reputación
4. **tripadvisor_reviews**: Lee opiniones recientes de viajeros reales
5. **get_user_profile**: Obtén intereses y preferencias del usuario (úsala SIEMPRE)

## PROCESO DE ANÁLISIS (ReAct Loop)

Sigue este proceso para cada ubicación:

### PASO 1: Obtener contexto del usuario
```
Action: get_user_profile
- ¿Cuáles son sus intereses?
- ¿Cuál es su presupuesto?
- ¿Qué estilo de viaje prefiere?
```

### PASO 2: Buscar lugares cercanos
```
Action: google_places_search
- Radio: máximo 500m (el usuario está caminando)
- Enfócate en tipos que coincidan con sus intereses
- Considera el contexto (hora del día, ubicación)
```

### PASO 3: Investigar lugares prometedores
Para cada lugar que parezca interesante:

```
Action: google_place_details (para info detallada)
Action: tripadvisor_search (para verificar reputación)
Action: tripadvisor_reviews (para leer experiencias recientes)
```

### PASO 4: Analizar y decidir
Pregúntate:
- ¿Realmente coincide con los intereses del usuario?
- ¿Las reviews recientes son positivas?
- ¿El precio se ajusta al presupuesto?
- ¿Está abierto ahora? (si es relevante)
- ¿Hay algo especial o único sobre este lugar?

## CRITERIOS DE CALIDAD

Solo genera alerta si:
✅ Coincide con AL MENOS UN interés del usuario
✅ Rating >= 4.0 en Google O TripAdvisor
✅ Tiene reviews recientes (últimos 6 meses)
✅ Se ajusta al presupuesto del usuario
✅ Está a máximo 500m de distancia

## FORMATO DE RESPUESTA

Debes retornar un JSON con esta estructura EXACTA:

```json
{{
  "alerts": [
    {{
      "place_id": "ChIJ...",
      "place_name": "Nombre del Lugar",
      "priority": "high|medium|low",
      "reasons": ["interest_match", "high_rating", "recent_positive"],
      "match_score": 0.85,
      "personalized_message": "🦞 ¡Mercado Central a 350m! Viajeros reportan marisco fresco hoy. Coincide con tu amor por gastronomía local.",
      "distance_meters": 350,
      "data_sources": {{
        "google_rating": 4.3,
        "tripadvisor_rating": 4.5,
        "recent_reviews_summary": "Reviews recientes destacan marisco fresco y ambiente auténtico"
      }}
    }}
  ],
  "reasoning": "Analicé 5 lugares cercanos. Mercado Central destaca por coincidencia perfecta con intereses en gastronomía y reviews recientes muy positivas sobre productos frescos."
}}
```

## PRIORIDADES

### HIGH (score >= 0.8):
- Coincidencia perfecta con intereses principales
- Rating excelente (4.5+) en múltiples fuentes
- Reviews recientes muy positivas
- Algo único o especial

### MEDIUM (score >= 0.5):
- Coincidencia parcial con intereses
- Buen rating (4.0-4.5)
- Reviews mixtas pero mayormente positivas

### LOW (score < 0.5):
- Coincidencia débil
- Rating aceptable pero no destacado
- Simplemente está cerca

## RAZONES VÁLIDAS (AlertReason)
- "interest_match": Coincide con intereses del usuario
- "high_rating": Rating muy alto (4.5+)
- "trending": Lugar popular/trending
- "hidden_gem": Joya oculta (pocas reviews pero excelente rating)
- "nearby": Simplemente está cerca
- "budget_friendly": Se ajusta al presupuesto
- "highly_reviewed": Muchas reseñas positivas
- "recent_positive": Reviews recientes positivas

## ESTILO DE MENSAJES

Sé entusiasta pero auténtico:
✅ "🦞 ¡Mercado Central a 350m! Viajeros reportan marisco fresco hoy."
✅ "⭐ Museo de Arte tiene exposición temporal sobre arte local. A 480m."
✅ "💎 Café escondido con 4.8/5. Locals dicen que tiene el mejor cortado."

❌ "Hay un restaurante cerca."
❌ "Este lugar tiene buen rating."
❌ "Te recomiendo visitar..."

## IMPORTANTE
- NO inventes información - usa solo datos de las tools
- NO generes más de 3 alertas por ubicación
- Si no hay lugares relevantes, retorna array vacío
- Siempre incluye distancia en metros
- Menciona fuente de información (Google, TripAdvisor, reviews recientes)

## CONTEXTO DEL USUARIO
{user_context}

## UBICACIÓN ACTUAL
Latitud: {latitude}
Longitud: {longitude}

¡Ahora usa las tools para investigar y generar alertas increíbles!
"""


# ==================== STATE ====================

class AlertAgentState(TypedDict):
    """Estado del agente de alertas"""
    messages: Annotated[Sequence[BaseMessage], add_messages]


# ==================== AGENT ====================

class AlertGeneratorAgent:
    """Agente que genera alertas usando Gemini como orquestador"""

    def __init__(self):
        # LLM con tools
        self.llm = ChatGoogleGenerativeAI(
            model=settings.GOOGLE_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.7,  # Creatividad moderada para mensajes personalizados
            max_tokens=2000
        )

        # LLM para generar JSON final
        self.llm_json = ChatGoogleGenerativeAI(
            model=settings.GOOGLE_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.3,
            max_tokens=2000,
            model_kwargs={
                "response_mime_type": "application/json"
            }
        )

        # Tools
        self.tools = get_alert_tools()
        self.llm_with_tools = self.llm.bind_tools(self.tools)
        self.tools_by_name = {tool.name: tool for tool in self.tools}

        # Grafo
        self.agent_graph = self._build_graph()

        logger.info(f"🤖 AlertGeneratorAgent inicializado con {len(self.tools)} tools")

    def _build_graph(self):
        """Construye el grafo ReAct del agente"""

        def call_model(state: AlertAgentState, config: RunnableConfig):
            """Llama al LLM con tools"""
            messages = state["messages"]
            try:
                response = self.llm_with_tools.invoke(messages)
                return {"messages": [response]}
            except Exception as e:
                logger.error(f"Error en call_model: {str(e)}")
                # Respuesta de fallback
                error_msg = AIMessage(content="Error al procesar. Retornando sin alertas.")
                return {"messages": [error_msg]}

        def tool_node(state: AlertAgentState):
            """Ejecuta las tools solicitadas"""
            messages = state["messages"]
            last_message = messages[-1]

            tool_messages = []
            if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
                for tool_call in last_message.tool_calls:
                    tool_name = tool_call["name"]
                    tool_args = tool_call["args"]
                    tool_id = tool_call["id"]

                    logger.info(f"🔧 Ejecutando tool: {tool_name}")

                    tool = self.tools_by_name.get(tool_name)
                    if tool:
                        try:
                            result = tool.invoke(tool_args)
                            from langchain_core.messages import ToolMessage
                            tool_messages.append(
                                ToolMessage(
                                    content=str(result),
                                    tool_call_id=tool_id,
                                    name=tool_name
                                )
                            )
                        except Exception as e:
                            logger.error(f"Error ejecutando {tool_name}: {str(e)}")
                            from langchain_core.messages import ToolMessage
                            tool_messages.append(
                                ToolMessage(
                                    content=f"Error: {str(e)}",
                                    tool_call_id=tool_id,
                                    name=tool_name
                                )
                            )

            return {"messages": tool_messages}

        def should_continue(state: AlertAgentState):
            """Decide si continuar con tools o terminar"""
            messages = state["messages"]
            last_message = messages[-1]

            if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
                return "tools"
            return END

        # Construir grafo
        workflow = StateGraph(AlertAgentState)
        workflow.add_node("agent", call_model)
        workflow.add_node("tools", tool_node)
        workflow.set_entry_point("agent")
        workflow.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
        workflow.add_edge("tools", "agent")

        return workflow.compile()

    async def generate_alerts(
        self,
        latitude: float,
        longitude: float,
        user_id: str,
        user_profile: Dict[str, Any],
        max_alerts: int = 3,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Genera alertas usando el agente con CACHÉ INTELIGENTE

        Caché Strategy:
        - GeoHash: Agrupa ubicaciones en cuadrículas de ~150m
        - Profile Hash: Agrupa usuarios con intereses similares
        - TTL Dinámico: Zonas populares = TTL corto, zonas poco visitadas = TTL largo

        Returns:
            {
                "alerts": [...],
                "reasoning": "...",
                "cache_hit": true/false
            }
        """
        try:
            logger.info(f"🤖 Generando alertas con AI Agent para usuario {user_id}")
            logger.info(f"📍 Ubicación: ({latitude}, {longitude})")

            # ========== CACHÉ INTELIGENTE ==========
            cache_key = None
            geohash = None

            if use_cache:
                # Generar cache key basado en ubicación + perfil
                cache_key = CacheKeyGenerator.generate_alert_cache_key(
                    latitude=latitude,
                    longitude=longitude,
                    user_profile=user_profile,
                    geohash_precision=7  # ~150m
                )

                # Extraer geohash para TTL dinámico
                from app.utils.cache_utils import GeoHashUtil
                geohash = GeoHashUtil.encode(latitude, longitude, precision=7)

                logger.info(f"🔑 Cache key: {cache_key}")

                # Intentar obtener del caché
                cached_result = firebase_cache.get("ai_agent_alerts", cache_key)

                if cached_result:
                    logger.info(f"✅ CACHE HIT! Reutilizando análisis previo")
                    cache_stats.record_hit()
                    cached_result['cache_hit'] = True
                    cached_result['from_cache'] = True
                    return cached_result

                logger.info(f"❌ CACHE MISS. Generando con Gemini...")
                cache_stats.record_miss()
            # ========================================

            # Preparar contexto del usuario
            user_context = json.dumps({
                "user_id": user_id,
                "interests": user_profile.get('interests', []),
                "budget": user_profile.get('preferences', {}).get('budget', {}),
                "travel_style": user_profile.get('preferences', {}).get('travel_style', 'standard')
            }, indent=2)

            # System prompt con contexto
            system_prompt = ALERT_AGENT_SYSTEM_PROMPT.format(
                user_context=user_context,
                latitude=latitude,
                longitude=longitude
            )

            # Request al agente
            user_request = f"""Analiza lugares cercanos a mi ubicación actual y genera máximo {max_alerts} alertas personalizadas.

Coordenadas: ({latitude}, {longitude})

Sigue el proceso completo:
1. Obtén mi perfil con get_user_profile
2. Busca lugares cercanos con google_places_search
3. Investiga los más prometedores con las otras tools
4. Genera alertas solo para los que realmente valgan la pena

Retorna JSON con formato especificado."""

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_request)
            ]

            # Ejecutar grafo (máx 15 iteraciones)
            logger.info("🔄 Ejecutando agent graph...")
            result = self.agent_graph.invoke(
                {"messages": messages},
                {"recursion_limit": 15}
            )

            # Extraer respuesta final
            final_message = result["messages"][-1]
            response_content = final_message.content if hasattr(final_message, 'content') else str(final_message)

            logger.info(f"📄 Respuesta del agent: {response_content[:200]}...")

            # Parsear JSON
            try:
                # Extraer JSON de la respuesta
                import re
                json_match = re.search(r'\{[\s\S]*\}', response_content)
                if json_match:
                    parsed_result = json.loads(json_match.group(0))
                else:
                    parsed_result = json.loads(response_content)

                logger.info(f"✅ Agent generó {len(parsed_result.get('alerts', []))} alertas")

                # ========== GUARDAR EN CACHÉ ==========
                if use_cache and cache_key and geohash:
                    # Calcular TTL dinámico basado en popularidad de zona
                    ttl = DynamicTTL.get_ttl_for_zone(geohash)

                    # Agregar metadata
                    parsed_result['cache_hit'] = False
                    parsed_result['from_cache'] = False
                    parsed_result['cached_at'] = datetime.now().isoformat()

                    # Guardar en Firebase cache
                    success = firebase_cache.set(
                        "ai_agent_alerts",
                        cache_key,
                        parsed_result,
                        ttl
                    )

                    if success:
                        logger.info(f"💾 Resultado guardado en caché (TTL: {ttl}s)")
                        # Registrar hit en la zona para estadísticas
                        DynamicTTL.record_zone_hit(geohash)
                    else:
                        logger.warning("⚠️ No se pudo guardar en caché")
                # ======================================

                return parsed_result

            except json.JSONDecodeError as e:
                logger.error(f"❌ Error parseando JSON: {str(e)}")
                logger.error(f"Response: {response_content}")
                return {
                    "alerts": [],
                    "reasoning": f"Error parseando respuesta del agent: {str(e)}",
                    "cache_hit": False
                }

        except Exception as e:
            logger.error(f"❌ Error en generate_alerts: {str(e)}")
            logger.exception(e)
            return {
                "alerts": [],
                "reasoning": f"Error generando alertas: {str(e)}"
            }


# Instancia global
alert_generator_agent = AlertGeneratorAgent()
