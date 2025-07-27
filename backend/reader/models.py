from django.db import models
from django.contrib.auth.models import User
import uuid
import json


class Document(models.Model):
    """Model for uploaded PDF documents."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='documents')
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='documents/')
    upload_date = models.DateTimeField(auto_now_add=True)
    total_pages = models.IntegerField(default=0)
    topics = models.JSONField(default=list, blank=True)  # Detected topics
    is_processed = models.BooleanField(default=False)
    is_embedded = models.BooleanField(default=False)  # Track if embeddings are created
    
    class Meta:
        ordering = ['-upload_date']

    def __str__(self):
        return f"{self.title} - {self.user.username}"


class Page(models.Model):
    """Model for individual pages of a document."""
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='pages')
    page_number = models.IntegerField()
    content = models.TextField()
    summary = models.TextField(blank=True)
    
    class Meta:
        unique_together = ['document', 'page_number']
        ordering = ['page_number']

    def __str__(self):
        return f"{self.document.title} - Page {self.page_number}"


class DocumentChunk(models.Model):
    """Model for text chunks with embeddings for semantic search."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='chunks')
    page = models.ForeignKey(Page, on_delete=models.CASCADE, related_name='chunks')
    chunk_text = models.TextField()
    chunk_index = models.IntegerField()  # Index within the page
    start_char = models.IntegerField(default=0)  # Start position in page text
    end_char = models.IntegerField(default=0)  # End position in page text
    embedding_id = models.CharField(max_length=255, blank=True)  # ID in vector DB
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['page__page_number', 'chunk_index']
        unique_together = ['page', 'chunk_index']
    
    def __str__(self):
        return f"Chunk {self.chunk_index} - {self.document.title} - Page {self.page.page_number}"


class Topic(models.Model):
    """Model for detected topics in documents."""
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='document_topics')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    pages = models.ManyToManyField(Page, blank=True)
    
    def __str__(self):
        return f"{self.name} - {self.document.title}"


class QuestionBank(models.Model):
    """Model for uploaded question banks."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='question_banks')
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='question_banks/')
    upload_date = models.DateTimeField(auto_now_add=True)
    year = models.IntegerField(null=True, blank=True)
    subject = models.CharField(max_length=255, blank=True)
    topics = models.JSONField(default=list, blank=True)
    question_types = models.JSONField(default=list, blank=True)
    is_analyzed = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-upload_date']

    def __str__(self):
        return f"{self.title} - {self.user.username}"


class Flashcard(models.Model):
    """Model for generated flashcards."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='flashcards')
    document = models.ForeignKey(Document, on_delete=models.CASCADE, null=True, blank=True)
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, null=True, blank=True)
    question = models.TextField()
    answer = models.TextField()
    created_date = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Flashcard: {self.question[:50]}..."


class StudySession(models.Model):
    """Model to track study sessions and time spent."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='study_sessions')
    document = models.ForeignKey(Document, on_delete=models.CASCADE, null=True, blank=True)
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, null=True, blank=True)
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(default=0)
    pages_viewed = models.JSONField(default=list, blank=True)
    
    def __str__(self):
        return f"Study Session - {self.user.username} - {self.start_time.date()}"
