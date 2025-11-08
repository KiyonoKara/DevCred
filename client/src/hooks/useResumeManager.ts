import { useState, useEffect, useCallback } from 'react';
import {
  uploadResume as uploadResumeRequest,
  getUserResumes,
  downloadResume as downloadResumeRequest,
  deleteResume as deleteResumeRequest,
  setActiveResume as setActiveResumeRequest,
} from '../services/resumeService';
import { SafeDatabaseResume } from '../types/types';

type ResumeActionResult = {
  success: boolean;
  error?: string;
};

const MAX_RESUME_BYTES = 8 * 1024 * 1024; // 8MB

/**
 * Shared resume management logic. Handles fetching, uploading, deleting,
 * and activating resumes for a provided user.
 *
 * @param username - the username whose resumes should be managed.
 */
const useResumeManager = (username?: string) => {
  const [resumes, setResumes] = useState<SafeDatabaseResume[]>([]);
  const [resumesLoading, setResumesLoading] = useState(false);
  const [resumeActionLoading, setResumeActionLoading] = useState(false);

  const refreshResumes = useCallback(async (): Promise<ResumeActionResult> => {
    if (!username) {
      setResumes([]);
      return { success: false, error: 'No username provided for resume lookup.' };
    }

    try {
      setResumesLoading(true);
      const fetchedResumes = await getUserResumes(username);
      setResumes(fetchedResumes);
      return { success: true };
    } catch (error) {
      setResumes([]);
      return { success: false, error: 'Failed to load resumes.' };
    } finally {
      setResumesLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (!username) {
      setResumes([]);
      return;
    }

    void refreshResumes();
  }, [username, refreshResumes]);

  const uploadResume = useCallback(
    async (
      file: File,
      options: { makeActive?: boolean } = {},
    ): Promise<ResumeActionResult> => {
      if (!username) {
        return { success: false, error: 'You must be logged in to upload a resume.' };
      }

      if (file.size > MAX_RESUME_BYTES) {
        return { success: false, error: 'Resume must be 8 MB or smaller.' };
      }

      try {
        setResumeActionLoading(true);
        const uploadedResume = await uploadResumeRequest(username, file, {
          isActive: options.makeActive ?? true,
        });

        if (options.makeActive ?? true) {
          await setActiveResumeRequest(username, uploadedResume._id.toString());
        }

        await refreshResumes();
        return { success: true };
      } catch (error) {
        return { success: false, error: 'Failed to upload resume.' };
      } finally {
        setResumeActionLoading(false);
      }
    },
    [username, refreshResumes],
  );

  const downloadResume = useCallback(async (resumeId: string, fileName: string): Promise<ResumeActionResult> => {
    try {
      const blob = await downloadResumeRequest(resumeId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to download resume.' };
    }
  }, []);

  const deleteResume = useCallback(
    async (resumeId: string): Promise<ResumeActionResult> => {
      if (!username) {
        return { success: false, error: 'You must be logged in to delete a resume.' };
      }

      try {
        setResumeActionLoading(true);
        await deleteResumeRequest(resumeId);
        await refreshResumes();
        return { success: true };
      } catch (error) {
        return { success: false, error: 'Failed to delete resume.' };
      } finally {
        setResumeActionLoading(false);
      }
    },
    [username, refreshResumes],
  );

  const setActiveResume = useCallback(
    async (resumeId: string): Promise<ResumeActionResult> => {
      if (!username) {
        return { success: false, error: 'You must be logged in to update your resume.' };
      }

      try {
        setResumeActionLoading(true);
        await setActiveResumeRequest(username, resumeId);
        await refreshResumes();
        return { success: true };
      } catch (error) {
        return { success: false, error: 'Failed to update active resume.' };
      } finally {
        setResumeActionLoading(false);
      }
    },
    [username, refreshResumes],
  );

  return {
    resumes,
    resumesLoading,
    resumeActionLoading,
    uploadResume,
    downloadResume,
    deleteResume,
    setActiveResume,
    refreshResumes,
    maxResumeSizeBytes: MAX_RESUME_BYTES,
  };
};

export type { ResumeActionResult };
export default useResumeManager;

