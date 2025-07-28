from django.urls import path
from .views import ChatSessionView, ChatMessageView, StudyPlanView, ExplainConceptView
from .admin_views import AIConfigView, AIPromptTestView, DocumentSummaryView

urlpatterns = [
    path('sessions/', ChatSessionView.as_view(), name='chat_sessions'),
    path('sessions/<uuid:session_id>/', ChatSessionView.as_view(), name='chat_session_detail'),
    path('sessions/<uuid:session_id>/messages/', ChatMessageView.as_view(), name='chat_messages'),
    path('study-plan/', StudyPlanView.as_view(), name='study_plan'),
    path('explain/', ExplainConceptView.as_view(), name='explain_concept'),
    
    # Admin endpoints for AI configuration
    path('admin/config/', AIConfigView.as_view(), name='ai_config'),
    path('admin/test-prompt/', AIPromptTestView.as_view(), name='test_prompt'),
    path('admin/documents/', DocumentSummaryView.as_view(), name='document_summary'),
]
