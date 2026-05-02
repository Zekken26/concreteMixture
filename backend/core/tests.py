from django.test import TestCase
from rest_framework.test import APIClient

from .models import MixBatch


class MixHistoryDeleteTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.batch = MixBatch.objects.create(
            cement_weight=10,
            water_weight=5,
            sand_weight=20,
            gravel_weight=0,
            moisture=30,
        )

    def test_delete_mix_history_item(self):
        response = self.client.delete(f"/api/mix-history/{self.batch.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(MixBatch.objects.count(), 0)

    def test_delete_mix_history_item_not_found(self):
        response = self.client.delete("/api/mix-history/9999/")

        self.assertEqual(response.status_code, 404)
