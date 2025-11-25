import mongoose from 'mongoose';
import supertest from 'supertest';
import { app } from '../../app';
import * as JobApplicationService from '../../services/jobApplication.service';

describe('Job Application Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const jobId = new mongoose.Types.ObjectId().toString();
  const applicationId = new mongoose.Types.ObjectId().toString();
  const username = 'talentUser123';
  const recruiterUsername = 'recruiterUser123';

  const mockApplication = {
    _id: applicationId,
    jobPosting: jobId,
    user: username,
    jobStatus: 'Submitted',
    applicationDate: { date: new Date().toISOString() },
  };

  const mockApplicationList = [mockApplication];

  describe('POST /jobApplication/create', () => {
    it('should return 400 when username is missing as openai validation fails', async () => {
      const response = await supertest(app).post('/api/jobApplication/create').send({ jobId });

      expect(response.status).toBe(400);
      expect(response.text).toBe(
        '{"message":"Request Validation Failed","errors":[{"path":"/body/username","message":"must have required property \'username\'","errorCode":"required.openapi.validation"}]}',
      );
    });

    it('should return 400 when jobId is missing as openai validation fails', async () => {
      const response = await supertest(app).post('/api/jobApplication/create').send({ username });

      expect(response.status).toBe(400);
      expect(response.text).toBe(
        '{"message":"Request Validation Failed","errors":[{"path":"/body/jobId","message":"must have required property \'jobId\'","errorCode":"required.openapi.validation"}]}',
      );
    });

    it('should return 400 when jobId is invalid', async () => {
      const response = await supertest(app)
        .post('/api/jobApplication/create')
        .send({ jobId: 'fakeId', username });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid job ID');
    });

    it('should return 404 when service returns a not found error', async () => {
      jest
        .spyOn(JobApplicationService, 'createApplication')
        .mockResolvedValueOnce({ error: 'Job not found' });

      const response = await supertest(app)
        .post('/api/jobApplication/create')
        .send({ jobId, username });

      expect(response.status).toBe(404);
      expect(response.text).toBe('Job not found');
    });

    it('should return 500 when service returns a general error', async () => {
      jest
        .spyOn(JobApplicationService, 'createApplication')
        .mockResolvedValueOnce({ error: 'Error when applying to a job' });

      const response = await supertest(app)
        .post('/api/jobApplication/create')
        .send({ jobId, username });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error when applying to job: Error when applying to a job');
    });

    it('should return 500 when service throws', async () => {
      jest.spyOn(JobApplicationService, 'createApplication').mockRejectedValueOnce(new Error());

      const response = await supertest(app)
        .post('/api/jobApplication/create')
        .send({ jobId, username });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error when applying to job: ');
    });

    it('should return 201 and application on success', async () => {
      jest
        .spyOn(JobApplicationService, 'createApplication')
        .mockResolvedValueOnce(mockApplication as any);

      const response = await supertest(app)
        .post('/api/jobApplication/create')
        .send({ jobId, username });

      expect(response.status).toBe(201);
      expect(response.text).toEqual(JSON.stringify(mockApplication));
    });
  });
  describe('DELETE /jobApplication/:applicationId', () => {
    it('should return 401 when username is missing', async () => {
      const response = await supertest(app).delete(`/api/jobApplication/${applicationId}`);

      expect(response.status).toBe(401);
      expect(response.text).toBe('Authentication required');
    });

    it('should return 400 when applicationId is invalid', async () => {
      const response = await supertest(app)
        .delete('/api/jobApplication/fakeId')
        .query({ username });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid application ID');
    });

    it('should return 404 when service returns a not found error', async () => {
      jest
        .spyOn(JobApplicationService, 'deleteApplication')
        .mockResolvedValueOnce({ error: 'Application not found' });

      const response = await supertest(app)
        .delete(`/api/jobApplication/${applicationId}`)
        .query({ username });

      expect(response.status).toBe(404);
      expect(response.text).toBe('Application not found');
    });

    it('should return 404 when service returns application not found or already deleted', async () => {
      jest.spyOn(JobApplicationService, 'deleteApplication').mockResolvedValueOnce({
        error: 'Application not found or already deleted',
      });

      const response = await supertest(app)
        .delete(`/api/jobApplication/${applicationId}`)
        .query({ username });

      expect(response.status).toBe(404);
      expect(response.text).toBe('Application not found or already deleted');
    });

    it('should return 403 when service returns a not authorized error', async () => {
      jest.spyOn(JobApplicationService, 'deleteApplication').mockResolvedValueOnce({
        error: 'Not authorized to withdraw application',
      });

      const response = await supertest(app)
        .delete(`/api/jobApplication/${applicationId}`)
        .query({ username });

      expect(response.status).toBe(403);
      expect(response.text).toBe('Not authorized to withdraw application');
    });

    it('should return 500 when service returns a general error', async () => {
      jest.spyOn(JobApplicationService, 'deleteApplication').mockResolvedValueOnce({
        error: 'Some other delete error',
      });

      const response = await supertest(app)
        .delete(`/api/jobApplication/${applicationId}`)
        .query({ username });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error when deleting application: Some other delete error');
    });

    it('should return 500 when service throws', async () => {
      jest
        .spyOn(JobApplicationService, 'deleteApplication')
        .mockRejectedValueOnce(new Error('Service exploded'));

      const response = await supertest(app)
        .delete(`/api/jobapplication/${applicationId}`)
        .query({ username });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error when deleting application: Service exploded');
    });

    it('should return 200 and deleted application on success', async () => {
      jest
        .spyOn(JobApplicationService, 'deleteApplication')
        .mockResolvedValueOnce(mockApplication as any);

      const response = await supertest(app)
        .delete(`/api/jobapplication/${applicationId}`)
        .query({ username });

      expect(response.status).toBe(200);
      expect(response.text).toEqual(JSON.stringify(mockApplication));
    });
  });

  describe('GET /jobapplication/user/:username', () => {
    it('should return 200 and applications when service succeeds', async () => {
      jest
        .spyOn(JobApplicationService, 'getAllApplications')
        .mockResolvedValueOnce(mockApplicationList as any);

      const response = await supertest(app).get(`/api/jobapplication/user/${username}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockApplicationList);
    });

    it('should return 403 when service returns a not authorized error', async () => {
      jest.spyOn(JobApplicationService, 'getAllApplications').mockResolvedValueOnce({
        error: 'User type not authorized',
      });

      const response = await supertest(app).get(`/api/jobapplication/user/${username}`);

      expect(response.status).toBe(403);
      expect(response.text).toBe('User type not authorized');
    });

    it('should return 500 when service returns a user not found error', async () => {
      jest.spyOn(JobApplicationService, 'getAllApplications').mockResolvedValueOnce({
        error: 'User not found',
      });

      const response = await supertest(app).get(`/api/jobapplication/user/${username}`);

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error when fetching applications: User not found');
    });

    it('should return 500 when service throws', async () => {
      jest
        .spyOn(JobApplicationService, 'getAllApplications')
        .mockRejectedValueOnce(new Error('Service exploded'));

      const response = await supertest(app).get(`/api/jobapplication/user/${username}`);

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error when fetching applications: Service exploded');
    });
  });
  describe('GET /jobapplication/job/:jobId', () => {
    it('should return 401 when requestor is missing as openapi validation fails', async () => {
      const response = await supertest(app).get(`/api/jobapplication/job/${jobId}`);

      expect(response.status).toBe(401);
      expect(response.text).toBe('Authentication required');
    });

    it('should return 400 when jobId is invalid', async () => {
      const response = await supertest(app)
        .get('/api/jobapplication/job/fakeId')
        .query({ requestor: recruiterUsername });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid job ID');
    });

    it('should return 404 when service returns a not found error', async () => {
      jest
        .spyOn(JobApplicationService, 'getApplicationByJobId')
        .mockResolvedValueOnce({ error: 'Job not found' } as any);

      const response = await supertest(app)
        .get(`/api/jobapplication/job/${jobId}`)
        .query({ requestor: recruiterUsername });

      expect(response.status).toBe(404);
      expect(response.text).toBe('Job not found');
    });

    it('should return 403 when service returns a not authorized error', async () => {
      jest.spyOn(JobApplicationService, 'getApplicationByJobId').mockResolvedValueOnce({
        error: 'User not authorized to view job applications',
      } as any);

      const response = await supertest(app)
        .get(`/api/jobapplication/job/${jobId}`)
        .query({ requestor: recruiterUsername });

      expect(response.status).toBe(403);
      expect(response.text).toBe('User not authorized to view job applications');
    });

    it('should return 500 when service returns a general error', async () => {
      jest.spyOn(JobApplicationService, 'getApplicationByJobId').mockResolvedValueOnce({
        error: 'Applications could not be fetched for job',
      } as any);

      const response = await supertest(app)
        .get(`/api/jobapplication/job/${jobId}`)
        .query({ requestor: recruiterUsername });

      expect(response.status).toBe(500);
      expect(response.text).toBe(
        'Error when fetching applications: Applications could not be fetched for job',
      );
    });

    it('should return 500 when service throws', async () => {
      jest
        .spyOn(JobApplicationService, 'getApplicationByJobId')
        .mockRejectedValueOnce(new Error('Service exploded'));

      const response = await supertest(app)
        .get(`/api/jobapplication/job/${jobId}`)
        .query({ requestor: recruiterUsername });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error when fetching applications: Service exploded');
    });

    it('should return 200 and applications on success', async () => {
      jest
        .spyOn(JobApplicationService, 'getApplicationByJobId')
        .mockResolvedValueOnce(mockApplicationList as any);

      const response = await supertest(app)
        .get(`/api/jobapplication/job/${jobId}`)
        .query({ requestor: recruiterUsername });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockApplicationList);
    });
  });

  describe('GET /jobapplication/:jobId/status', () => {
    it('should return 401 when username is missing as openapi validation fails', async () => {
      const response = await supertest(app).get(`/api/jobApplication/${jobId}/status`);

      expect(response.status).toBe(401);
      expect(response.text).toBe('Authentication required');
    });

    it('should return 400 when jobId is invalid', async () => {
      const response = await supertest(app)
        .get('/api/jobApplication/fakeId/status')
        .query({ username });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid job ID');
    });

    it('should return 200 and hasApplied true when service returns true', async () => {
      jest.spyOn(JobApplicationService, 'hasUserApplied').mockResolvedValueOnce(true);

      const response = await supertest(app)
        .get(`/api/jobApplication/${jobId}/status`)
        .query({ username });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ hasApplied: true });
    });

    it('should return 200 and hasApplied false when service returns false', async () => {
      jest.spyOn(JobApplicationService, 'hasUserApplied').mockResolvedValueOnce(false);

      const response = await supertest(app)
        .get(`/api/jobApplication/${jobId}/status`)
        .query({ username });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ hasApplied: false });
    });

    it('should return 500 when service throws', async () => {
      jest
        .spyOn(JobApplicationService, 'hasUserApplied')
        .mockRejectedValueOnce(new Error('Service exploded'));

      const response = await supertest(app)
        .get(`/api/jobApplication/${jobId}/status`)
        .query({ username });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error when checking application status: Service exploded');
    });
  });
});
