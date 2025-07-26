from django.urls import path
from .views import (
    DocumentUploadView,
    DocumentSummaryView,
    QuestionBankUploadView,
    FlashcardGeneratorView,
    ConceptExplanationView,
    DocumentListView
)

urlpatterns = [
    path('upload/', DocumentUploadView.as_view(), name='document_upload'),
    path('documents/', DocumentListView.as_view(), name='document_list'),
    path('documents/<uuid:document_id>/summary/', DocumentSummaryView.as_view(), name='document_summary'),
    path('questions/upload/', QuestionBankUploadView.as_view(), name='question_bank_upload'),
    path('flashcards/generate/', FlashcardGeneratorView.as_view(), name='generate_flashcards'),
    path('explain/', ConceptExplanationView.as_view(), name='explain_concept'),
]
