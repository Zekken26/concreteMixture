import os
import sys
import django

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(__file__))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from core.models import MixBatch

# Check unique status values
unique_statuses = set(MixBatch.objects.values_list('status', flat=True))
print(f"Unique status values in database: {unique_statuses}")

# Count each status
for status in unique_statuses:
    count = MixBatch.objects.filter(status=status).count()
    print(f"  {status}: {count}")

# Show sample batches
print("\nSample batches:")
for batch in MixBatch.objects.all()[:5]:
    print(f"  Batch {batch.batch_id}: W/C={batch.wc_ratio:.2f}, Status={batch.status}")
