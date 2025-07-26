from django.db import models
from django.contrib.auth.models import User
from reader.models import Document, Topic


class StudyAnalytics(models.Model):
    """Model for tracking user study patterns and insights."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='analytics')
    total_study_time = models.IntegerField(default=0)  # in minutes
    documents_studied = models.IntegerField(default=0)
    flashcards_created = models.IntegerField(default=0)
    questions_asked = models.IntegerField(default=0)
    most_studied_topics = models.JSONField(default=list, blank=True)
    study_streak = models.IntegerField(default=0)  # consecutive days
    last_study_date = models.DateField(null=True, blank=True)
    
    def __str__(self):
        return f"Analytics for {self.user.username}"


class TopicDifficulty(models.Model):
    """Track which topics users find difficult."""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE)
    difficulty_level = models.IntegerField(choices=[
        (1, 'Very Easy'),
        (2, 'Easy'),
        (3, 'Medium'),
        (4, 'Hard'),
        (5, 'Very Hard')
    ], default=3)
    time_spent = models.IntegerField(default=0)  # in minutes
    questions_asked = models.IntegerField(default=0)
    last_studied = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'topic']
    
    def __str__(self):
        return f"{self.user.username} - {self.topic.name} (Level {self.difficulty_level})"


class DailyStudyLog(models.Model):
    """Track daily study activities."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='daily_logs')
    date = models.DateField()
    total_time = models.IntegerField(default=0)  # in minutes
    documents_accessed = models.ManyToManyField(Document, blank=True)
    topics_studied = models.ManyToManyField(Topic, blank=True)
    flashcards_reviewed = models.IntegerField(default=0)
    questions_asked = models.IntegerField(default=0)
    
    class Meta:
        unique_together = ['user', 'date']
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.user.username} - {self.date}"
