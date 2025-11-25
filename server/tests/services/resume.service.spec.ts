import { ObjectId } from 'mongodb';
import ResumeModel from '../../models/resume.model';
import {
  createResumeOrPDF,
  getUserResumes,
  downloadResume,
  deleteResume,
  setActiveResume,
} from '../../services/resume.service';
import { DatabaseResume, SafeDatabaseResume, Resume } from '../../types/types';

const MOCK_USER_ID = 'testuser';
const mockResumeId = new ObjectId();
const mockFileData = Buffer.from('mock pdf content');

const mockResume: Resume = {
  userId: MOCK_USER_ID,
  fileName: 'test-resume.pdf',
  fileData: mockFileData,
  contentType: 'application/pdf',
  fileSize: 1024,
  uploadDate: new Date(),
  isActive: true,
};

const mockDatabaseResume: DatabaseResume = {
  _id: mockResumeId,
  ...mockResume,
};

const mockSafeResume: SafeDatabaseResume = {
  _id: mockResumeId,
  userId: MOCK_USER_ID,
  fileName: 'test-resume.pdf',
  contentType: 'application/pdf',
  fileSize: 1024,
  uploadDate: new Date(),
  isActive: true,
};

describe('Resume Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createResumeOrPDF', () => {
    it('should create a resume and return safe resume object', async () => {
      jest.spyOn(ResumeModel, 'create').mockResolvedValueOnce(mockDatabaseResume as any);

      const result = (await createResumeOrPDF(mockResume)) as SafeDatabaseResume;

      expect(result._id).toEqual(mockResumeId);
      expect(result.userId).toEqual(MOCK_USER_ID);
      expect(result.fileName).toEqual('test-resume.pdf');
      expect(result.contentType).toEqual('application/pdf');
      expect(result.fileSize).toEqual(1024);
      expect(result.isActive).toBe(true);
      expect('fileData' in result).toBe(false); // Should not include fileData
      expect(ResumeModel.create).toHaveBeenCalledWith(mockResume);
    });

    it('should return error if create fails', async () => {
      const error = new Error('Database error');
      jest.spyOn(ResumeModel, 'create').mockRejectedValueOnce(error);

      const result = await createResumeOrPDF(mockResume);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error creating resume');
      }
    });

    it('should handle isDMFile flag when creating resume', async () => {
      const resumeWithDMFile = {
        ...mockResume,
        isDMFile: true,
      };
      const databaseResumeWithDMFile = {
        ...mockDatabaseResume,
        isDMFile: true,
      };
      jest.spyOn(ResumeModel, 'create').mockResolvedValueOnce(databaseResumeWithDMFile as any);

      const result = (await createResumeOrPDF(resumeWithDMFile)) as SafeDatabaseResume;

      expect(result._id).toEqual(mockResumeId);
      expect(ResumeModel.create).toHaveBeenCalledWith(resumeWithDMFile);
    });

    it('should return error for missing required fields', async () => {
      const incompleteResume = {
        userId: MOCK_USER_ID,
        // Missing fileName, fileData, contentType, etc.
      } as any;

      const error = new Error('Validation failed');
      jest.spyOn(ResumeModel, 'create').mockRejectedValueOnce(error);

      const result = await createResumeOrPDF(incompleteResume);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error creating resume');
      }
    });

    it('should handle null resume parameter', async () => {
      const error = new Error('Cannot read properties of null');
      jest.spyOn(ResumeModel, 'create').mockRejectedValueOnce(error);

      const result = await createResumeOrPDF(null as any);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error creating resume');
      }
    });

    it('should handle undefined resume parameter', async () => {
      const error = new Error('Cannot read properties of undefined');
      jest.spyOn(ResumeModel, 'create').mockRejectedValueOnce(error);

      const result = await createResumeOrPDF(undefined as any);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error creating resume');
      }
    });
  });

  describe('getUserResumes', () => {
    it('should return all resumes for a user', async () => {
      const mockResumes: SafeDatabaseResume[] = [
        mockSafeResume,
        {
          ...mockSafeResume,
          _id: new ObjectId(),
          fileName: 'another-resume.pdf',
          isActive: false,
        },
      ];

      jest.spyOn(ResumeModel, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockResumes),
      } as any);

      const result = (await getUserResumes(MOCK_USER_ID)) as SafeDatabaseResume[];

      expect(result).toEqual(mockResumes);
      expect(ResumeModel.find).toHaveBeenCalledWith({ userId: MOCK_USER_ID, isDMFile: false });
    });

    it('should return empty array if user has no resumes', async () => {
      jest.spyOn(ResumeModel, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      } as any);

      const result = (await getUserResumes(MOCK_USER_ID)) as SafeDatabaseResume[];

      expect(result).toEqual([]);
    });

    it('should return error if database query fails', async () => {
      const error = new Error('Database error');
      jest.spyOn(ResumeModel, 'find').mockReturnValue({
        select: jest.fn().mockRejectedValue(error),
      } as any);

      const result = await getUserResumes(MOCK_USER_ID);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error finding user resumes');
      }
    });

    it('should handle empty userId', async () => {
      jest.spyOn(ResumeModel, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      } as any);

      const result = (await getUserResumes('')) as SafeDatabaseResume[];

      expect(result).toEqual([]);
      expect(ResumeModel.find).toHaveBeenCalledWith({ userId: '', isDMFile: false });
    });

    it('should handle undefined userId', async () => {
      jest.spyOn(ResumeModel, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      } as any);

      const result = (await getUserResumes(undefined as any)) as SafeDatabaseResume[];

      expect(result).toEqual([]);
      expect(ResumeModel.find).toHaveBeenCalledWith({ userId: undefined, isDMFile: false });
    });
  });

  describe('downloadResume', () => {
    it('should return resume file data', async () => {
      const mockResumeWithFile = {
        fileData: mockFileData,
        fileName: 'test-resume.pdf',
        contentType: 'application/pdf',
      };

      jest.spyOn(ResumeModel, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockResumeWithFile),
      } as any);

      const result = await downloadResume(mockResumeId.toString());

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.fileData).toEqual(mockFileData);
        expect(result.fileName).toEqual('test-resume.pdf');
        expect(result.contentType).toEqual('application/pdf');
      }
      expect(ResumeModel.findById).toHaveBeenCalledWith(mockResumeId.toString());
    });

    it('should return error if resume not found', async () => {
      jest.spyOn(ResumeModel, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await downloadResume(mockResumeId.toString());

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error downloading resume');
      }
    });

    it('should return error if database query fails', async () => {
      const error = new Error('Database error');
      jest.spyOn(ResumeModel, 'findById').mockReturnValue({
        select: jest.fn().mockRejectedValue(error),
      } as any);

      const result = await downloadResume(mockResumeId.toString());

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error downloading resume');
      }
    });

    it('should return error for invalid ObjectId format', async () => {
      const invalidId = 'invalid-id-format';
      jest.spyOn(ResumeModel, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await downloadResume(invalidId);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error downloading resume');
      }
    });

    it('should handle empty resumeId', async () => {
      jest.spyOn(ResumeModel, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await downloadResume('');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error downloading resume');
      }
    });

    it('should handle undefined resumeId', async () => {
      jest.spyOn(ResumeModel, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await downloadResume(undefined as any);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error downloading resume');
      }
    });
  });

  describe('deleteResume', () => {
    it('should delete a resume and return safe resume object', async () => {
      jest.spyOn(ResumeModel, 'findByIdAndDelete').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockSafeResume),
      } as any);

      const result = (await deleteResume(mockResumeId.toString())) as SafeDatabaseResume;

      expect(result._id).toEqual(mockResumeId);
      expect(result.fileName).toEqual('test-resume.pdf');
      expect('fileData' in result).toBe(false);
      expect(ResumeModel.findByIdAndDelete).toHaveBeenCalledWith(mockResumeId.toString());
    });

    it('should return error if resume not found', async () => {
      jest.spyOn(ResumeModel, 'findByIdAndDelete').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await deleteResume(mockResumeId.toString());

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error deleting resume');
      }
    });

    it('should return error if database query fails', async () => {
      const error = new Error('Database error');
      jest.spyOn(ResumeModel, 'findByIdAndDelete').mockReturnValue({
        select: jest.fn().mockRejectedValue(error),
      } as any);

      const result = await deleteResume(mockResumeId.toString());

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error deleting resume');
      }
    });

    it('should return error for invalid ObjectId format', async () => {
      const invalidId = 'invalid-id-format';
      jest.spyOn(ResumeModel, 'findByIdAndDelete').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await deleteResume(invalidId);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error deleting resume');
      }
    });

    it('should handle empty resumeId', async () => {
      jest.spyOn(ResumeModel, 'findByIdAndDelete').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await deleteResume('');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error deleting resume');
      }
    });

    it('should handle undefined resumeId', async () => {
      jest.spyOn(ResumeModel, 'findByIdAndDelete').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await deleteResume(undefined as any);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error deleting resume');
      }
    });
  });

  describe('setActiveResume', () => {
    it('should set a resume as active and deactivate others', async () => {
      const updatedResume: SafeDatabaseResume = {
        ...mockSafeResume,
        isActive: true,
      };

      jest.spyOn(ResumeModel, 'updateMany').mockResolvedValueOnce({} as any);
      jest.spyOn(ResumeModel, 'findByIdAndUpdate').mockReturnValue({
        select: jest.fn().mockResolvedValue(updatedResume),
      } as any);

      const result = (await setActiveResume(
        MOCK_USER_ID,
        mockResumeId.toString(),
      )) as SafeDatabaseResume;

      expect(result.isActive).toBe(true);
      expect(ResumeModel.updateMany).toHaveBeenCalledWith(
        { userId: MOCK_USER_ID },
        { isActive: false },
      );
      expect(ResumeModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockResumeId.toString(),
        { isActive: true },
        { new: true },
      );
    });

    it('should return error if resume not found', async () => {
      jest.spyOn(ResumeModel, 'updateMany').mockResolvedValueOnce({} as any);
      jest.spyOn(ResumeModel, 'findByIdAndUpdate').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await setActiveResume(MOCK_USER_ID, mockResumeId.toString());

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error setting active resume');
      }
    });

    it('should return error if database query fails', async () => {
      const error = new Error('Database error');
      jest.spyOn(ResumeModel, 'updateMany').mockResolvedValueOnce({} as any);
      jest.spyOn(ResumeModel, 'findByIdAndUpdate').mockReturnValue({
        select: jest.fn().mockRejectedValue(error),
      } as any);

      const result = await setActiveResume(MOCK_USER_ID, mockResumeId.toString());

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error setting active resume');
      }
    });

    it('should return error if updateMany fails', async () => {
      const error = new Error('Database error');
      jest.spyOn(ResumeModel, 'updateMany').mockRejectedValueOnce(error);

      const result = await setActiveResume(MOCK_USER_ID, mockResumeId.toString());

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error setting active resume');
      }
    });

    it('should return error for invalid ObjectId format', async () => {
      const invalidId = 'invalid-id-format';
      jest.spyOn(ResumeModel, 'updateMany').mockResolvedValueOnce({} as any);
      jest.spyOn(ResumeModel, 'findByIdAndUpdate').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await setActiveResume(MOCK_USER_ID, invalidId);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error setting active resume');
      }
    });

    it('should handle empty userId', async () => {
      jest.spyOn(ResumeModel, 'updateMany').mockResolvedValueOnce({} as any);
      jest.spyOn(ResumeModel, 'findByIdAndUpdate').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await setActiveResume('', mockResumeId.toString());

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error setting active resume');
      }
    });

    it('should handle empty resumeId', async () => {
      jest.spyOn(ResumeModel, 'updateMany').mockResolvedValueOnce({} as any);
      jest.spyOn(ResumeModel, 'findByIdAndUpdate').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await setActiveResume(MOCK_USER_ID, '');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error setting active resume');
      }
    });

    it('should handle undefined userId', async () => {
      jest.spyOn(ResumeModel, 'updateMany').mockResolvedValueOnce({} as any);
      jest.spyOn(ResumeModel, 'findByIdAndUpdate').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await setActiveResume(undefined as any, mockResumeId.toString());

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error setting active resume');
      }
    });

    it('should handle undefined resumeId', async () => {
      jest.spyOn(ResumeModel, 'updateMany').mockResolvedValueOnce({} as any);
      jest.spyOn(ResumeModel, 'findByIdAndUpdate').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await setActiveResume(MOCK_USER_ID, undefined as any);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error setting active resume');
      }
    });
  });
});
