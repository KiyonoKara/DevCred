import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DatabaseJobFair } from '@fake-stack-overflow/shared';
import jobFairService from '../services/jobFairService';
import useUserContext from './useUserContext';

/**
 * Custom hook for managing the job fair list page.
 * Handles fetching job fairs, filtering by status/visibility, and navigation.
 */
const useJobFairListPage = () => {
  const navigate = useNavigate();
  const [jobFairs, setJobFairs] = useState<DatabaseJobFair[]>([]);
  const [filteredJobFairs, setFilteredJobFairs] = useState<DatabaseJobFair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'upcoming' | 'live' | 'ended' | 'all'>(
    'upcoming',
  );
  const [visibilityFilter, setVisibilityFilter] = useState<'public' | 'invite-only' | 'all'>(
    'public',
  );
  const [myOrganizationOnly, setMyOrganizationOnly] = useState<boolean>(false);
  const { user: currentUser } = useUserContext();
  // Check if user is a recruiter or not
  const isRecruiter = currentUser.userType === 'recruiter';

  // Gets all available job fairs based on user access
  const fetchJobFairs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const status = statusFilter === 'all' ? undefined : statusFilter;
      const visibility = visibilityFilter === 'all' ? undefined : visibilityFilter;

      const fairs = await jobFairService.getJobFairs(status, visibility);
      setJobFairs(fairs);
      setFilteredJobFairs(fairs);
    } catch (err) {
      setError((err as Error).message || 'Failed to fetch job fairs');
      setJobFairs([]);
      setFilteredJobFairs([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, visibilityFilter]);

  // Handles navigation to individual job fair detail page.
  const handleViewJobFair = (jobFairId: string) => {
    navigate(`/jobfairs/${jobFairId}`);
  };

  // Navigation to job fair creation page only for recruiters
  const handleCreateJobFair = () => {
    if (currentUser.userType === 'recruiter') {
      navigate('/recruiters/jobfairs/new');
    } else {
      setError('Only recruiters can create job fairs');
    }
  };

  // Uses filters on currently job fair list
  const applyFilters = useCallback(() => {
    let filtered = jobFairs;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(fair => fair.status === statusFilter);
    }

    if (visibilityFilter !== 'all') {
      filtered = filtered.filter(fair => fair.visibility === visibilityFilter);
    }

    // Filter by host username if "my organization only" is checked
    if (myOrganizationOnly && isRecruiter) {
      filtered = filtered.filter(fair => fair.hostUsername === currentUser.username);
    }

    setFilteredJobFairs(filtered);
  }, [jobFairs, statusFilter, visibilityFilter, myOrganizationOnly, isRecruiter, currentUser.username]);

  useEffect(() => {
    fetchJobFairs();
  }, [fetchJobFairs]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  return {
    jobFairs: filteredJobFairs,
    loading,
    error,
    isRecruiter,
    statusFilter,
    visibilityFilter,
    myOrganizationOnly,
    setStatusFilter,
    setVisibilityFilter,
    setMyOrganizationOnly,
    handleViewJobFair,
    handleCreateJobFair,
    refreshJobFairs: fetchJobFairs,
  };
};

export default useJobFairListPage;
