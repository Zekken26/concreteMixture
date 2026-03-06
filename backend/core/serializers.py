"""
Serializers for the Core app.

Serializers convert complex data types (like Django models) to/from JSON format
for the REST API endpoints.
"""

from rest_framework import serializers
from .models import MixBatch


class MixBatchSerializer(serializers.ModelSerializer):
    """
    Serializer for MixBatch model.
    
    Handles conversion between MixBatch model instances and JSON data.
    Used for all API endpoints (create, read, list).
    """
    
    class Meta:
        model = MixBatch
        fields = [
            'id',
            'cement_weight',
            'water_weight',
            'sand_weight',
            'gravel_weight',
            'moisture',
            'wc_ratio',
            'status',
            'timestamp',
        ]
        read_only_fields = ['id', 'timestamp']  # These are auto-generated
    
    def validate(self, data):
        """
        Custom validation to ensure data integrity.
        """
        # Ensure all weights are positive
        for field in ['cement_weight', 'water_weight', 'sand_weight', 'gravel_weight']:
            if field in data and data[field] < 0:
                raise serializers.ValidationError(
                    {field: f"{field} must be a positive number."}
                )
        
        # Ensure cement weight is not zero (to avoid division by zero)
        if 'cement_weight' in data and data['cement_weight'] == 0:
            raise serializers.ValidationError(
                {'cement_weight': 'Cement weight cannot be zero.'}
            )
        
        return data
