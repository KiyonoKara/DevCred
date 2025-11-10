import api from './config';
import { SafeDatabaseResume } from '../types/types';

const RESUME_API_URL = `/api/resume`;

/**
 * Uploads a resume for the specified user.
 *
 * @param userId - Username of the user uploading the resume.
 * @param file - The PDF file to upload.
 * @param options - Additional upload options.
 * @returns The saved resume metadata without binary content.
 */
const uploadResume = async (
  userId: string,
  file: File,
  options: { isActive?: boolean } = {},
): Promise<SafeDatabaseResume> => {
  const formData = new FormData();
  formData.append('userId', userId);
  formData.append('resume', file);
  formData.append('isActive', String(options.isActive ?? true));

  const res = await api.post(`${RESUME_API_URL}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  if (res.status !== 200) {
    throw new Error('Error uploading resume');
  }

  return res.data as SafeDatabaseResume;
};

/**
 * Fetches all resumes that belong to a user.
 *
 * @param userId - Username whose resumes should be fetched.
 * @returns List of resume metadata without binary content.
 */
const getUserResumes = async (userId: string): Promise<SafeDatabaseResume[]> => {
  const res = await api.get(`${RESUME_API_URL}/user/${userId}`);

  if (res.status !== 200) {
    throw new Error('Error fetching user resumes');
  }

  return res.data as SafeDatabaseResume[];
};

/**
 * Downloads a resume file by its ID.
 *
 * @param resumeId - The id of the resume to download.
 * @returns A Blob representation of the resume PDF.
 */
const downloadResume = async (resumeId: string): Promise<Blob> => {
  const res = await api.get(`${RESUME_API_URL}/download/${resumeId}`, {
    responseType: 'blob',
  });

  if (res.status !== 200) {
    throw new Error('Error downloading resume');
  }

  return res.data as Blob;
};

/**
 * Deletes a resume by its ID.
 *
 * @param resumeId - The id of the resume to delete.
 */
const deleteResume = async (resumeId: string): Promise<void> => {
  const res = await api.delete(`${RESUME_API_URL}/${resumeId}`);

  if (res.status !== 200) {
    throw new Error('Error deleting resume');
  }
};

/**
 * Marks a resume as the active resume for the provided user.
 *
 * @param userId - Username whose resume should be marked active.
 * @param resumeId - The id of the resume to activate.
 * @returns The updated resume metadata.
 */
const setActiveResume = async (userId: string, resumeId: string): Promise<SafeDatabaseResume> => {
  const res = await api.put(`${RESUME_API_URL}/setActive`, { userId, resumeId });

  if (res.status !== 200) {
    throw new Error('Error setting active resume');
  }

  return res.data as SafeDatabaseResume;
};

export { uploadResume, getUserResumes, downloadResume, deleteResume, setActiveResume };
