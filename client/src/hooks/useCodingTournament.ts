import { useEffect, useState, useCallback } from 'react';
import { DatabaseJobFair } from '@fake-stack-overflow/shared';
import jobFairService from '../services/jobFairService';
import useUserContext from './useUserContext';

/**
 * Represents a coding submission in a job fair tournament.
 */
interface CodingSubmission {
  _id?: string;
  code: string;
  language: string;
  submittedAt: Date;
  submittedBy?: string;
  grade?: number;
  feedback?: string;
  gradedAt?: Date;
  gradedBy?: string;
}

/**
 * Custom hook for managing coding tournament functionality within job fairs.
 * Handles code submissions, submission history, and grading (for recruiters).
 */
const useCodingTournament = (jobFairId: string, jobFair: DatabaseJobFair | null) => {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [submissions, setSubmissions] = useState<CodingSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { user: currentUser } = useUserContext();
  const isRecruiter = currentUser.userType === 'recruiter';
  const isHost = jobFair?.hostUsername === currentUser.username;

  // Load existing submissions
  // TODO: May not continue with this part of the job fair
  const loadSubmissions = useCallback(() => {
    // TODO: Fetch full submissions from backend once endpoint is implemented
    // For now, submissions are loaded when full job fair data is available
    if (jobFair?.codingSubmissions && Array.isArray(jobFair.codingSubmissions)) {
      // Will be populated with full submission objects from backend
      // setSubmissions(jobFair.codingSubmissions);
    }
  }, [jobFair?.codingSubmissions]);

  // Handles code submission to the job fair tournament.
  const handleSubmitCode = useCallback(async () => {
    if (!code.trim()) {
      setError('Code cannot be empty');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSubmissionStatus('idle');

      const submission = {
        code,
        language,
        submittedAt: new Date(),
      };

      await jobFairService.submitCodingChallenge(jobFairId, submission, currentUser.username);

      // Add to local submissions
      setSubmissions(prev => [
        ...prev,
        {
          ...submission,
          submittedBy: currentUser.username,
          grade: undefined,
          feedback: undefined,
        },
      ]);

      // Reset form
      setCode('');
      setSubmissionStatus('success');

      // Clear success message after 3 seconds
      setTimeout(() => setSubmissionStatus('idle'), 3000);
    } catch (err) {
      const errorMessage = (err as Error).message || 'Failed to submit code';
      setError(errorMessage);
      setSubmissionStatus('error');
    } finally {
      setLoading(false);
    }
  }, [code, language, jobFairId, currentUser.username]);

  // Grading submissions for recruiters within their hosted fair
  const handleGradeSubmission = useCallback(
    async (submissionId: string, grade: number, feedback: string) => {
      if (!isHost) {
        setError('Only the recruiter hosting the job fair can grade submissions');
        return;
      }

      try {
        setError(null);
        // TODO: Implement backend endpoint for grading submissions
        // For now, update locally
        setSubmissions(prev =>
          prev.map(sub =>
            sub._id === submissionId
              ? { ...sub, grade, feedback, gradedAt: new Date(), gradedBy: currentUser.username }
              : sub,
          ),
        );
      } catch (err) {
        setError((err as Error).message || 'Failed to grade submission');
      }
    },
    [isHost, currentUser.username],
  );

  // Load submissions on mount
  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  return {
    code,
    setCode,
    language,
    setLanguage,
    submissions,
    loading,
    error,
    submissionStatus,
    isRecruiter,
    isHost,
    handleSubmitCode,
    handleGradeSubmission,
  };
};

export default useCodingTournament;
