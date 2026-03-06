"""
Sample data generator for testing the IoT Concrete Mix Monitoring System.
This script creates realistic mix batch data for testing the dashboard and verifying system functionality.
"""

import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from core.models import MixBatch
from datetime import datetime, timedelta
import random

def create_sample_batches():
    """
    Create sample mix batches with varying quality statuses.
    """
    print("Creating sample mix batches...")
    
    # Clear existing batches (optional)
    # MixBatch.objects.all().delete()
    
    # Sample data configurations
    # Each tuple: (cement, water, sand, gravel, hours_ago)
    sample_configs = [
        # Acceptable batches (W/C ratio 0.45-0.60)
        (50.0, 22.5, 75.0, 100.0, 0.5),   # W/C = 0.45
        (52.0, 26.0, 78.0, 104.0, 1.0),   # W/C = 0.50
        (48.0, 26.4, 72.0, 96.0, 2.0),    # W/C = 0.55
        (51.0, 27.5, 76.5, 102.0, 3.0),   # W/C = 0.54
        (49.0, 24.5, 73.5, 98.0, 4.0),    # W/C = 0.50
        (50.5, 25.2, 75.7, 101.0, 5.0),   # W/C = 0.50
        (50.0, 28.0, 75.0, 100.0, 6.0),   # W/C = 0.56
        
        # Too Dry batches (W/C ratio <0.45)
        (50.0, 20.0, 75.0, 100.0, 2.5),   # W/C = 0.40
        (52.0, 21.0, 78.0, 104.0, 7.0),   # W/C = 0.40
        
        # Too Wet batches (W/C ratio >0.60)
        (50.0, 31.0, 75.0, 100.0, 1.5),   # W/C = 0.62
        (48.0, 32.0, 72.0, 96.0, 8.0),    # W/C = 0.67
    ]
    
    created_count = 0
    for cement, water, sand, gravel, hours_ago in sample_configs:
        # Create timestamp
        timestamp = datetime.now() - timedelta(hours=hours_ago)
        
        # Add some random variation
        cement_varied = cement + random.uniform(-1, 1)
        water_varied = water + random.uniform(-0.5, 0.5)
        sand_varied = sand + random.uniform(-2, 2)
        gravel_varied = gravel + random.uniform(-3, 3)
        
        # Create the batch (model will calculate W/C ratio and status)
        batch = MixBatch.objects.create(
            cement_weight=round(cement_varied, 2),
            water_weight=round(water_varied, 2),
            sand_weight=round(sand_varied, 2),
            gravel_weight=round(gravel_varied, 2),
            wc_ratio=0,  # Will be calculated in save()
            timestamp=timestamp
        )
        
        created_count += 1
        print(f"✓ Created batch {batch.id}: W/C={batch.wc_ratio:.2f}, Status={batch.status}")
    
    print(f"\n✅ Successfully created {created_count} sample batches!")
    print(f"Total batches in database: {MixBatch.objects.count()}")
    
    # Show summary by status
    print("\n📊 Status Summary:")
    for status in ['too_dry', 'acceptable', 'too_wet']:
        count = MixBatch.objects.filter(status=status).count()
        print(f"   {status.replace('_', ' ').title()}: {count} batches")

if __name__ == "__main__":
    create_sample_batches()
