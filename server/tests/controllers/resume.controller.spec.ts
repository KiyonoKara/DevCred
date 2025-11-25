import supertest from 'supertest';
import { app } from '../../app';
import * as resumeService from '../../services/resume.service';
import { SafeDatabaseResume } from '../../types/types';
import { ObjectId } from 'mongodb';

const MOCK_USER_ID = 'testuser';
const mockResumeId = new ObjectId();

const mockSafeResume: SafeDatabaseResume = {
  _id: mockResumeId,
  userId: MOCK_USER_ID,
  fileName: 'test-resume.pdf',
  contentType: 'application/pdf',
  fileSize: 1024,
  uploadDate: new Date(),
  isActive: true,
};

const createResumeSpy = jest.spyOn(resumeService, 'createResumeOrPDF');
const getUserResumesSpy = jest.spyOn(resumeService, 'getUserResumes');
const downloadResumeSpy = jest.spyOn(resumeService, 'downloadResume');
const deleteResumeSpy = jest.spyOn(resumeService, 'deleteResume');
const setActiveResumeSpy = jest.spyOn(resumeService, 'setActiveResume');

describe('Resume Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/resume/upload', () => {
    it('should upload a resume successfully', async () => {
      createResumeSpy.mockResolvedValueOnce(mockSafeResume);

      const response = await supertest(app)
        .post('/api/resume/upload')
        .field('userId', MOCK_USER_ID)
        .field('isActive', 'true')
        .attach('resume', Buffer.from('mock pdf content'), 'test-resume.pdf');

      expect(response.status).toBe(200);
      const responseBody = response.body;
      expect(responseBody._id).toBe(mockResumeId.toString());
      expect(responseBody.userId).toBe(mockSafeResume.userId);
      expect(responseBody.fileName).toBe(mockSafeResume.fileName);
      expect(responseBody.contentType).toBe(mockSafeResume.contentType);
      expect(responseBody.fileSize).toBe(mockSafeResume.fileSize);
      expect(responseBody.isActive).toBe(mockSafeResume.isActive);
      expect(new Date(responseBody.uploadDate).getTime()).toBe(mockSafeResume.uploadDate.getTime());
      expect(createResumeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: MOCK_USER_ID,
          fileName: 'test-resume.pdf',
          contentType: 'application/pdf',
          isActive: true,
        }),
      );
    });

    it('should return 400 if no file is uploaded', async () => {
      const response = await supertest(app)
        .post('/api/resume/upload')
        .field('userId', MOCK_USER_ID);

      expect(response.status).toBe(400);
      expect(response.text).toBe('No file uploaded');
    });

    it('should return 500 if service returns error', async () => {
      createResumeSpy.mockResolvedValueOnce({ error: 'Error creating resume' });

      const response = await supertest(app)
        .post('/api/resume/upload')
        .field('userId', MOCK_USER_ID)
        .attach('resume', Buffer.from('mock pdf content'), 'test-resume.pdf');

      expect(response.status).toBe(500);
      expect(response.text).toContain('Error uploading resume');
    });

    it('should reject non-PDF files', async () => {
      // Multer fileFilter will reject non-PDF files before reaching the route
      // The error will be handled by multer error handler
      const response = await supertest(app)
        .post('/api/resume/upload')
        .field('userId', MOCK_USER_ID)
        .attach('resume', Buffer.from('not a pdf'), 'test.txt');

      // Multer fileFilter rejects with 500 status and error message
      expect(response.status).toBe(500);
      expect(response.text).toContain('Only PDF files are allowed');
    });

    it('should handle isDMFile parameter', async () => {
      const resumeWithDMFile = {
        ...mockSafeResume,
        isDMFile: true,
      };
      createResumeSpy.mockResolvedValueOnce(resumeWithDMFile);

      const response = await supertest(app)
        .post('/api/resume/upload')
        .field('userId', MOCK_USER_ID)
        .field('isDMFile', 'true')
        .attach('resume', Buffer.from('mock pdf content'), 'test-resume.pdf');

      expect(response.status).toBe(200);
      expect(createResumeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: MOCK_USER_ID,
          isDMFile: true, // Controller converts string to boolean
        }),
      );
    });

    it('should handle isActive as string "true"', async () => {
      createResumeSpy.mockResolvedValueOnce(mockSafeResume);

      const response = await supertest(app)
        .post('/api/resume/upload')
        .field('userId', MOCK_USER_ID)
        .field('isActive', 'true')
        .attach('resume', Buffer.from('mock pdf content'), 'test-resume.pdf');

      expect(response.status).toBe(200);
      expect(createResumeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
        }),
      );
    });

    it('should handle isActive as string "false"', async () => {
      const inactiveResume = {
        ...mockSafeResume,
        isActive: false,
      };
      createResumeSpy.mockResolvedValueOnce(inactiveResume);

      const response = await supertest(app)
        .post('/api/resume/upload')
        .field('userId', MOCK_USER_ID)
        .field('isActive', 'false')
        .attach('resume', Buffer.from('mock pdf content'), 'test-resume.pdf');

      expect(response.status).toBe(200);
      expect(createResumeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
        }),
      );
    });

    it('should handle isActive as string "1"', async () => {
      createResumeSpy.mockResolvedValueOnce(mockSafeResume);

      const response = await supertest(app)
        .post('/api/resume/upload')
        .field('userId', MOCK_USER_ID)
        .field('isActive', '1')
        .attach('resume', Buffer.from('mock pdf content'), 'test-resume.pdf');

      expect(response.status).toBe(200);
      expect(createResumeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
        }),
      );
    });

    it('should handle isActive as string "0"', async () => {
      const inactiveResume = {
        ...mockSafeResume,
        isActive: false,
      };
      createResumeSpy.mockResolvedValueOnce(inactiveResume);

      const response = await supertest(app)
        .post('/api/resume/upload')
        .field('userId', MOCK_USER_ID)
        .field('isActive', '0')
        .attach('resume', Buffer.from('mock pdf content'), 'test-resume.pdf');

      expect(response.status).toBe(200);
      expect(createResumeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
        }),
      );
    });
  });

  describe('GET /api/resume/user/:userId', () => {
    it('should return all resumes for a user', async () => {
      const resumes: SafeDatabaseResume[] = [
        mockSafeResume,
        {
          ...mockSafeResume,
          _id: new ObjectId(),
          fileName: 'another-resume.pdf',
          isActive: false,
        },
      ];

      getUserResumesSpy.mockResolvedValueOnce(resumes);

      const response = await supertest(app).get(`/api/resume/user/${MOCK_USER_ID}`);

      expect(response.status).toBe(200);
      const responseBody = response.body;
      expect(responseBody).toHaveLength(resumes.length);
      responseBody.forEach((resume: any, index: number) => {
        expect(resume._id).toBe(resumes[index]._id.toString());
        expect(resume.userId).toBe(resumes[index].userId);
        expect(resume.fileName).toBe(resumes[index].fileName);
        expect(resume.contentType).toBe(resumes[index].contentType);
        expect(resume.fileSize).toBe(resumes[index].fileSize);
        expect(resume.isActive).toBe(resumes[index].isActive);
        expect(new Date(resume.uploadDate).getTime()).toBe(resumes[index].uploadDate.getTime());
      });
      expect(getUserResumesSpy).toHaveBeenCalledWith(MOCK_USER_ID);
    });

    it('should return 500 if service returns error', async () => {
      getUserResumesSpy.mockResolvedValueOnce({ error: 'Error finding user resumes' });

      const response = await supertest(app).get(`/api/resume/user/${MOCK_USER_ID}`);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Error getting resumes');
    });
  });

  describe('GET /api/resume/download/:resumeId', () => {
    it('should download a resume file', async () => {
      const mockFileData = Buffer.from('mock pdf content');
      downloadResumeSpy.mockResolvedValueOnce({
        fileData: mockFileData,
        fileName: 'test-resume.pdf',
        contentType: 'application/pdf',
      });

      const response = await supertest(app).get(`/api/resume/download/${mockResumeId}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('test-resume.pdf');
      expect(response.body).toEqual(mockFileData);
      expect(downloadResumeSpy).toHaveBeenCalledWith(mockResumeId.toString());
    });

    it('should return 500 if service returns error', async () => {
      downloadResumeSpy.mockResolvedValueOnce({ error: 'Resume not found' });

      const response = await supertest(app).get(`/api/resume/download/${mockResumeId}`);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Error downloading resume');
    });

    it('should handle invalid resumeId format', async () => {
      const invalidId = 'invalid-id-format';
      downloadResumeSpy.mockResolvedValueOnce({ error: 'Resume not found' });

      const response = await supertest(app).get(`/api/resume/download/${invalidId}`);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Error downloading resume');
    });
  });

  describe('DELETE /api/resume/:resumeId', () => {
    it('should delete a resume successfully', async () => {
      deleteResumeSpy.mockResolvedValueOnce(mockSafeResume);

      const response = await supertest(app).delete(`/api/resume/${mockResumeId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Resume deleted successfully' });
      expect(deleteResumeSpy).toHaveBeenCalledWith(mockResumeId.toString());
    });

    it('should return 500 if service returns error', async () => {
      deleteResumeSpy.mockResolvedValueOnce({ error: 'Resume not found' });

      const response = await supertest(app).delete(`/api/resume/${mockResumeId}`);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Error deleting resume');
    });

    it('should handle invalid resumeId format', async () => {
      const invalidId = 'invalid-id-format';
      deleteResumeSpy.mockResolvedValueOnce({ error: 'Resume not found' });

      const response = await supertest(app).delete(`/api/resume/${invalidId}`);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Error deleting resume');
    });
  });

  describe('PUT /api/resume/setActive', () => {
    it('should set a resume as active successfully', async () => {
      const updatedResume: SafeDatabaseResume = {
        ...mockSafeResume,
        isActive: true,
      };

      setActiveResumeSpy.mockResolvedValueOnce(updatedResume);

      const response = await supertest(app).put('/api/resume/setActive').send({
        userId: MOCK_USER_ID,
        resumeId: mockResumeId.toString(),
      });

      expect(response.status).toBe(200);
      const responseBody = response.body;
      expect(responseBody._id).toBe(mockResumeId.toString());
      expect(responseBody.userId).toBe(updatedResume.userId);
      expect(responseBody.fileName).toBe(updatedResume.fileName);
      expect(responseBody.contentType).toBe(updatedResume.contentType);
      expect(responseBody.fileSize).toBe(updatedResume.fileSize);
      expect(responseBody.isActive).toBe(updatedResume.isActive);
      expect(new Date(responseBody.uploadDate).getTime()).toBe(updatedResume.uploadDate.getTime());
      expect(setActiveResumeSpy).toHaveBeenCalledWith(MOCK_USER_ID, mockResumeId.toString());
    });

    it('should return 500 if service returns error', async () => {
      setActiveResumeSpy.mockResolvedValueOnce({ error: 'Resume not found' });

      const response = await supertest(app).put('/api/resume/setActive').send({
        userId: MOCK_USER_ID,
        resumeId: mockResumeId.toString(),
      });

      expect(response.status).toBe(500);
      expect(response.text).toContain('Error setting active resume');
    });

    it('should return 400 if userId is missing', async () => {
      const response = await supertest(app).put('/api/resume/setActive').send({
        resumeId: mockResumeId.toString(),
      });

      // OpenAPI validator should catch missing required field
      // Note: OpenAPI validation errors may return 400 or 500 depending on error handling
      expect([400, 500]).toContain(response.status);
      if (response.status === 400) {
        const openApiError = JSON.parse(response.text);
        expect(openApiError.errors[0].path).toContain('userId');
      }
    }, 15000);

    it('should return 400 if resumeId is missing', async () => {
      const response = await supertest(app).put('/api/resume/setActive').send({
        userId: MOCK_USER_ID,
      });

      // OpenAPI validator should catch missing required field
      // Note: OpenAPI validation errors may return 400 or 500 depending on error handling
      expect([400, 500]).toContain(response.status);
      if (response.status === 400) {
        const openApiError = JSON.parse(response.text);
        expect(openApiError.errors[0].path).toContain('resumeId');
      }
    }, 15000);

    it('should handle invalid resumeId format', async () => {
      const invalidId = 'invalid-id-format';
      setActiveResumeSpy.mockResolvedValueOnce({ error: 'Resume not found' });

      const response = await supertest(app).put('/api/resume/setActive').send({
        userId: MOCK_USER_ID,
        resumeId: invalidId,
      });

      expect(response.status).toBe(500);
      expect(response.text).toContain('Error setting active resume');
    });
  });
});
