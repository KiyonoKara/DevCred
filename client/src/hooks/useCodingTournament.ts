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
  const { user: currentUser, socket } = useUserContext();
  const isRecruiter = currentUser.userType === 'recruiter';
  const isHost = jobFair?.hostUsername === currentUser.username;

  // Load existing submissions from persisted chat messages
  const loadSubmissions = useCallback(async () => {
    try {
      const fair = await jobFairService.getJobFairById(jobFairId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messages = (fair as any)?.chatMessages as Array<{
        msg: string;
        msgFrom: string;
        msgDateTime: string | Date;
      }>;
      if (!Array.isArray(messages)) {
        setSubmissions([]);
        return;
      }

      const parsed = messages
        .filter(m => typeof m.msg === 'string' && m.msg.startsWith('__CODE_SUBMISSION__'))
        .map(m => {
          // msg format: __CODE_SUBMISSION__<language>__\n<code>
          const prefix = '__CODE_SUBMISSION__';
          const secondSep = m.msg.indexOf('__', prefix.length);
          const languageFromMsg =
            secondSep > -1 ? m.msg.substring(prefix.length, secondSep) : 'javascript';
          const codeFromMsg = secondSep > -1 ? m.msg.substring(secondSep + 2) : m.msg;
          return {
            code: codeFromMsg,
            language: languageFromMsg,
            submittedAt: new Date(m.msgDateTime),
            submittedBy: m.msgFrom,
          } as CodingSubmission;
        });

      setSubmissions(parsed);
    } catch {
      setSubmissions([]);
    }
  }, [jobFairId]);

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

  // Listen for realtime submissions from participants
  useEffect(() => {
    const handleIncomingSubmission = (data: {
      jobFairId: string;
      submission: { code: string; language: string; submittedAt: Date; submittedBy: string };
    }) => {
      if (data.jobFairId !== jobFairId) {
        return;
      }
      // Ignore echo of my own submission; we already optimistically append it
      if (data.submission.submittedBy === currentUser.username) {
        return;
      }
      setSubmissions(prev => {
        const next = [
          ...prev,
          {
            code: data.submission.code,
            language: data.submission.language,
            submittedAt: new Date(data.submission.submittedAt),
            submittedBy: data.submission.submittedBy,
          },
        ];
        return next;
      });
    };

    socket.on('codingSubmission', handleIncomingSubmission);
    return () => {
      socket.off('codingSubmission', handleIncomingSubmission);
    };
  }, [jobFairId, socket, currentUser.username]);

  // For recruiters/hosts, only show the latest submission per user
  const visibleSubmissions = (() => {
    if (!isRecruiter && !isHost) {
      return submissions;
    }
    const latestByUser = new Map<string, CodingSubmission>();
    for (const sub of submissions) {
      const key = sub.submittedBy || 'unknown';
      const existing = latestByUser.get(key);
      if (!existing || existing.submittedAt < sub.submittedAt) {
        latestByUser.set(key, sub);
      }
    }
    return Array.from(latestByUser.values()).sort(
      (a, b) => b.submittedAt.getTime() - a.submittedAt.getTime(),
    );
  })();

  return {
    code,
    setCode,
    language,
    setLanguage,
    submissions: visibleSubmissions,
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
