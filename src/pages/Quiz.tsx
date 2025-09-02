import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/layout/Layout';
import { StatsCard } from '../components/common/StatsCard';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuestion } from '../contexts/QuestionContext';
import { useQuizSession } from '../contexts/QuizSessionContext';
import { supabase } from '../lib/supabase';
import { AlertMessage } from '../components/common/AlertMessage';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/common/Modal';
import { formatTimeAgo } from '../utils/formatters';
import { getQuizTypeIcon, getQuizTypeDisplayName } from '../utils/quizUtils';
import { 
  Zap, 
  Edit, 
  Calendar, 
  ArrowRight,
  Clock,
  Users,
  BookOpen,
  Target,
  Trophy,
  Play,
  RotateCcw,
  CheckCircle,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { formatStudyItemsForAssignment, calculateStudyStreak, formatTotalTime } from '../utils/quizHelpers';
import { useUserAnalytics } from '../hooks/useUserAnalytics';

interface RecentActivity {
  id: string;
  title: string;
  total_points: number;
  max_points: number;
  completed_at: string;
  estimated_minutes: number;
  type: string;
}

export function Quiz() {
  const { developerLog } = useAuth();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { questions } = useQuestion();
  const { getActiveSessionsForUser, deleteQuizSession } = useQuizSession();
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [sessionToDeleteId, setSessionToDeleteId] = useState<string | null>(null);

  // Get active quiz sessions for the current user
  const activeSessions = user ? getActiveSessionsForUser(user.id) : [];

  // Memoize date range to prevent unnecessary re-renders
  const dateRange = useMemo(() => ({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    endDate: new Date()
  }), []);

  // Fetch user analytics data (last 30 days by default)
  const { data: userAnalytics, loading: analyticsLoading, error: analyticsError } = useUserAnalytics({
    userId: user?.id,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  });

  // Debug logging for Quiz Center analytics data
  React.useEffect(() => {
    developerLog('🔍 Quiz Center: Analytics data received:', {
      userAnalytics,
      analyticsLoading,
      analyticsError,
      userId: user?.id,
      dateRange
    });
  }, [userAnalytics, analyticsLoading, analyticsError, user?.id, dateRange, developerLog]);

  // Memoized helper functions
  const calculateAccuracy = React.useCallback((totalPoints: number, maxPoints: number): number => {
    if (maxPoints === 0) return 0;
    return Math.round((totalPoints / maxPoints) * 100);
  }, []);

  const calculateProgress = React.useCallback((currentIndex: number, totalQuestions: number): number => {
    if (totalQuestions === 0) return 0;
    return Math.round((currentIndex / totalQuestions) * 100);
  }, []);

  const handleDeleteClick = React.useCallback((sessionId: string) => {
    setSessionToDeleteId(sessionId);
    setShowDeleteConfirmModal(true);
  }, []);

  const loadRecentActivities = async () => {
    if (!user) return;

    try {
      setLoadingActivities(true);
      setActivitiesError(null);

      developerLog('📥 Loading recent quiz activities for user:', user.id);

      const { data, error } = await supabase
        .from('quiz_sessions')
        .select('id, title, total_points, max_points, completed_at, estimated_minutes, type')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('❌ Error loading recent activities:', error);
        throw error;
      }

      developerLog('✅ Recent activities loaded:', data?.length || 0, 'activities');
      developerLog('🔍 Quiz Center: Recent activities data:', data);
      setRecentActivities(data || []);
    } catch (error) {
      console.error('💥 Error loading recent activities:', error);
      setActivitiesError('Failed to load recent quiz activities');
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleDeleteConfirm = React.useCallback(async () => {
    if (!sessionToDeleteId) return;

    try {
      await deleteQuizSession(sessionToDeleteId);
      // Reload recent activities to refresh the UI
      await loadRecentActivities();
      setShowDeleteConfirmModal(false);
      setSessionToDeleteId(null);
    } catch (error) {
      console.error('Error deleting quiz session:', error);
      // You could add error handling UI here
    }
  }, [sessionToDeleteId, deleteQuizSession, loadRecentActivities]);

  const handleResumeQuiz = React.useCallback((sessionId: string) => {
    navigate(`/quiz/runner/${sessionId}`);
  }, [navigate]);

  // Load recent quiz activities
  useEffect(() => {
    if (user) {
      loadRecentActivities();
    } else {
      setLoadingActivities(false);
    }
  }, [user]);

  const quizOptions = [
    {
      id: 'quick-start',
      title: 'Quick Start',
      description: 'Jump into a random quiz with questions from your subscription tier. Perfect for quick practice sessions.',
      icon: Zap,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      hoverColor: 'hover:bg-green-100',
      features: [
        'Random questions from your tier',
        '90 questions per session',
        'Instant feedback',
        'Mock PBE test experience'
      ],
      action: 'Start Quiz',
      onClick: () => navigate('/quiz/quick-start'),
      disabled: !user?.planSettings?.allow_quick_start_quiz,
      tooltip: user?.planSettings?.allow_quick_start_quiz ? '' : 'Not available on your current plan',
    },
    {
      id: 'create-your-own',
      title: 'Create Your Own',
      description: 'Build custom quizzes by selecting specific books, chapters, and difficulty levels. Tailor your study experience.',
      icon: Edit,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      hoverColor: 'hover:bg-blue-100',
      features: [
        'Choose specific Bible books',
        'Select chapter ranges',
        'Set difficulty level',
        'Customize question count'
      ],
      action: 'Create Quiz',
      onClick: () => navigate('/quiz/create-own'),
      disabled: !user?.planSettings?.allow_create_own_quiz,
      tooltip: user?.planSettings?.allow_create_own_quiz ? '' : 'Not available on your current plan',
    },
    {
      id: 'study-schedule',
      title: 'Study Schedule',
      description: 'Follow a structured study plan with progressive difficulty and comprehensive coverage of the material.',
      icon: Calendar,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      hoverColor: 'hover:bg-purple-100',
      features: [
        'Structured learning path',
        'Progressive difficulty',
        'Track your progress',
        'Daily study goals'
      ],
      action: 'View Schedule',
      onClick: () => navigate('/schedule'),
      disabled: !user?.planSettings?.allow_study_schedule_quiz,
      tooltip: user?.planSettings?.allow_study_schedule_quiz ? '' : 'Upgrade to Pro plan to access Study Schedule',
    }
  ];

  // Calculate real statistics
  const stats = useMemo(() => {
    // Questions available
    const questionsAvailable = questions.length;
    
    // Use analytics data for more accurate metrics (last 30 days)
    const averageScore = userAnalytics?.averageScore || 0;
    const studyStreak = userAnalytics?.studyStreak || 0;
    const totalStudyTime = userAnalytics?.totalTimeSpentMinutes || 0;
    
    // Fallback to recent activities if analytics not available or has error
    let fallbackAverageScore = 0;
    if (recentActivities.length > 0) {
      const totalEarned = recentActivities.reduce((sum, activity) => sum + activity.total_points, 0);
      const totalPossible = recentActivities.reduce((sum, activity) => sum + activity.max_points, 0);
      fallbackAverageScore = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
    }
    const fallbackStudyStreak = calculateStudyStreak(recentActivities);
    const fallbackTimeMinutes = recentActivities.reduce((sum, activity) => sum + (activity.estimated_minutes || 0), 0);
    
    // Use fallback if analytics has error or is not available
    const useFallback = analyticsError || !userAnalytics;
    
    // Debug logging for stats calculation
    developerLog('🔍 Quiz Center: Stats calculation debug:', {
      userAnalytics,
      analyticsError,
      useFallback,
      recentActivitiesCount: recentActivities.length,
      fallbackAverageScore,
      fallbackStudyStreak,
      fallbackTimeMinutes,
      finalValues: {
        averageScore: useFallback ? fallbackAverageScore : averageScore,
        studyStreak: useFallback ? fallbackStudyStreak : studyStreak,
        totalStudyTime: useFallback ? fallbackTimeMinutes : totalStudyTime
      }
    });

    return [
      { 
        label: 'Questions Available', 
        value: questionsAvailable > 0 ? `${questionsAvailable}` : '0', 
        icon: BookOpen 
      },
      { 
        label: 'Average Score', 
        value: `${useFallback ? fallbackAverageScore : averageScore}%`, 
        icon: Target 
      },
      { 
        label: 'Study Streak', 
        value: (useFallback ? fallbackStudyStreak : studyStreak) > 0 
          ? `${useFallback ? fallbackStudyStreak : studyStreak} day${(useFallback ? fallbackStudyStreak : studyStreak) !== 1 ? 's' : ''}` 
          : '0 days', 
        icon: Trophy 
      },
      { 
        label: 'Study Time', 
        value: useFallback
          ? formatTotalTime(fallbackTimeMinutes) || '0m'
          : formatTotalTime(totalStudyTime) || '0m', 
        icon: Clock 
      },
    ];
  }, [questions.length, recentActivities, userAnalytics, analyticsError, developerLog]);

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Quiz Center</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Practice your Pathfinder Bible Experience knowledge with interactive quizzes.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            📊 Stats show your performance over the last 30 days
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {stats.map((stat) => (
            <StatsCard
              key={stat.label}
              title={stat.label}
              value={analyticsLoading && stat.label === 'Study Time' && !analyticsError ? 'Loading...' : stat.value}
              icon={stat.icon}
              iconColor="text-indigo-600"
            />
          ))}
        </div>

        {/* Active Quiz Sessions */}
        {activeSessions.length > 0 && (
          <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <RotateCcw className="h-5 w-5 text-blue-600" />
              <span>Resume Quiz Sessions</span>
            </h2>
            <div className="space-y-4">
              {activeSessions.map((session) => {
                const progress = calculateProgress(session.current_question_index, session.questions.length);
                const questionsCompleted = session.results.length;
                const totalQuestions = session.questions.length;
                
                // Get session to delete for modal
                const sessionToDelete = activeSessions.find(s => s.id === sessionToDeleteId);
                
                return (
                  <div key={session.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors duration-200 space-y-4 sm:space-y-0">
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        {React.createElement(getQuizTypeIcon(session.type), { className: "h-6 w-6 text-blue-600" })}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-gray-900 truncate">{session.title}</h3>
                        <div className="flex flex-wrap gap-x-2 text-sm text-gray-600">
                          <span className="min-w-0 max-w-full truncate">{getQuizTypeDisplayName(session.type)}</span>
                          <span>•</span>
                          {session.type === 'study-assignment' && (
                            <>
                              <span className="min-w-0 max-w-full truncate">{formatStudyItemsForAssignment(session.study_items || [])}</span>
                              <span>•</span>
                            </>
                          )}
                          <span className="min-w-0 max-w-full truncate">Question {session.current_question_index + 1} of {totalQuestions}</span>
                          <span>•</span>
                          <span className="min-w-0 max-w-full truncate">{session.total_points} points earned</span>
                        </div>
                        <div className="mt-2">
                          <div className="w-full sm:w-48 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {progress}% complete ({questionsCompleted}/{totalQuestions} answered)
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 w-full sm:w-auto justify-end flex-shrink-0">
                      <div className="text-right text-sm text-gray-600 flex-shrink-0">
                        <div>Started</div>
                        <div>{formatTimeAgo(session.created_at)}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteClick(session.id)}
                        className="flex items-center space-x-2 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200"
                        title="Delete quiz session"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleResumeQuiz(session.id)}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>Resume</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteConfirmModal}
          onClose={() => {
            setShowDeleteConfirmModal(false);
            setSessionToDeleteId(null);
          }}
          title="Delete Quiz Session"
          footer={
            <>
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setSessionToDeleteId(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
              >
                Delete Session
              </button>
            </>
          }
        >
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <p className="text-gray-900 mb-2">
                Are you sure you want to delete this quiz session?
              </p>
              <p className="text-sm text-gray-600">
                This action cannot be undone. All progress and results for this session will be permanently lost.
              </p>
            </div>
          </div>
        </Modal>

        {/* Quiz Options */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {quizOptions.map((option) => (
            <div
              key={option.id}
              className={`relative bg-white rounded-xl shadow-sm border-2 ${option.borderColor} transition-all duration-200 group ${
                option.disabled 
                  ? 'opacity-60 cursor-not-allowed' 
                  : `${option.hoverColor} hover:shadow-md cursor-pointer`
              }`}
            >
              {option.disabled && option.tooltip && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-xl z-10">
                  <span className="text-white text-center p-4 font-semibold text-sm">
                    {option.tooltip}
                  </span>
                </div>
              )}
              <div className="p-6 sm:p-8">
                {/* Header */}
                <div className="flex items-center mb-4">
                  <div className={`h-12 w-12 ${option.color} rounded-lg flex items-center justify-center`}>
                    <option.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                      {option.title}
                    </h3>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {option.description}
                </p>

                {/* Features */}
                <div className="space-y-2 mb-6">
                  {option.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-600">
                      <div className="h-1.5 w-1.5 bg-gray-400 rounded-full mr-3 flex-shrink-0"></div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                <button
                  onClick={option.onClick}
                  disabled={option.disabled}
                  className={`w-full flex items-center justify-center space-x-2 py-3 px-4 ${option.color} text-white rounded-lg transition-all duration-200 ${
                    option.disabled 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:opacity-90 group-hover:shadow-lg'
                  }`}
                >
                  <Play className="h-4 w-4" />
                  <span className="font-medium">{option.action}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Quiz Activity</h2>
          
          {/* Loading State */}
          {loadingActivities && (
            <LoadingSpinner text="Loading recent activities..." className="py-8" />
          )}

          {/* Error State */}
          {activitiesError && (
            <AlertMessage
              type="error"
              message={activitiesError}
              className="mb-4"
            />
          )}

          {/* Activities List */}
          {!loadingActivities && !activitiesError && (
            <div className="space-y-4">
              {recentActivities.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recent Activity</h3>
                  <p className="text-gray-600 mb-4">
                    You haven't completed any quizzes yet. Start your first quiz to see your activity here!
                  </p>
                  {user?.planSettings?.allow_quick_start_quiz && (
                    <button
                      onClick={() => navigate('/quiz/quick-start')}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                    >
                      Start Your First Quiz
                    </button>
                  )}
                </div>
              ) : (
                recentActivities.map((activity) => {
                  const accuracy = calculateAccuracy(activity.total_points, activity.max_points);
                  const timeAgo = formatTimeAgo(activity.completed_at);
                  const IconComponent = getQuizTypeIcon(activity.type);
                  
                  return (
                    <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <IconComponent className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate">{activity.title}</p>
                          <div className="flex flex-wrap gap-x-2 text-sm text-gray-600">
                            <span className="min-w-0 max-w-full truncate">Completed with {accuracy}% accuracy</span>
                            <span>•</span>
                            <span className="min-w-0 max-w-full truncate">{activity.total_points}/{activity.max_points} points</span>
                            {activity.estimated_minutes > 0 && (
                              <>
                                <span>•</span>
                                <span className="min-w-0 max-w-full truncate">~{activity.estimated_minutes} min</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500 whitespace-nowrap flex-shrink-0">{timeAgo}</span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}