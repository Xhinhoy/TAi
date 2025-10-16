from pydantic import BaseModel
from typing import List, Optional
from .place import Place

class PlaceRecommendation(BaseModel):
    place: Place
    score: float
    reasoning: str
    match_interests: List[str]

class RecommendationRequest(BaseModel):
    user_id: str
    location: Optional[dict] = None
    preferences: Optional[dict] = None
    limit: int = 10

class RecommendationResponse(BaseModel):
    recommendations: List[PlaceRecommendation]
    reasoning: str
