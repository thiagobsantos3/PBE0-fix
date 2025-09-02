import React, { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useTeamLeaderboardData } from '../hooks/useTeamLeaderboardData';
import { LeaderboardTable } from '../components/analytics/LeaderboardTable';
import { StatsCard } from '../components/common/StatsCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { AlertMessage } from '../components/common/AlertMessage';
import { formatTotalTime } from '../utils/quizHelpers';
import { 
  Trophy, 
  Users, 
  Target, 
  Clock, 
  Award,
  CalendarDays,
  TrendingUp
} from 'lucide-react';

export function Leaderboard() {
  const { user } = useAuth();
  
  // Date range state - default to last 30 days
  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Fetch team leaderboard data
  const { data: leaderboardData, loading, error, refreshData } = useTeamLeaderboardData({
    teamId: user?.teamId,
    startDate,
    endDate,
  });

  // Handle date range changes
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = new Date(e.target.value);
    setStartDate(newStartDate);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = new Date(e.target.value);
    setEndDate(newEndDate);
  };

  // Format date for input field (YYYY-MM-DD)
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Calculate team summary statistics
  const teamStats = React.useMemo(() => {
    // Filter to only include members with role 'member' for all calculations
    const memberOnlyData = leaderboardData.filter(member => member.role === 'member');
    
    if (!memberOnlyData || memberOnlyData.length === 0) {
      return {
        totalMembers: 0,
        totalQuizzes: 0,
        totalQuestions: 0,
        totalTime: 0,
        averageScore: 0,
        topPerformer: null
      };
    }

    const totalQuizzes = memberOnlyData.reduce((sum, member) => sum + member.totalQuizzesCompleted, 0);
    const totalQuestions = memberOnlyData.reduce((sum, member) => sum + member.totalQuestionsAnswered, 0);
    const totalTime = memberOnlyData.reduce((sum, member) => sum + member.totalTimeSpentMinutes, 0);
    const totalPointsEarned = memberOnlyData.reduce((sum, member) => sum + member.totalPointsEarned, 0);
    const totalPointsPossible = memberOnlyData.reduce((sum, member) => sum + member.totalPossiblePoints, 0);
    const averageScore = totalPointsPossible > 0 ? (totalPointsEarned / totalPointsPossible) * 100 : 0;
    const topPerformer = memberOnlyData.length > 0 ? memberOnlyData[0] : null;

    return {
      totalMembers: memberOnlyData.length,
      totalQuizzes,
      totalQuestions,
      totalTime,
      averageScore,
      topPerformer
    };
  }, [leaderboardData]);

  // Check if user has a team
  if (!user?.teamId) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No Team Found</h2>
            <p className="text-gray-600">You need to be part of a team to view the leaderboard.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Team Leaderboard</h1>
            <p className="text-gray-600">
              Track your team's performance and see how members rank against each other.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={refreshData}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <CalendarDays className="h-5 w-5 text-gray-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Date Range</h3>
                <p className="text-sm text-gray-600">Filter leaderboard data by date range</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-2">
                <label htmlFor="startDate" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  From:
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={formatDateForInput(startDate)}
                  onChange={handleStartDateChange}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <label htmlFor="endDate" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  To:
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={formatDateForInput(endDate)}
                  onChange={handleEndDateChange}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
                />
              </div>
              
              <div className="text-sm text-gray-500">
                {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days
              </div>
            </div>
          </div>
        </div>

        {/* Team Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <StatsCard
            title="Team Members"
            value={teamStats.totalMembers}
            icon={Users}
            iconColor="text-indigo-600"
          />
          <StatsCard
            title="Total Quizzes"
            value={teamStats.totalQuizzes.toLocaleString()}
            icon={Target}
            iconColor="text-green-600"
          />
          <StatsCard
            title="Team Average"
            value={`${teamStats.averageScore.toFixed(1)}%`}
            icon={Award}
            iconColor="text-blue-600"
          />
          <StatsCard
            title="Total Study Time"
            value={formatTotalTime(teamStats.totalTime)}
            icon={Clock}
            iconColor="text-purple-600"
          />
        </div>

        {/* Top Performer Highlight */}
        {teamStats.topPerformer && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6 mb-8">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <Trophy className="h-8 w-8 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  🏆 Top Performer: {teamStats.topPerformer.userName}
                </h3>
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <span>{teamStats.topPerformer.totalPointsEarned.toLocaleString()} points</span>
                  <span>•</span>
                  <span>{teamStats.topPerformer.averageScore.toFixed(1)}% average score</span>
                  <span>•</span>
                  <span>{teamStats.topPerformer.totalQuizzesCompleted} quizzes completed</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <AlertMessage
            type="error"
            message={error}
            className="mb-6"
          />
        )}

        {/* Loading State */}
        {loading && (
          <LoadingSpinner text="Loading team leaderboard..." className="py-8" />
        )}

        {/* Leaderboard Table */}
        {!loading && (
          <LeaderboardTable 
            data={leaderboardData} 
            loading={loading} 
            error={error} 
          />
        )}
      </div>
    </Layout>
  );
}