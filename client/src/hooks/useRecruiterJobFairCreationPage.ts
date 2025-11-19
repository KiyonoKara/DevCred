import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import jobFairService from '../services/jobFairService';
import useUserContext from './useUserContext';

/**
 * Custom hook for managing job fair creation by recruiters.
 * Handles form state, validation, and submission.
 */
const useRecruiterJobFairCreationPage = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useUserContext();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'invite-only'>('public');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [codingTournamentEnabled, setCodingTournamentEnabled] = useState(true);
  const [invitedUsers, setInvitedUsers] = useState<string[]>([]);
  const [currentInviteInput, setCurrentInviteInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
    const now = new Date();

    if (startDate <= now) {
      return 'Start time must be in the future';
    }

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

  // Handles form for creating a new job fair
  const handleCreateJobFair = useCallback(async () => {
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

      // Create job fair
      const jobFairData = {
        title,
        description,
        visibility,
        startTime: toISO8601(startTime),
        endTime: toISO8601(endTime),
        hostUsername: currentUser.username,
        codingTournamentEnabled,
        invitedUsers: visibility === 'invite-only' ? invitedUsers : undefined,
      };

      const createdJobFair = await jobFairService.createJobFair(jobFairData);

      setSuccess(true);
      // Navigate to the created job fair detail page
      setTimeout(() => {
        navigate(`/jobfairs/${createdJobFair._id.toString()}`);
      }, 1000);
    } catch (err) {
      setError((err as Error).message || 'Failed to create job fair');
    } finally {
      setLoading(false);
    }
  }, [
    validateForm,
    title,
    description,
    visibility,
    startTime,
    endTime,
    codingTournamentEnabled,
    currentUser.username,
    invitedUsers,
    navigate,
  ]);

  // Resets the form to initial state
  const handleResetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setVisibility('public');
    setStartTime('');
    setEndTime('');
    setCodingTournamentEnabled(true);
    setInvitedUsers([]);
    setCurrentInviteInput('');
    setError(null);
    setSuccess(false);
  }, []);

  return {
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
    invitedUsers,
    currentInviteInput,
    setCurrentInviteInput,
    loading,
    error,
    success,
    handleAddInvite,
    handleRemoveInvite,
    handleCreateJobFair,
    handleResetForm,
  };
};

export default useRecruiterJobFairCreationPage;
