/*
  # Add nickname column and fix leaderboard function

  1. Schema Changes
    - Add `nickname` column to `user_profiles` table
    - Column is optional (nullable) and publicly visible

  2. Function Updates
    - Fix `get_team_leaderboard_data` function to use correct column names
    - Use nickname if available, fallback to name for leaderboard display
    - Ensure proper column references in SELECT and GROUP BY clauses

  3. Security
    - Nickname column follows existing RLS policies
    - Function maintains SECURITY DEFINER for proper access control
*/

-- Add nickname column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS nickname TEXT;

-- Update the team leaderboard function to fix column reference and use nickname
CREATE OR REPLACE FUNCTION get_team_leaderboard_data(
  p_team_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  role TEXT,
  total_quizzes_completed BIGINT,
  total_questions_answered BIGINT,
  average_score NUMERIC,
  total_time_spent_minutes BIGINT,
  study_streak INTEGER,
  total_points_earned BIGINT,
  total_possible_points BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date TIMESTAMP WITH TIME ZONE;
  v_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Set default date range if not provided (last 30 days)
  v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, NOW());
  
  -- Return team member analytics data
  RETURN QUERY
  WITH member_analytics AS (
    SELECT 
      up.id as user_id,
      COALESCE(up.nickname, up.name) as user_name, -- Use nickname if available, fallback to name
      tm.role,
      COUNT(qs.id) as total_quizzes_completed,
      COALESCE(SUM(jsonb_array_length(qs.results)), 0) as total_questions_answered,
      CASE 
        WHEN SUM(qs.max_points) > 0 THEN 
          ROUND((SUM(qs.total_points)::NUMERIC / SUM(qs.max_points)::NUMERIC) * 100, 2)
        ELSE 0 
      END as average_score,
      COALESCE(
        SUM(
          CASE 
            WHEN qs.estimated_minutes > 0 THEN qs.estimated_minutes
            ELSE GREATEST(1, jsonb_array_length(qs.questions) * 2)
          END
        ), 0
      ) as total_time_spent_minutes,
      -- Calculate study streak for each member
      (
        WITH daily_activity AS (
          SELECT DISTINCT DATE(qs.completed_at) as study_date
          FROM quiz_sessions qs
          WHERE qs.user_id = up.id
            AND qs.status = 'completed'
            AND qs.completed_at BETWEEN v_start_date AND v_end_date
          ORDER BY study_date DESC
        ),
        streak_calc AS (
          SELECT 
            study_date,
            ROW_NUMBER() OVER (ORDER BY study_date DESC) as rn,
            study_date - (ROW_NUMBER() OVER (ORDER BY study_date DESC) || ' days')::INTERVAL as grp
          FROM daily_activity
        )
        SELECT COUNT(*)
        FROM streak_calc
        WHERE grp = (SELECT grp FROM streak_calc ORDER BY study_date DESC LIMIT 1)
      ) as study_streak,
      COALESCE(SUM(qs.total_points), 0) as total_points_earned,
      COALESCE(SUM(qs.max_points), 0) as total_possible_points
    FROM user_profiles up
    JOIN team_members tm ON up.id = tm.user_id
    LEFT JOIN quiz_sessions qs ON up.id = qs.user_id 
      AND qs.status = 'completed'
      AND qs.completed_at BETWEEN v_start_date AND v_end_date
    WHERE tm.team_id = p_team_id
    GROUP BY up.id, up.name, up.nickname, tm.role -- Fixed GROUP BY to include actual columns
  )
  SELECT 
    ma.user_id,
    ma.user_name,
    ma.role,
    ma.total_quizzes_completed,
    ma.total_questions_answered,
    ma.average_score,
    ma.total_time_spent_minutes,
    ma.study_streak,
    ma.total_points_earned,
    ma.total_possible_points
  FROM member_analytics ma
  ORDER BY ma.total_points_earned DESC, ma.average_score DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_team_leaderboard_data(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;