from django.urls import path
from .views import (
    DocumentUploadView,
    DocumentSummaryView,
    QuestionBankUploadView,
    FlashcardGeneratorView,
    ConceptExplanationView,
    DocumentListView,
    DocumentDeleteView,
    DocumentFileView,
    SemanticSearchView,
    RAGChatView,
    DocumentStatsView
)
from .views_fast import (
    DocumentUploadViewFast,
    DocumentStatusView,
    DocumentSimpleUploadView
)

urlpatterns = [
    # Original upload (full processing)
    path('upload/', DocumentUploadView.as_view(), name='document_upload'),
    
    # Fast upload options
    path('upload/fast/', DocumentUploadViewFast.as_view(), name='document_upload_fast'),
    path('upload/simple/', DocumentSimpleUploadView.as_view(), name='document_upload_simple'),
    
    # Document management
    path('documents/', DocumentListView.as_view(), name='document_list'),
    path('documents/<uuid:document_id>/summary/', DocumentSummaryView.as_view(), name='document_summary'),
    path('documents/<uuid:document_id>/delete/', DocumentDeleteView.as_view(), name='document_delete'),
    path('documents/<uuid:document_id>/file/', DocumentFileView.as_view(), name='document_file'),
    path('documents/<uuid:document_id>/status/', DocumentStatusView.as_view(), name='document_status'),
    
    # Question banks and study tools
    path('questions/upload/', QuestionBankUploadView.as_view(), name='question_bank_upload'),
    path('flashcards/generate/', FlashcardGeneratorView.as_view(), name='generate_flashcards'),
    path('explain/', ConceptExplanationView.as_view(), name='explain_concept'),
    
    # RAG endpoints
    path('search/', SemanticSearchView.as_view(), name='semantic_search'),
    path('chat/', RAGChatView.as_view(), name='rag_chat'),
    path('stats/', DocumentStatsView.as_view(), name='document_stats'),
]
