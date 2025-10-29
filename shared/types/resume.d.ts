import { Request } from 'express';
import { ObjectId } from 'mongodb';

export interface Resume {
  userId: string;
  fileName: string;
  fileData: Buffer;
  contentType: string;
  fileSize: number;
  uploadDate: Date;
  isActive: boolean;
}

export interface DatabaseResume extends Resume {
  _id: ObjectId;
}

export type SafeDatabaseResume = Omit<DatabaseResume, 'fileData'>;

export type ResumeResponse = SafeDatabaseResume | { error: string };
export type ResumesResponse = SafeDatabaseResume[] | { error: string };

export interface UploadResumeRequest extends Request {
  body: {
    userId: string;
    isActive?: boolean;
  };
  file?: Express.Multer.File;
}

export interface ResumeByIdRequest extends Request {
  params: {
    resumeId: string;
  };
}

export interface UserResumesRequest extends Request {
  params: {
    userId: string;
  };
}

export interface SetActiveResumeRequest extends Request {
  body: {
    userId: string;
    resumeId: string;
  };
}

export type ResumeDownloadResponse = {
  fileData: Buffer;
  fileName: string;
  contentType: string;
} | { error: string };