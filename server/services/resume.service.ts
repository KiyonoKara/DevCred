import ResumeModel from '../models/resume.model';
import {
  DatabaseResume,
  SafeDatabaseResume,
  Resume,
  ResumeResponse,
  ResumesResponse,
  ResumeDownloadResponse,
} from '../types/types';

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

export const getUserResumes = async (userId: string): Promise<ResumesResponse> => {
  try {
    const resumes: SafeDatabaseResume[] = await ResumeModel.find({ userId }).select('-fileData');
    return resumes;
  } catch (error) {
    return { error: `Error finding user resumes: ${error}` };
  }
};

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

export const deleteResume = async (resumeId: string): Promise<ResumeResponse> => {
  try {
    const deletedResume: SafeDatabaseResume | null = await ResumeModel.findByIdAndDelete(resumeId).select('-fileData');
    if (!deletedResume) throw Error('Resume not found');
    return deletedResume;
  } catch (error) {
    return { error: `Error deleting resume: ${error}` };
  }
};

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