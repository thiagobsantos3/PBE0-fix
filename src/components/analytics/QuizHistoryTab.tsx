import React from 'react';
import { useAnalyticsContext } from '../../contexts/AnalyticsContext';
import { QuizHistoryTable } from './QuizHistoryTable';

export function QuizHistoryTab() {
  const {
    quizHistoryData,
    quizHistoryLoading,
    quizHistoryError
  } = useAnalyticsContext();

  return (
    <QuizHistoryTable
      data={quizHistoryData}
      loading={quizHistoryLoading}
      error={quizHistoryError}
    />
  );
}