import React, { useState } from 'react';
import { Table, TableColumn } from '../common/Table';
import { formatTotalTime } from '../../utils/quizHelpers';
import { getQuizTypeDisplayName } from '../../utils/quizUtils'; // Assuming this utility exists or will be added
import { BookOpen, Calendar, Target, Trophy, Clock, AlertTriangle } from 'lucide-react';
import { QuizDetailsModal } from './QuizDetailsModal';

// Re-define QuizHistoryEntry to match the data returned by the hook
interface QuizHistoryEntry {
  id: string;
  title: string;
  type: 'quick-start' | 'custom' | 'study-assignment';
  completed_at: string;
  total_points: number;
  max_points: number;
  estimated_minutes: number;
  questions_count: number;
}

interface QuizHistoryTableProps {
  data: QuizHistoryEntry[];
  loading: boolean;
  error: string | null;
}

export function QuizHistoryTable({ data, loading, error }: QuizHistoryTableProps) {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedQuizSessionId, setSelectedQuizSessionId] = useState<string | null>(null);
  const [selectedQuizTitle, setSelectedQuizTitle] = useState<string>('');

  const handleRowClick = (entry: QuizHistoryEntry) => {
    setSelectedQuizSessionId(entry.id);
    setSelectedQuizTitle(entry.title);
    setShowDetailsModal(true);
  };

  const columns: TableColumn<QuizHistoryEntry>[] = [
    {
      key: 'title',
      header: 'Quiz Title',
      render: (entry) => (
        <div className="font-medium text-gray-900">{entry.title}</div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (entry) => (
        <div className="flex items-center space-x-2">
          {/* Assuming getQuizTypeIcon is available or can be added */}
          {/* {getQuizTypeIcon(entry.type)} */}
          <span className="text-sm text-gray-600 capitalize">{getQuizTypeDisplayName(entry.type)}</span>
        </div>
      ),
    },
    {
      key: 'completed_at',
      header: 'Date',
      render: (entry) => (
        <span className="text-sm text-gray-600">
          {new Date(entry.completed_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      render: (entry) => {
        const score = entry.max_points > 0 ? (entry.total_points / entry.max_points) * 100 : 0;
        const scoreColor = score >= 90 ? 'text-green-600' : score >= 70 ? 'text-blue-600' : 'text-red-600';
        return (
          <div className={`font-bold text-lg ${scoreColor}`}>
            {score.toFixed(1)}%
          </div>
        );
      },
      className: 'text-center',
      headerClassName: 'text-center',
    },
    {
      key: 'questions_count',
      header: 'Questions',
      render: (entry) => (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <Target className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-gray-900">{entry.questions_count}</span>
          </div>
        </div>
      ),
      className: 'text-center',
      headerClassName: 'text-center',
    },
    {
      key: 'estimated_minutes',
      header: 'Time',
      render: (entry) => (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <Clock className="h-4 w-4 text-orange-600" />
            <span className="font-medium text-gray-900">
              {formatTotalTime(entry.estimated_minutes)}
            </span>
          </div>
        </div>
      ),
      className: 'text-center',
      headerClassName: 'text-center',
    },
  ];

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="text-red-600 mb-4">
          <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Error Loading Quiz History</h3>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <BookOpen className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Completed Quizzes</h2>
            <p className="text-sm text-gray-600">
              Detailed breakdown of quizzes completed by this team member.
            </p>
          </div>
        </div>
      </div>
      
      <Table
        columns={columns}
        data={data}
        loading={loading}
        onRowClick={handleRowClick}
        emptyState={{
          icon: BookOpen,
          title: "No Quizzes Completed",
          description: "This team member has not completed any quizzes in the selected date range."
        }}
      />
      
      {data.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            Showing latest completed quizzes. Click on a row to view detailed results.
          </p>
        </div>
      )}

      <QuizDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedQuizSessionId(null);
          setSelectedQuizTitle('');
        }}
        quizSessionId={selectedQuizSessionId}
        quizTitle={selectedQuizTitle}
      />
    </div>
  );
}