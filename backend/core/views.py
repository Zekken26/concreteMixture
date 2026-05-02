"""
Views for the Core app.

These views handle the REST API endpoints for the concrete mix monitoring system.
"""

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import MixBatch
from .serializers import MixBatchSerializer


@api_view(['POST'])
def create_mix_data(request):
    """
    POST /api/mix-data/
    
    Creates or updates a mix batch record from ESP32 sensor data.
    Supports both incremental and cumulative data formats.
    
    Expected JSON payload from ESP32 (incremental):
    {
        "material": "CEMENT",  // or "WATER", "SAND", "GRAVEL"
        "weight": 50.5,
        "moisture": 45
    }
    
    Or cumulative format:
    {
        "cement_weight": 50.5,
        "water_weight": 22.5,
        "sand_weight": 75.0,
        "gravel_weight": 100.0,
        "moisture": 45
    }
    
    The W/C ratio and status are automatically calculated.
    
    Returns:
        200 OK: Success with updated mix batch data
        201 Created: Success with new mix batch data
        400 Bad Request: Invalid data
    """
    from django.utils import timezone
    from datetime import timedelta
    
    try:
        # Get or create today's active mix batch (within last hour)
        one_hour_ago = timezone.now() - timedelta(hours=1)
        
        # Try to get the most recent mix batch within the last hour
        mix_batch = MixBatch.objects.filter(timestamp__gte=one_hour_ago).first()
        
        # Determine if we're creating a new batch
        is_new = mix_batch is None
        
        if is_new:
            # Create new mix batch with default values
            mix_batch = MixBatch(
                cement_weight=0,
                water_weight=0,
                sand_weight=0,
                gravel_weight=0,
                moisture=0
            )
        
        # Handle incremental material updates
        if 'material' in request.data:
            material = request.data.get('material', '').upper()
            weight = float(request.data.get('weight', 0))
            
            if material == 'CEMENT':
                mix_batch.cement_weight = weight
            elif material == 'WATER':
                mix_batch.water_weight = weight
            elif material == 'SAND':
                mix_batch.sand_weight = weight
            elif material == 'GRAVEL':
                mix_batch.gravel_weight = weight
            else:
                return Response(
                    {'message': 'Invalid material type. Use CEMENT, WATER, SAND, or GRAVEL'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Handle cumulative updates
        if 'cement_weight' in request.data:
            mix_batch.cement_weight = float(request.data.get('cement_weight', 0))
        if 'water_weight' in request.data:
            mix_batch.water_weight = float(request.data.get('water_weight', 0))
        if 'sand_weight' in request.data:
            mix_batch.sand_weight = float(request.data.get('sand_weight', 0))
        if 'gravel_weight' in request.data:
            mix_batch.gravel_weight = float(request.data.get('gravel_weight', 0))
        
        # Update moisture if provided
        if 'moisture' in request.data:
            mix_batch.moisture = int(request.data.get('moisture', 0))
        
        # Save (model's save method will calculate W/C ratio and status)
        mix_batch.save()
        
        serializer = MixBatchSerializer(mix_batch)
        return Response(
            {
                'message': 'Mix batch updated successfully' if not is_new else 'Mix batch created successfully',
                'data': serializer.data
            },
            status=status.HTTP_200_OK if not is_new else status.HTTP_201_CREATED
        )
        
    except ValueError as e:
        return Response(
            {'message': 'Invalid data format', 'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'message': 'Failed to process mix data', 'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_latest_mix(request):
    """
    GET /api/latest-mix/
    
    Returns the most recent mix batch data.
    Used by the frontend dashboard to display current mix status.
    
    Returns:
        200 OK: Success with latest mix batch data
        404 Not Found: No mix batches exist
    """
    try:
        # Get the most recent mix batch (ordering is defined in model Meta)
        latest_mix = MixBatch.objects.first()
        
        if latest_mix is None:
            return Response(
                {'message': 'No mix batches found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = MixBatchSerializer(latest_mix)
        return Response(
            {
                'message': 'Latest mix batch retrieved successfully',
                'data': serializer.data
            },
            status=status.HTTP_200_OK
        )
    
    except Exception as e:
        return Response(
            {
                'message': 'Error retrieving latest mix',
                'error': str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_mix_history(request):
    """
    GET /api/mix-history/
    
    Returns a list of all mix batches, most recent first.
    Used by the frontend dashboard to display history table and chart.
    
    Query parameters:
        limit: Maximum number of records to return (default: 50)
    
    Returns:
        200 OK: Success with list of mix batches
    """
    try:
        # Get limit from query parameters (default: 50)
        limit = request.GET.get('limit', 50)
        try:
            limit = int(limit)
        except ValueError:
            limit = 50
        
        # Get mix batches (limited)
        mix_batches = MixBatch.objects.all()[:limit]
        
        serializer = MixBatchSerializer(mix_batches, many=True)
        return Response(
            {
                'message': 'Mix history retrieved successfully',
                'count': len(serializer.data),
                'data': serializer.data
            },
            status=status.HTTP_200_OK
        )
    
    except Exception as e:
        return Response(
            {
                'message': 'Error retrieving mix history',
                'error': str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
def delete_mix_history_item(request, batch_id):
    """
    DELETE /api/mix-history/<batch_id>/

    Deletes a single historical mix batch record.
    Used by the frontend dashboard to remove unwanted history entries.
    """
    try:
        mix_batch = MixBatch.objects.get(pk=batch_id)
        mix_batch.delete()

        return Response(
            {
                'message': 'Mix history item deleted successfully'
            },
            status=status.HTTP_200_OK
        )

    except MixBatch.DoesNotExist:
        return Response(
            {
                'message': 'Mix history item not found'
            },
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {
                'message': 'Error deleting mix history item',
                'error': str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
