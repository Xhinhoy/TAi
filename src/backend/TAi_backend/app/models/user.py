from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

class AccessibilityPreferences(BaseModel):
    mobility_assistance: bool = False
    visual_assistance: bool = False
    hearing_assistance: bool = False

class NotificationPreferences(BaseModel):
    recommendations: bool = True
    price_alerts: bool = True
    weather_updates: bool = True
    event_reminders: bool = True

class BudgetPreferences(BaseModel):
    min: float
    max: float
    currency: str = "USD"

class UserPreferences(BaseModel):
    budget: Optional[BudgetPreferences] = None
    travel_style: str = "standard"
    group_size: str = "solo"
    transport_preference: List[str] = []
    accessibility: AccessibilityPreferences = AccessibilityPreferences()
    notifications: NotificationPreferences = NotificationPreferences()

class UserProfile(BaseModel):
    uid: str
    display_name: Optional[str] = None  # Opcional - se puede obtener del token de Firebase
    email: Optional[str] = None  # Opcional - se puede obtener del token de Firebase
    photo_url: Optional[str] = None
    location: str = ""
    language: str = "es"
    timezone: str = "America/Santiago"
    interests: List[str] = []
    preferences: Optional[UserPreferences] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class UserProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    location: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None
    interests: Optional[List[str]] = None
    preferences: Optional[UserPreferences] = None