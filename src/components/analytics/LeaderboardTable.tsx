import React, { useState } from 'react';
import { Table, TableColumn } from '../common/Table';
import { Badge } from '../common/Badge';
import { formatTotalTime } from '../../utils/quizHelpers';
import { 
  Trophy, 
  Medal, 
  Award,
  TrendingUp,
  Clock,
  Target,
  BookOpen,
  Zap
} from 'lucide-react';

interface TeamMemberAnalytics {
  userId: string;
  userName: string;
  role: string;
  totalQuizzesCompleted: number;
  totalQuestionsAnswered: number;
  averageScore: number;
  totalTimeSpentMinutes: number;
  studyStreak: number;
  totalPointsEarned: number;
  totalPossiblePoints: number;
}

interface LeaderboardTableProps {
  data: TeamMemberAnalytics[];
  loading: boolean;
  error: string | null;
}

export function LeaderboardTable({ data, loading, error }: LeaderboardTableProps) {
  const [sortField, setSortField] = useState<keyof TeamMemberAnalytics>('totalPointsEarned');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter out team owners and admins from the leaderboard display
  const filteredData = data.filter(member => member.role === 'member');

  // Sort data based on current sort field and direction
  const sortedData = React.useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'desc' 
          ? bValue.localeCompare(aValue)
          : aValue.localeCompare(bValue);
      }
      
      return 0;
    });
  }, [filteredData, sortField, sortDirection]);

  const handleSort = (field: keyof TeamMemberAnalytics) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to descending for new fields
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-medium text-gray-500">#{index + 1}</span>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const columns: TableColumn<TeamMemberAnalytics>[] = [
    {
      key: 'rank',
      header: <div className="text-center">Rank</div>,
      render: (_, index) => (
        <div className="flex items-center justify-center">
          {getRankIcon(index)}
        </div>
      ),
      className: 'text-center w-16',
      headerClassName: 'text-center',
    },
    {
      key: 'userName',
      header: 'Team Member',
      render: (member) => (
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-indigo-600">
              {member.userName.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div>
            <div className="font-medium text-gray-900">{member.userName}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'totalPointsEarned',
      header: 'XP',
      render: (member) => (
        <div className="text-center">
          <div className="font-bold text-lg text-gray-900">
            {member.totalPointsEarned.toLocaleString()} XP
          </div>
          <div className="text-xs text-gray-500">
            of {member.totalPossiblePoints.toLocaleString()}
          </div>
        </div>
      ),
      className: 'text-center',
      headerClassName: 'text-center',
      sortable: true,
    },
    {
      key: 'averageScore',
      header: 'Average Score',
      render: (member) => (
        <div className="text-center">
          <div className={`font-bold text-lg ${getScoreColor(member.averageScore)}`}>
            {member.averageScore.toFixed(1)}%
          </div>
        </div>
      ),
      className: 'text-center',
      headerClassName: 'text-center',
      sortable: true,
    },
    {
      key: 'totalQuizzesCompleted',
      header: 'Quizzes',
      render: (member) => (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <BookOpen className="h-4 w-4 text-indigo-600" />
            <span className="font-medium text-gray-900">{member.totalQuizzesCompleted}</span>
          </div>
        </div>
      ),
      className: 'text-center',
      headerClassName: 'text-center',
      sortable: true,
    },
    {
      key: 'totalQuestionsAnswered',
      header: 'Questions',
      render: (member) => (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <Target className="h-4 w-4 text-green-600" />
            <span className="font-medium text-gray-900">{member.totalQuestionsAnswered}</span>
          </div>
        </div>
      ),
      className: 'text-center',
      headerClassName: 'text-center',
      sortable: true,
    },
    {
      key: 'totalTimeSpentMinutes',
      header: 'Study Time',
      render: (member) => (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <Clock className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-gray-900">
              {formatTotalTime(member.totalTimeSpentMinutes)}
            </span>
          </div>
        </div>
      ),
      className: 'text-center',
      headerClassName: 'text-center',
      sortable: true,
    },
    {
      key: 'studyStreak',
      header: 'Streak',
      render: (member) => (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <Zap className="h-4 w-4 text-yellow-600" />
            <span className="font-medium text-gray-900">
              {member.studyStreak} day{member.studyStreak !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      ),
      className: 'text-center',
      headerClassName: 'text-center',
      sortable: true,
    },
  ];

  // Make columns sortable by adding click handlers
  const sortableColumns = columns.map(column => ({
    ...column,
    header: column.sortable ? (
      <button
        onClick={() => handleSort(column.key as keyof TeamMemberAnalytics)}
        className="flex items-center justify-center space-x-1 hover:text-indigo-600 transition-colors duration-200 w-full"
      >
        <span>{column.header}</span>
        {sortField === column.key && (
          <TrendingUp 
            className={`h-3 w-3 transition-transform duration-200 ${
              sortDirection === 'desc' ? 'rotate-180' : ''
            }`} 
          />
        )}
      </button>
    ) : column.header
  }));

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="text-red-600 mb-4">
          <TrendingUp className="h-12 w-12 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Error Loading Leaderboard</h3>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Trophy className="h-6 w-6 text-yellow-500" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Team Leaderboard</h2>
            <p className="text-sm text-gray-600">
              Team performance ranked by total points earned
            </p>
          </div>
        </div>
      </div>
      
      <Table
        columns={sortableColumns}
        data={sortedData}
        loading={loading}
        emptyState={{
          icon: Trophy,
          title: "No Team Data",
          description: "No team member analytics data available yet. Complete some quizzes to see the leaderboard!"
        }}
      />
      
      {data.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            Click column headers to sort • Rankings based on total points earned
          </p>
        </div>
      )}
    </div>
  );
}