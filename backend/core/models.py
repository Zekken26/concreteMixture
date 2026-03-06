from django.db import models
from django.core.validators import MinValueValidator

# Create your models here.

class MixBatch(models.Model):
    """
    Model to store concrete mix batch data from IoT sensors.
    
    Each batch represents one concrete mixing operation with sensor readings
    for different material weights and calculated water-cement ratio.
    """
    
    # Status choices for the concrete mix
    STATUS_CHOICES = [
        ('too_dry', 'Too Dry'),        # W/C ratio: <0.45
        ('acceptable', 'Acceptable'),  # W/C ratio: 0.45-0.60
        ('too_wet', 'Too Wet'),        # W/C ratio: >0.60
    ]
    
    # Material weights in kilograms (from load cell sensors)
    cement_weight = models.FloatField(
        validators=[MinValueValidator(0.0)],
        help_text="Weight of cement in kg"
    )
    
    water_weight = models.FloatField(
        validators=[MinValueValidator(0.0)],
        help_text="Weight of water in kg"
    )
    
    sand_weight = models.FloatField(
        validators=[MinValueValidator(0.0)],
        help_text="Weight of sand in kg"
    )
    
    gravel_weight = models.FloatField(
        validators=[MinValueValidator(0.0)],
        help_text="Weight of gravel in kg"
    )
    
    # Moisture level from sensor (percentage)
    moisture = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Moisture level in percentage (0-100)"
    )
    
    # Water-cement ratio (calculated or sent by ESP32)
    wc_ratio = models.FloatField(
        validators=[MinValueValidator(0.0)],
        help_text="Water to cement ratio"
    )
    
    # Mix quality status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='fair',
        help_text="Quality status of the concrete mix"
    )
    
    # Timestamp of when the data was recorded
    timestamp = models.DateTimeField(
        auto_now_add=True,
        help_text="When this mix batch was recorded"
    )
    
    class Meta:
        ordering = ['-timestamp']  # Most recent first
        verbose_name = 'Mix Batch'
        verbose_name_plural = 'Mix Batches'
    
    def __str__(self):
        return f"Mix Batch {self.id} - {self.status} (W/C: {self.wc_ratio:.2f})"
    
    def save(self, *args, **kwargs):
        """
        Override save to automatically calculate W/C ratio and determine status
        if not provided by the ESP32.
        """
        # Calculate W/C ratio if cement weight is available
        if self.cement_weight > 0:
            self.wc_ratio = self.water_weight / self.cement_weight
        
        # Determine status based on W/C ratio
        if self.wc_ratio < 0.45:
            self.status = 'too_dry'
        elif 0.45 <= self.wc_ratio <= 0.60:
            self.status = 'acceptable'
        else:
            self.status = 'too_wet'
        
        super().save(*args, **kwargs)
