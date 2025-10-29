import ResumeModel from '../models/resume.model';
import {
  DatabaseResume,
  SafeDatabaseResume,
  Resume,
  ResumeResponse,
  ResumesResponse,
  ResumeDownloadResponse,
} from '../types/types';

/**
 * Creates a new resume in the database.
 *
 * @param {Resume} resume - The resume object to be saved, containing file data and metadata.
 * @returns {Promise<ResumeResponse>} - Resolves with the saved resume object (without file data) or an error message.
 */
export const createResume = async (resume: Resume): Promise<ResumeResponse> => {
  try {
    const result: DatabaseResume = await ResumeModel.create(resume);
    const safeResume: SafeDatabaseResume = {
      _id: result._id,
      userId: result.userId,
      fileName: result.fileName,
      contentType: result.contentType,
      fileSize: result.fileSize,
      uploadDate: result.uploadDate,
      isActive: result.isActive,
    };
    return safeResume;
  } catch (error) {
    return { error: `Error creating resume: ${error}` };
  }
};

/**
 * Retrieves all resumes for a specific user.
 *
 * @param {string} userId - The username of the user whose resumes to retrieve.
 * @returns {Promise<ResumesResponse>} - Resolves with the list of resume objects (without file data) or an error message.
 */
export const getUserResumes = async (userId: string): Promise<ResumesResponse> => {
  try {
    const resumes: SafeDatabaseResume[] = await ResumeModel.find({ userId }).select('-fileData');
    return resumes;
  } catch (error) {
    return { error: `Error finding user resumes: ${error}` };
  }
};

/**
 * Downloads a resume file by its ID.
 *
 * @param {string} resumeId - The ID of the resume to download.
 * @returns {Promise<ResumeDownloadResponse>} - Resolves with the resume file data or an error message.
 */
export const downloadResume = async (resumeId: string): Promise<ResumeDownloadResponse> => {
  try {
    const resume = await ResumeModel.findById(resumeId).select('fileData fileName contentType');
    if (!resume) throw Error('Resume not found');
    
    return {
      fileData: resume.fileData,
      fileName: resume.fileName,
      contentType: resume.contentType,
    };
  } catch (error) {
    return { error: `Error downloading resume: ${error}` };
  }
};

/**
 * Deletes a resume from the database by its ID.
 *
 * @param {string} resumeId - The ID of the resume to delete.
 * @returns {Promise<ResumeResponse>} - Resolves with the deleted resume object (without file data) or an error message.
 */
export const deleteResume = async (resumeId: string): Promise<ResumeResponse> => {
  try {
    const deletedResume: SafeDatabaseResume | null = await ResumeModel.findByIdAndDelete(resumeId).select('-fileData');
    if (!deletedResume) throw Error('Resume not found');
    return deletedResume;
  } catch (error) {
    return { error: `Error deleting resume: ${error}` };
  }
};

/**
 * Sets a specific resume as the active resume for a user.
 * Deactivates all other resumes for the user and activates the specified one.
 *
 * @param {string} userId - The username of the user.
 * @param {string} resumeId - The ID of the resume to set as active.
 * @returns {Promise<ResumeResponse>} - Resolves with the updated resume object (without file data) or an error message.
 */
export const setActiveResume = async (userId: string, resumeId: string): Promise<ResumeResponse> => {
  try {
    await ResumeModel.updateMany({ userId }, { isActive: false });
    const updatedResume: SafeDatabaseResume | null = await ResumeModel.findByIdAndUpdate(
      resumeId,
      { isActive: true },
      { new: true }
    ).select('-fileData');
    
    if (!updatedResume) throw Error('Resume not found');
    return updatedResume;
  } catch (error) {
    return { error: `Error setting active resume: ${error}` };
  }
};