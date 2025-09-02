import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { QuizSession } from '../types';

interface UseQuizHistoryDataProps {
  userId: string | undefined;
  startDate?: Date;
  endDate?: Date;
}

// Define a simplified type for table display if needed, or use QuizSession directly
type QuizHistoryEntry = Pick<QuizSession, 'id' | 'title' | 'type' | 'completed_at' | 'total_points' | 'max_points' | 'estimated_minutes'> & {
  questions_count: number;
};

export function useQuizHistoryData({ userId, startDate, endDate }: UseQuizHistoryDataProps) {
  const [data, setData] = useState<QuizHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuizHistory = useCallback(async () => {
    if (!userId) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 useQuizHistoryData: Fetching quiz history for user:', userId, 'with date range:', startDate, endDate);

      let query = supabase
        .from('quiz_sessions')
        .select(`
          id,
          title,
          type,
          completed_at,
          total_points,
          max_points,
          estimated_minutes,
          questions
        `)
        .eq('user_id', userId)
        .eq('status', 'completed');

      if (startDate) {
        query = query.gte('completed_at', startDate.toISOString());
      }
      if (endDate) {
        const endDatePlusOne = new Date(endDate);
        endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
        query = query.lt('completed_at', endDatePlusOne.toISOString());
      }

      query = query.order('completed_at', { ascending: false });

      const { data: sessions, error: sessionsError } = await query;

      if (sessionsError) {
        console.error('❌ useQuizHistoryData: Error fetching quiz sessions:', sessionsError);
        throw sessionsError;
      }

      console.log('✅ useQuizHistoryData: Fetched', sessions?.length || 0, 'quiz history entries.');
      
      // Calculate questions_count from the questions array
      const processedSessions = (sessions || []).map(session => ({
        ...session,
        questions_count: Array.isArray(session.questions) ? session.questions.length : 0
      }));
      
      setData(processedSessions);

    } catch (err: any) {
      console.error('💥 useQuizHistoryData: Failed to fetch quiz history:', err);
      setError(err.message || 'Failed to load quiz history');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [userId, startDate, endDate]);

  useEffect(() => {
    fetchQuizHistory();
  }, [fetchQuizHistory]);

  return { data, loading, error, refreshData: fetchQuizHistory };
}