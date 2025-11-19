import { useEffect, useState, useCallback } from 'react';
import { DatabaseJobFair } from '@fake-stack-overflow/shared';
import jobFairService from '../services/jobFairService';
import useUserContext from './useUserContext';
import { createChat, sendMessage } from '../services/chatService';

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
  const [acceptedSubmission, setAcceptedSubmission] = useState<CodingSubmission | null>(null);
  const [dmMessage, setDmMessage] = useState<string>('');
  const [isSendingDM, setIsSendingDM] = useState(false);
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

      // Find all code submissions
      const codeSubmissions = messages.filter(
        m => typeof m.msg === 'string' && m.msg.startsWith('__CODE_SUBMISSION__'),
      );

      // Find all acceptance markers
      const acceptanceMarkers = messages.filter(
        m => typeof m.msg === 'string' && m.msg.startsWith('__CODE_ACCEPTED__'),
      );

      // Create a map of accepted submissions: submittedBy -> {gradedBy, gradedAt}
      // Use the latest acceptance marker if there are multiple
      const acceptedMap = new Map<
        string,
        { gradedBy: string; gradedAt: Date; msgDateTime: Date }
      >();
      acceptanceMarkers.forEach(m => {
        // msg format: __CODE_ACCEPTED__<submittedBy>__<gradedBy>__<timestamp>
        // When splitting by '__', we get: ['', 'CODE_ACCEPTED', '<submittedBy>', '<gradedBy>', '<timestamp>']
        const parts = m.msg.split('__');
        if (parts.length >= 5 && parts[1] === 'CODE_ACCEPTED') {
          const submittedBy = parts[2];
          const gradedBy = parts[3];
          const timestampStr = parts[4];
          const msgDateTime = new Date(m.msgDateTime);
          
          // If we already have an acceptance for this user, keep the latest one
          const existing = acceptedMap.get(submittedBy);
          if (!existing || msgDateTime > existing.msgDateTime) {
            acceptedMap.set(submittedBy, {
              gradedBy,
              gradedAt: new Date(timestampStr),
              msgDateTime,
            });
          }
        }
      });

      const parsed = codeSubmissions.map(m => {
        // msg format: __CODE_SUBMISSION__<language>__\n<code>
        const prefix = '__CODE_SUBMISSION__';
        const secondSep = m.msg.indexOf('__', prefix.length);
        const languageFromMsg =
          secondSep > -1 ? m.msg.substring(prefix.length, secondSep) : 'javascript';
        const codeFromMsg = secondSep > -1 ? m.msg.substring(secondSep + 2) : m.msg;

        const submission: CodingSubmission = {
          code: codeFromMsg,
          language: languageFromMsg,
          submittedAt: new Date(m.msgDateTime),
          submittedBy: m.msgFrom,
        };

        // Check if this submission was accepted
        if (m.msgFrom && acceptedMap.has(m.msgFrom)) {
          const acceptanceInfo = acceptedMap.get(m.msgFrom)!;
          // Only mark as accepted if the acceptance happened after the submission
          if (acceptanceInfo.msgDateTime >= submission.submittedAt) {
            submission.grade = 100;
            submission.gradedBy = acceptanceInfo.gradedBy;
            submission.gradedAt = acceptanceInfo.gradedAt;
          }
        }

        return submission;
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

  // Handle accepting a submission - shows the DM panel
  const handleAcceptSubmission = useCallback(
    (submission: CodingSubmission) => {
      if (!isHost) {
        setError('Only the recruiter hosting the job fair can accept submissions');
        return;
      }
      setAcceptedSubmission(submission);
      setError(null);
    },
    [isHost],
  );

  // Handle sending DM to applicant after accepting submission
  const handleSendDMToApplicant = useCallback(async () => {
    if (!acceptedSubmission || !acceptedSubmission.submittedBy) {
      setError('No submission selected');
      return;
    }

    if (!dmMessage.trim()) {
      setError('Please enter a message');
      return;
    }

    try {
      setIsSendingDM(true);
      setError(null);

      // Create a chat with the applicant
      const chat = await createChat([currentUser.username, acceptedSubmission.submittedBy]);

      // Send the message
      await sendMessage(
        {
          msg: dmMessage,
          msgFrom: currentUser.username,
          msgDateTime: new Date(),
        },
        chat._id,
      );

      // Persist acceptance by adding a marker message to the job fair chat
      const acceptanceTimestamp = new Date();
      // Format: __CODE_ACCEPTED__<submittedBy>__<gradedBy>__<timestamp>
      const acceptanceMarker = `__CODE_ACCEPTED__${acceptedSubmission.submittedBy}__${currentUser.username}__${acceptanceTimestamp.toISOString()}`;
      await jobFairService.addJobFairMessage(
        jobFairId,
        acceptanceMarker,
        currentUser.username,
        acceptanceTimestamp,
      );

      // Mark submission as accepted
      setSubmissions(prev =>
        prev.map(sub => {
          const isMatch =
            sub.submittedBy === acceptedSubmission.submittedBy &&
            new Date(sub.submittedAt).getTime() === new Date(acceptedSubmission.submittedAt).getTime();
          return isMatch
            ? {
                ...sub,
                grade: 100,
                gradedBy: currentUser.username,
                gradedAt: acceptanceTimestamp,
              }
            : sub;
        }),
      );

      // Reset state
      setAcceptedSubmission(null);
      setDmMessage('');
      setSubmissionStatus('success');
      setTimeout(() => setSubmissionStatus('idle'), 3000);
    } catch (err) {
      setError((err as Error).message || 'Failed to send DM to applicant');
    } finally {
      setIsSendingDM(false);
    }
  }, [acceptedSubmission, dmMessage, jobFairId, currentUser.username]);

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
    handleAcceptSubmission,
    acceptedSubmission,
    setAcceptedSubmission,
    dmMessage,
    setDmMessage,
    handleSendDMToApplicant,
    isSendingDM,
  };
};

export default useCodingTournament;
