"""
URL configuration for the Core app.

Maps API endpoints to their corresponding view functions.
"""

from django.urls import path
from . import views

# API endpoints for the concrete mix monitoring system
urlpatterns = [
    # POST endpoint for ESP32 to send sensor data
    path('mix-data/', views.create_mix_data, name='create-mix-data'),
    
    # GET endpoint for latest mix batch
    path('latest-mix/', views.get_latest_mix, name='get-latest-mix'),
    
    # GET endpoint for mix history
    path('mix-history/', views.get_mix_history, name='get-mix-history'),
]
