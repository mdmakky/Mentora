from django.urls import path
from .views import (
    StudyInsightsView,
    TopicDifficultyView,
    StudyProgressView,
    StudySessionTrackingView
)

urlpatterns = [
    path('insights/', StudyInsightsView.as_view(), name='study_insights'),
    path('topic-difficulty/', TopicDifficultyView.as_view(), name='topic_difficulty'),
    path('progress/', StudyProgressView.as_view(), name='study_progress'),
    path('session/', StudySessionTrackingView.as_view(), name='study_session'),
]
