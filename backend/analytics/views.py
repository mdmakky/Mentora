from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models import Sum, Count, Avg
from datetime import timedelta, date
from .models import StudyAnalytics, TopicDifficulty, DailyStudyLog
from reader.models import Document, Topic, StudySession
from chat.models import ChatMessage


class StudyInsightsView(APIView):
    """Get comprehensive study insights for a user."""
    
    def get(self, request):
        try:
            user = request.user if request.user.is_authenticated else User.objects.get(id=1)
            
            # Get or create analytics record
            analytics, created = StudyAnalytics.objects.get_or_create(user=user)
            
            # Calculate current statistics
            total_documents = Document.objects.filter(user=user).count()
            total_study_sessions = StudySession.objects.filter(user=user).count()
            total_study_time = StudySession.objects.filter(user=user).aggregate(
                total=Sum('duration_minutes')
            )['total'] or 0
            
            total_questions = ChatMessage.objects.filter(
                session__user=user, 
                message_type='user'
            ).count()
            
            # Get recent activity (last 7 days)
            week_ago = timezone.now() - timedelta(days=7)
            recent_sessions = StudySession.objects.filter(
                user=user,
                start_time__gte=week_ago
            )
            
            weekly_time = recent_sessions.aggregate(total=Sum('duration_minutes'))['total'] or 0
            weekly_sessions = recent_sessions.count()
            
            # Most studied topics
            topic_time = {}
            for session in StudySession.objects.filter(user=user):
                if session.topic:
                    topic_name = session.topic.name
                    topic_time[topic_name] = topic_time.get(topic_name, 0) + session.duration_minutes
            
            most_studied_topics = sorted(topic_time.items(), key=lambda x: x[1], reverse=True)[:5]
            
            # Difficult topics
            difficult_topics = TopicDifficulty.objects.filter(
                user=user,
                difficulty_level__gte=4
            ).order_by('-difficulty_level', '-time_spent')[:5]
            
            difficult_topics_data = [
                {
                    'topic': td.topic.name,
                    'difficulty_level': td.difficulty_level,
                    'time_spent': td.time_spent,
                    'questions_asked': td.questions_asked
                }
                for td in difficult_topics
            ]
            
            # Study streak calculation
            study_dates = DailyStudyLog.objects.filter(
                user=user,
                total_time__gt=0
            ).values_list('date', flat=True).order_by('-date')
            
            streak = self._calculate_study_streak(list(study_dates))
            
            # Update analytics
            analytics.total_study_time = total_study_time
            analytics.documents_studied = total_documents
            analytics.questions_asked = total_questions
            analytics.most_studied_topics = [topic for topic, _ in most_studied_topics]
            analytics.study_streak = streak
            analytics.save()
            
            return Response({
                'overview': {
                    'total_documents': total_documents,
                    'total_study_time': total_study_time,
                    'total_sessions': total_study_sessions,
                    'total_questions': total_questions,
                    'study_streak': streak
                },
                'weekly_stats': {
                    'time_spent': weekly_time,
                    'sessions': weekly_sessions,
                    'avg_session_time': weekly_time // weekly_sessions if weekly_sessions > 0 else 0
                },
                'most_studied_topics': [
                    {'topic': topic, 'time_minutes': time}
                    for topic, time in most_studied_topics
                ],
                'difficult_topics': difficult_topics_data,
                'recommendations': self._generate_recommendations(user, analytics)
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _calculate_study_streak(self, study_dates):
        """Calculate consecutive days of study."""
        if not study_dates:
            return 0
        
        streak = 0
        current_date = date.today()
        
        for study_date in study_dates:
            if study_date == current_date or study_date == current_date - timedelta(days=streak):
                streak += 1
                current_date = study_date
            else:
                break
        
        return streak
    
    def _generate_recommendations(self, user, analytics):
        """Generate personalized study recommendations."""
        recommendations = []
        
        # Check study consistency
        if analytics.study_streak < 3:
            recommendations.append({
                'type': 'consistency',
                'title': 'Build a Study Habit',
                'message': 'Try to study for at least 30 minutes daily to build consistency.'
            })
        
        # Check difficult topics
        difficult_count = TopicDifficulty.objects.filter(
            user=user, 
            difficulty_level__gte=4
        ).count()
        
        if difficult_count > 0:
            recommendations.append({
                'type': 'difficulty',
                'title': 'Focus on Challenging Topics',
                'message': f'You have {difficult_count} topics marked as difficult. Consider spending more time on these.'
            })
        
        # Check recent activity
        recent_activity = DailyStudyLog.objects.filter(
            user=user,
            date__gte=date.today() - timedelta(days=3)
        ).count()
        
        if recent_activity == 0:
            recommendations.append({
                'type': 'activity',
                'title': 'Resume Your Studies',
                'message': 'You haven\'t studied in the last 3 days. Get back on track!'
            })
        
        return recommendations


class TopicDifficultyView(APIView):
    """Track and manage topic difficulty ratings."""
    
    def post(self, request):
        """Rate a topic's difficulty."""
        try:
            topic_id = request.data.get('topic_id')
            difficulty_level = request.data.get('difficulty_level')
            time_spent = request.data.get('time_spent', 0)
            
            if not topic_id or not difficulty_level:
                return Response({
                    'error': 'topic_id and difficulty_level are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            user = request.user if request.user.is_authenticated else User.objects.get(id=1)
            topic = get_object_or_404(Topic, id=topic_id)
            
            difficulty, created = TopicDifficulty.objects.get_or_create(
                user=user,
                topic=topic,
                defaults={'difficulty_level': difficulty_level, 'time_spent': time_spent}
            )
            
            if not created:
                difficulty.difficulty_level = difficulty_level
                difficulty.time_spent += time_spent
                difficulty.save()
            
            return Response({
                'topic': topic.name,
                'difficulty_level': difficulty.difficulty_level,
                'total_time_spent': difficulty.time_spent,
                'message': 'Topic difficulty updated successfully'
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get(self, request):
        """Get all topic difficulties for user."""
        try:
            user = request.user if request.user.is_authenticated else User.objects.get(id=1)
            difficulties = TopicDifficulty.objects.filter(user=user)
            
            difficulties_data = [
                {
                    'topic_id': td.topic.id,
                    'topic_name': td.topic.name,
                    'document_title': td.topic.document.title,
                    'difficulty_level': td.difficulty_level,
                    'time_spent': td.time_spent,
                    'questions_asked': td.questions_asked,
                    'last_studied': td.last_studied
                }
                for td in difficulties
            ]
            
            return Response({
                'topic_difficulties': difficulties_data,
                'count': len(difficulties_data)
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StudyProgressView(APIView):
    """Track study progress over time."""
    
    def get(self, request):
        """Get study progress data for charts."""
        try:
            user = request.user if request.user.is_authenticated else User.objects.get(id=1)
            days = int(request.query_params.get('days', 30))
            
            end_date = date.today()
            start_date = end_date - timedelta(days=days)
            
            # Get daily study logs
            daily_logs = DailyStudyLog.objects.filter(
                user=user,
                date__range=[start_date, end_date]
            ).order_by('date')
            
            # Prepare data for charts
            study_data = []
            current_date = start_date
            
            while current_date <= end_date:
                log = daily_logs.filter(date=current_date).first()
                study_data.append({
                    'date': current_date.isoformat(),
                    'total_time': log.total_time if log else 0,
                    'questions_asked': log.questions_asked if log else 0,
                    'flashcards_reviewed': log.flashcards_reviewed if log else 0
                })
                current_date += timedelta(days=1)
            
            # Topic-wise time distribution
            topic_distribution = {}
            sessions = StudySession.objects.filter(
                user=user,
                start_time__date__range=[start_date, end_date]
            )
            
            for session in sessions:
                if session.topic:
                    topic_name = session.topic.name
                    topic_distribution[topic_name] = topic_distribution.get(topic_name, 0) + session.duration_minutes
            
            return Response({
                'daily_progress': study_data,
                'topic_distribution': [
                    {'topic': topic, 'time': time}
                    for topic, time in topic_distribution.items()
                ],
                'summary': {
                    'total_days': days,
                    'active_days': len([d for d in study_data if d['total_time'] > 0]),
                    'total_time': sum(d['total_time'] for d in study_data),
                    'avg_daily_time': sum(d['total_time'] for d in study_data) / days
                }
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StudySessionTrackingView(APIView):
    """Track study sessions in real-time."""
    
    def post(self, request):
        """Start or end a study session."""
        try:
            action = request.data.get('action')  # 'start' or 'end'
            document_id = request.data.get('document_id')
            topic_id = request.data.get('topic_id')
            
            user = request.user if request.user.is_authenticated else User.objects.get(id=1)
            
            if action == 'start':
                # Start new session
                session_data = {
                    'user': user,
                    'document_id': document_id,
                    'topic_id': topic_id
                }
                
                if document_id:
                    session_data['document'] = get_object_or_404(Document, id=document_id)
                if topic_id:
                    session_data['topic'] = get_object_or_404(Topic, id=topic_id)
                
                session = StudySession.objects.create(**session_data)
                
                return Response({
                    'session_id': session.id,
                    'message': 'Study session started',
                    'start_time': session.start_time
                })
                
            elif action == 'end':
                # End existing session
                session_id = request.data.get('session_id')
                if not session_id:
                    return Response({
                        'error': 'session_id is required to end session'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                session = get_object_or_404(StudySession, id=session_id, user=user)
                session.end_time = timezone.now()
                
                # Calculate duration
                duration = session.end_time - session.start_time
                session.duration_minutes = int(duration.total_seconds() / 60)
                session.save()
                
                # Update daily log
                today = date.today()
                daily_log, created = DailyStudyLog.objects.get_or_create(
                    user=user,
                    date=today
                )
                daily_log.total_time += session.duration_minutes
                daily_log.save()
                
                if session.document:
                    daily_log.documents_accessed.add(session.document)
                if session.topic:
                    daily_log.topics_studied.add(session.topic)
                
                return Response({
                    'session_id': session.id,
                    'duration_minutes': session.duration_minutes,
                    'message': 'Study session ended'
                })
            
            else:
                return Response({
                    'error': 'Invalid action. Use "start" or "end"'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
