from django.urls import path
from .views import ChatSessionView, ChatMessageView, StudyPlanView

urlpatterns = [
    path('sessions/', ChatSessionView.as_view(), name='chat_sessions'),
    path('sessions/<uuid:session_id>/messages/', ChatMessageView.as_view(), name='chat_messages'),
    path('study-plan/', StudyPlanView.as_view(), name='study_plan'),
]
