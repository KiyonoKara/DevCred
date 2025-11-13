import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { DatabaseJobFair } from '@fake-stack-overflow/shared';
import jobFairService from '../services/jobFairService';
import useUserContext from './useUserContext';

/**
 * Custom hook for managing an individual job fair page.
 * Handles job fair details, join/leave logic, participant management.
 * Has live updates from WebSocket.
 */
const useJobFairPage = () => {
  const { jobFairId } = useParams<{ jobFairId: string }>();
  const [jobFair, setJobFair] = useState<DatabaseJobFair | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'chat' | 'tournament'>('overview');
  const { user: currentUser, socket } = useUserContext();

  // Gets job fair from the server
  const fetchJobFair = useCallback(async () => {
    if (!jobFairId) {
      setError('Job fair ID is missing');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const fair = await jobFairService.getJobFairById(jobFairId);
      setJobFair(fair);

      // Check if current user is a participant or host
      const username = currentUser.username;
      setIsParticipant(fair.participants.includes(username));
      setIsHost(fair.hostUsername === username);
    } catch (err) {
      setError((err as Error).message || 'Failed to fetch job fair');
      setJobFair(null);
    } finally {
      setLoading(false);
    }
  }, [jobFairId, currentUser.username]);

  // For talents joining the job fair
  const handleJoinJobFair = useCallback(async () => {
    if (!jobFairId) return;

    try {
      setError(null);
      const updated = await jobFairService.joinJobFair(jobFairId, currentUser.username);
      setJobFair(updated);
      setIsParticipant(true);

      // Emit socket event to notify other participants
      socket.emit('joinJobFair', jobFairId);
    } catch (err) {
      setError((err as Error).message || 'Failed to join job fair');
    }
  }, [jobFairId, socket, currentUser.username]);

  // For leaving job fair
  const handleLeaveJobFair = useCallback(async () => {
    if (!jobFairId) return;

    try {
      setError(null);
      const updated = await jobFairService.leaveJobFair(jobFairId, currentUser.username);
      setJobFair(updated);
      setIsParticipant(false);

      // Emit socket event to notify other participants
      socket.emit('leaveJobFair', jobFairId);
    } catch (err) {
      setError((err as Error).message || 'Failed to leave job fair');
    }
  }, [jobFairId, socket, currentUser.username]);

  // For starting the job fair, only meant for recruiter host
  // TODO: Get this to work, still receiving a 401 error but don't have enough time to fix this
  const handleStartJobFair = useCallback(async () => {
    if (!jobFairId || !isHost) return;

    try {
      setError(null);
      const updated = await jobFairService.updateJobFairStatus(jobFairId, 'live');
      setJobFair(updated);
    } catch (err) {
      setError((err as Error).message || 'Failed to start job fair');
    }
  }, [jobFairId, isHost]);

  // For ending the job fair only for recruiter host
  const handleEndJobFair = useCallback(async () => {
    if (!jobFairId || !isHost) return;

    try {
      setError(null);
      const updated = await jobFairService.updateJobFairStatus(jobFairId, 'ended');
      setJobFair(updated);
    } catch (err) {
      setError((err as Error).message || 'Failed to end job fair');
    }
  }, [jobFairId, isHost]);

  // WebSocket events for updates
  useEffect(() => {
    if (!jobFairId) {
      return;
    }
    // Join the job fair room
    socket.emit('joinJobFair', jobFairId);
    // Listen to job fair updates
    const handleJobFairUpdate = (data: { jobFair: DatabaseJobFair; type: string }) => {
      if (data.jobFair._id.toString() === jobFairId) {
        setJobFair(data.jobFair);
        const username = currentUser.username;
        setIsParticipant(data.jobFair.participants.includes(username));
      }
    };

    socket.on('jobFairUpdate', handleJobFairUpdate);

    return () => {
      socket.off('jobFairUpdate', handleJobFairUpdate);
      socket.emit('leaveJobFair', jobFairId);
    };
  }, [jobFairId, socket, currentUser.username]);

  // Get job fair on mount
  useEffect(() => {
    fetchJobFair();
  }, [fetchJobFair]);

  return {
    jobFair,
    loading,
    error,
    isParticipant,
    isHost,
    activeTab,
    setActiveTab,
    handleJoinJobFair,
    handleLeaveJobFair,
    handleStartJobFair,
    handleEndJobFair,
    refreshJobFair: fetchJobFair,
  };
};

export default useJobFairPage;
