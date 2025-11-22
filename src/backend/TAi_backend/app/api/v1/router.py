from fastapi import APIRouter
from . import users, places, recommendations, itineraries, chat, cache, exploration, cache_management, experience_validation

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(users.router)
api_router.include_router(places.router)
api_router.include_router(recommendations.router)
api_router.include_router(itineraries.router)
api_router.include_router(chat.router)
api_router.include_router(cache.router)
api_router.include_router(exploration.router)
api_router.include_router(cache_management.router)
api_router.include_router(experience_validation.router)

