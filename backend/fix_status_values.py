import os
import sys
import django

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(__file__))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from core.models import MixBatch

# Update all batches to recalculate their status based on W/C ratio
# This will use the save() method which automatically sets the correct status
print("Updating all batches to use new status values...")
batches = MixBatch.objects.all()
total = batches.count()

for batch in batches:
    old_status = batch.status
    # Just call save() - it will recalculate status based on wc_ratio
    batch.save()
    if old_status != batch.status:
        print(f"  Updated batch {batch.id}: {old_status} -> {batch.status} (W/C={batch.wc_ratio:.2f})")

print(f"\nUpdated {total} batches")

# Show new counts
print("\nNew status distribution:")
for status in ['too_dry', 'acceptable', 'too_wet']:
    count = MixBatch.objects.filter(status=status).count()
    print(f"  {status}: {count}")
