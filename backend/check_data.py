"""
Check sample data in the database
"""

import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from core.models import MixBatch

print(f"\n📊 Current Database Status:")
print(f"   Total batches: {MixBatch.objects.count()}")
print(f"   Too Dry: {MixBatch.objects.filter(status='too_dry').count()}")
print(f"   Acceptable: {MixBatch.objects.filter(status='acceptable').count()}")
print(f"   Too Wet: {MixBatch.objects.filter(status='too_wet').count()}")

if MixBatch.objects.count() > 0:
    latest = MixBatch.objects.first()
    print(f"\n✅ Sample data is available!")
    print(f"   Latest batch: W/C={latest.wc_ratio:.2f}, Status={latest.status}")
else:
    print(f"\n⚠️  No data in database. Run 'python create_sample_data.py' to add sample data.")
