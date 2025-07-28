from django.urls import path
from .views import ChatSessionView, ChatMessageView, StudyPlanView, ExplainConceptView

urlpatterns = [
    path('sessions/', ChatSessionView.as_view(), name='chat_sessions'),
    path('sessions/<uuid:session_id>/', ChatSessionView.as_view(), name='chat_session_detail'),
    path('sessions/<uuid:session_id>/messages/', ChatMessageView.as_view(), name='chat_messages'),
    path('study-plan/', StudyPlanView.as_view(), name='study_plan'),
    path('explain/', ExplainConceptView.as_view(), name='explain_concept'),
]
