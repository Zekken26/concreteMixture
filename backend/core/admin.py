"""
Admin configuration for the Core app.

Registers models with the Django admin interface for easy data management.
"""

from django.contrib import admin
from .models import MixBatch


@admin.register(MixBatch)
class MixBatchAdmin(admin.ModelAdmin):
    """
    Admin interface for MixBatch model.
    
    Provides a user-friendly interface to view and manage concrete mix batches.
    """
    
    # Fields to display in the list view
    list_display = [
        'id',
        'timestamp',
        'status',
        'wc_ratio',
        'cement_weight',
        'water_weight',
        'sand_weight',
        'gravel_weight',
    ]
    
    # Fields to filter by in the sidebar
    list_filter = ['status', 'timestamp']
    
    # Fields to search
    search_fields = ['id', 'status']
    
    # Default ordering (most recent first)
    ordering = ['-timestamp']
    
    # Fields that cannot be edited (auto-generated)
    readonly_fields = ['timestamp']
    
    # How many items to show per page
    list_per_page = 25
