import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import jobFairService from '../services/jobFairService';
import useUserContext from './useUserContext';
import { DatabaseJobFair } from '../../shared/types/jobFair.d';

/**
 * Custom hook for managing job fair editing by recruiters.
 * Handles form state, validation, and submission.
 */
const useRecruiterJobFairEditPage = () => {
  const navigate = useNavigate();
  const { jobFairId } = useParams<{ jobFairId: string }>();
  const { user: currentUser } = useUserContext();
  const [jobFair, setJobFair] = useState<DatabaseJobFair | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'invite-only'>('public');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [codingTournamentEnabled, setCodingTournamentEnabled] = useState(true);
  const [overviewMessage, setOverviewMessage] = useState('');
  const [invitedUsers, setInvitedUsers] = useState<string[]>([]);
  const [currentInviteInput, setCurrentInviteInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loadingJobFair, setLoadingJobFair] = useState(true);

  // Load job fair data
  useEffect(() => {
    const loadJobFair = async () => {
      if (!jobFairId) {
        setError('Job fair ID is required');
        setLoadingJobFair(false);
        return;
      }

      try {
        setLoadingJobFair(true);
        const fetchedJobFair = await jobFairService.getJobFairById(jobFairId, currentUser.username);

        if ('error' in fetchedJobFair) {
          setError(fetchedJobFair.error);
          setLoadingJobFair(false);
          return;
        }

        // Check if user is the host
        if (fetchedJobFair.hostUsername !== currentUser.username) {
          setError('Only the host can edit this job fair');
          setLoadingJobFair(false);
          return;
        }

        setJobFair(fetchedJobFair);
        setTitle(fetchedJobFair.title);
        setDescription(fetchedJobFair.description);
        setVisibility(fetchedJobFair.visibility);
        
        // Convert ISO dates to datetime-local format
        const startDate = new Date(fetchedJobFair.startTime);
        const endDate = new Date(fetchedJobFair.endTime);
        setStartTime(startDate.toISOString().slice(0, 16));
        setEndTime(endDate.toISOString().slice(0, 16));
        
        setCodingTournamentEnabled(fetchedJobFair.codingTournamentEnabled);
        setOverviewMessage(fetchedJobFair.overviewMessage || '');
        setInvitedUsers(fetchedJobFair.invitedUsers || []);
      } catch (err) {
        setError((err as Error).message || 'Failed to load job fair');
      } finally {
        setLoadingJobFair(false);
      }
    };

    loadJobFair();
  }, [jobFairId, currentUser.username]);

  // Validates job form inputs
  const validateForm = useCallback((): string | null => {
    if (!title.trim()) {
      return 'Job fair title is required';
    }
    if (!description.trim()) {
      return 'Job fair description is required';
    }
    if (!startTime) {
      return 'Start time is required';
    }
    if (!endTime) {
      return 'End time is required';
    }
    if (visibility === 'invite-only' && invitedUsers.length === 0) {
      return 'At least one user must be invited for invite-only job fairs';
    }

    // Get dates
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (endDate <= startDate) {
      return 'End time must be after start time';
    }

    return null;
  }, [title, description, startTime, endTime, visibility, invitedUsers]);

  // Adds a user to the invited list
  const handleAddInvite = useCallback(() => {
    if (!currentInviteInput.trim()) {
      setError('Username cannot be empty');
      return;
    }

    if (invitedUsers.includes(currentInviteInput)) {
      setError('User is already invited');
      return;
    }

    setInvitedUsers(prev => [...prev, currentInviteInput]);
    setCurrentInviteInput('');
    setError(null);
  }, [currentInviteInput, invitedUsers]);

  // Removes a user from the invited users list.
  const handleRemoveInvite = useCallback((username: string) => {
    setInvitedUsers(prev => prev.filter(u => u !== username));
  }, []);

  // Handles form for updating a job fair
  const handleUpdateJobFair = useCallback(async () => {
    if (!jobFairId) {
      setError('Job fair ID is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Validate form
      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        setLoading(false);
        return;
      }

      // Helper function to convert datetime-local string to ISO 8601 format
      const toISO8601 = (datetimeLocal: string): string => {
        if (!datetimeLocal) return '';
        const date = new Date(datetimeLocal);
        return date.toISOString();
      };

      // Update job fair
      const updateData = {
        title,
        description,
        visibility,
        startTime: toISO8601(startTime),
        endTime: toISO8601(endTime),
        codingTournamentEnabled,
        overviewMessage: overviewMessage.trim() ? overviewMessage : undefined,
        invitedUsers: visibility === 'invite-only' ? invitedUsers : undefined,
      };

      await jobFairService.updateJobFair(jobFairId, updateData, currentUser.username);

      setSuccess(true);
      // Navigate to the updated job fair detail page
      setTimeout(() => {
        navigate(`/jobfairs/${jobFairId}`);
      }, 1000);
    } catch (err) {
      setError((err as Error).message || 'Failed to update job fair');
    } finally {
      setLoading(false);
    }
  }, [
    validateForm,
    jobFairId,
    title,
    description,
    visibility,
    startTime,
    endTime,
    codingTournamentEnabled,
    overviewMessage,
    currentUser.username,
    invitedUsers,
    navigate,
  ]);

  return {
    jobFair,
    title,
    setTitle,
    description,
    setDescription,
    visibility,
    setVisibility,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    codingTournamentEnabled,
    setCodingTournamentEnabled,
    overviewMessage,
    setOverviewMessage,
    invitedUsers,
    currentInviteInput,
    setCurrentInviteInput,
    loading,
    loadingJobFair,
    error,
    success,
    handleAddInvite,
    handleRemoveInvite,
    handleUpdateJobFair,
  };
};

export default useRecruiterJobFairEditPage;

