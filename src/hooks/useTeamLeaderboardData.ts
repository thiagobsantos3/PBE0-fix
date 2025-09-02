import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { calculateStudyStreak } from '../utils/quizHelpers';
import { useAuth } from '../contexts/AuthContext';

interface TeamMemberAnalytics {
  userId: string;
  userName: string;
  totalQuizzesCompleted: number;
  totalQuestionsAnswered: number;
  averageScore: number; // Percentage
  totalTimeSpentMinutes: number;
  studyStreak: number;
  totalPointsEarned: number;
  totalPossiblePoints: number;
}

interface UseTeamLeaderboardDataProps {
  teamId: string | undefined;
  startDate?: Date;
  endDate?: Date;
}

export function useTeamLeaderboardData({ teamId, startDate, endDate }: UseTeamLeaderboardDataProps) {
  const { developerLog } = useAuth();
  const [data, setData] = useState<TeamMemberAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamLeaderboardData = useCallback(async () => {
    if (!teamId) {
      developerLog('🔍 useTeamLeaderboardData: No teamId provided, skipping data fetch');
      setLoading(false);
      setData([]);
      return;
    }

    developerLog('🔍 useTeamLeaderboardData: Starting team leaderboard data fetch for team:', teamId, 'with date range:', startDate, endDate);

    setLoading(true);
    setError(null);

    try {
      // Use the secure database function to get team leaderboard data
      developerLog('🔍 useTeamLeaderboardData: Using secure function to fetch team leaderboard data');
      
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .rpc('get_team_leaderboard_data', { p_team_id: teamId });

      if (leaderboardError) {
        console.error('❌ Error fetching team leaderboard data:', leaderboardError);
        throw leaderboardError;
      }

      developerLog('✅ useTeamLeaderboardData: Fetched leaderboard data:', leaderboardData?.length || 0, 'members');

      // Transform the data to match our interface
      const transformedData: TeamMemberAnalytics[] = (leaderboardData || []).map(member => ({
        userId: member.user_id,
        userName: member.user_name,
        role: member.role,
        totalQuizzesCompleted: Number(member.total_quizzes_completed),
        totalQuestionsAnswered: Number(member.total_questions_answered),
        averageScore: Number(member.average_score),
        totalTimeSpentMinutes: Number(member.total_quizzes_completed) === 0 ? 0 : Number(member.total_time_spent_minutes),
        studyStreak: Number(member.study_streak),
        totalPointsEarned: Number(member.total_points_earned),
        totalPossiblePoints: Number(member.total_possible_points),
      }));

      developerLog('✅ useTeamLeaderboardData: Transformed leaderboard data:', transformedData);
      setData(transformedData);

    } catch (err: any) {
      console.error('❌ useTeamLeaderboardData: Error fetching team leaderboard data:', err);
      setError(err.message || 'Failed to load team leaderboard data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [teamId, startDate, endDate, developerLog]);

  useEffect(() => {
    fetchTeamLeaderboardData();
  }, [fetchTeamLeaderboardData]);

  return { data, loading, error, refreshData: fetchTeamLeaderboardData };
}