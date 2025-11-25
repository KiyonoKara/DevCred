import mongoose from 'mongoose';
import supertest from 'supertest';
import { app } from '../../app';
import JobPostingModel from '../../models/jobPosting.model';
import * as JobPostingService from '../../services/jobPosting.service';
import * as TagService from '../../services/tag.service';

describe('Job Posting Controller', () => {
  const jobId = new mongoose.Types.ObjectId().toString();

  const username = 'talentUser123';
  const recruiterUsername = 'recruiterUser123';

  const mockJobPosting = {
    _id: jobId,
    company: 'Tech Corp',
    recruiter: recruiterUsername,
    title: 'Backend Engineer',
    description: 'Build backend APIs',
    location: 'Remote',
    tags: [{ _id: new mongoose.Types.ObjectId().toString(), name: 'remote' }],
    active: true,
    jobType: 'full-time',
    deadline: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockJobPostingList = [mockJobPosting];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /jobposting/list', () => {
    it('should return 401 when requestor is missing', async () => {
      const response = await supertest(app).get('/api/jobposting/list');

      expect(response.status).toBe(401);
      expect(response.text).toBe('Authentication required');
    });

    it('should return 200 and jobs when service succeeds', async () => {
      jest
        .spyOn(JobPostingService, 'getJobPostings')
        .mockResolvedValueOnce(mockJobPostingList as any);

      const response = await supertest(app)
        .get('/api/jobposting/list')
        .query({ requestor: username });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockJobPostingList);
    });
    it('should return 200 with an empty array when service returns an empty list', async () => {
      jest.spyOn(JobPostingService, 'getJobPostings').mockResolvedValueOnce([]);

      const response = await supertest(app)
        .get('/api/jobposting/list')
        .query({ requestor: username });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return 500 when service returns an error object', async () => {
      jest
        .spyOn(JobPostingService, 'getJobPostings')
        .mockResolvedValueOnce({ error: 'Error fetching jobs' } as any);

      const response = await supertest(app)
        .get('/api/jobposting/list')
        .query({ requestor: username });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error when fetching job postings: Error fetching jobs');
    });

    it('should return 500 when service throws', async () => {
      jest
        .spyOn(JobPostingService, 'getJobPostings')
        .mockRejectedValueOnce(new Error('DB exploded'));

      const response = await supertest(app)
        .get('/api/jobposting/list')
        .query({ requestor: username });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error when fetching job postings: DB exploded');
    });

    it('should pass location filter to service', async () => {
      jest
        .spyOn(JobPostingService, 'getJobPostings')
        .mockResolvedValueOnce(mockJobPostingList as any);

      const response = await supertest(app)
        .get('/api/jobposting/list')
        .query({ requestor: username, location: 'Remote' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockJobPostingList);
    });

    it('should pass jobType filter to service', async () => {
      jest
        .spyOn(JobPostingService, 'getJobPostings')
        .mockResolvedValueOnce(mockJobPostingList as any);

      const response = await supertest(app)
        .get('/api/jobposting/list')
        .query({ requestor: username, jobType: 'full-time' });

      expect(response.status).toBe(200);

      expect(response.body).toEqual(mockJobPostingList);
    });

    it('should pass search filter to service', async () => {
      jest
        .spyOn(JobPostingService, 'getJobPostings')
        .mockResolvedValueOnce(mockJobPostingList as any);

      const response = await supertest(app)
        .get('/api/jobposting/list')
        .query({ requestor: username, search: 'backend #remote' });

      expect(response.status).toBe(200);

      expect(response.body).toEqual(mockJobPostingList);
    });

    it('should pass all filters to service when provided together', async () => {
      jest
        .spyOn(JobPostingService, 'getJobPostings')
        .mockResolvedValueOnce(mockJobPostingList as any);

      const response = await supertest(app).get('/api/jobposting/list').query({
        requestor: username,
        location: 'Remote',
        jobType: 'full-time',
        search: 'backend #remote',
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockJobPostingList);
    });
  });

  describe('GET /jobposting/:jobId', () => {
    it('should return 400 when requestor is missing as openapi validation fails', async () => {
      const response = await supertest(app).get(`/api/jobposting/${jobId}`);

      expect(response.status).toBe(400);
      expect(response.text).toBe(
        '{"message":"Request Validation Failed","errors":[{"path":"/query/requestor","message":"must have required property \'requestor\'","errorCode":"required.openapi.validation"}]}',
      );
    });

    it('should return 400 when jobId is invalid', async () => {
      const response = await supertest(app)
        .get(`/api/jobposting/fakeJobID`)
        .query({ requestor: username });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid ID format');
    });

    it('should return 404 when service returns a not found error', async () => {
      jest
        .spyOn(JobPostingService, 'getJobPostingById')
        .mockResolvedValueOnce({ error: 'Job posting not found' } as any);

      const response = await supertest(app)
        .get(`/api/jobposting/${jobId}`)
        .query({ requestor: username });

      expect(response.status).toBe(404);
      expect(response.text).toBe('Job posting not found');
    });

    it('should return 500 when service returns a general error', async () => {
      jest
        .spyOn(JobPostingService, 'getJobPostingById')
        .mockResolvedValueOnce({ error: 'Error fetching job posting' } as any);

      const response = await supertest(app)
        .get(`/api/jobposting/${jobId}`)
        .query({ requestor: username });

      expect(response.status).toBe(500);
      expect(response.text).toBe(
        'Error when fetching job posting by id: Error fetching job posting',
      );
    });

    it('should return 500 when service throws', async () => {
      jest
        .spyOn(JobPostingService, 'getJobPostingById')
        .mockRejectedValueOnce(new Error('Service exploded'));

      const response = await supertest(app)
        .get(`/api/jobposting/${jobId}`)
        .query({ requestor: username });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error when fetching job posting by id: Service exploded');
    });

    it('should return 200 and job when service succeeds', async () => {
      jest
        .spyOn(JobPostingService, 'getJobPostingById')
        .mockResolvedValueOnce(mockJobPosting as any);

      const response = await supertest(app)
        .get(`/api/jobposting/${jobId}`)
        .query({ requestor: username });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockJobPosting);
    });
  });

  describe('GET /jobposting/recruiter/:username', () => {
    it('should return 500 when requestorUsername is missing as openapi validation fails', async () => {
      const response = await supertest(app).get(`/api/jobposting/recruiter/${recruiterUsername}`);

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error when fetching job postings: Invalid Request');
    });

    it('should return 401 when recruiterUsername and requestorUsername do not match', async () => {
      const response = await supertest(app)
        .get(`/api/jobposting/recruiter/${recruiterUsername}`)
        .query({ requestorUsername: username });

      expect(response.status).toBe(401);
      expect(response.text).toBe('Unauthorized request for job postings');
    });

    it('should return 200 and job postings when service succeeds and usernames match', async () => {
      jest
        .spyOn(JobPostingService, 'getJobPostingByRecruiter')
        .mockResolvedValueOnce(mockJobPostingList as any);

      const response = await supertest(app)
        .get(`/api/jobposting/recruiter/${recruiterUsername}`)
        .query({ requestorUsername: recruiterUsername });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockJobPostingList);
    });

    it('should return 500 when handler throws due to invalid request (missing usernames, bypassing openapi)', async () => {
      const response = await supertest(app)
        .get('/api/jobposting/recruiter/')
        .query({ requestorUsername: '' });

      expect(response.status).toBe(400);
      expect(response.text).toBe(
        '{"message":"Request Validation Failed","errors":[{"path":"/query/requestorUsername","message":"Unknown query parameter \'requestorUsername\'"}]}',
      );
    });

    it('should return 500 when service throws', async () => {
      jest
        .spyOn(JobPostingService, 'getJobPostingByRecruiter')
        .mockRejectedValueOnce(new Error('Service exploded'));

      const response = await supertest(app)
        .get(`/api/jobposting/recruiter/${recruiterUsername}`)
        .query({ requestorUsername: recruiterUsername });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error when fetching job postings: Service exploded');
    });
  });

  describe('POST /jobposting/create', () => {
    const jobRequestBody = {
      company: 'Tech Corp',
      recruiter: recruiterUsername,
      title: 'Backend Engineer',
      description: 'Build backend APIs',
      location: 'Remote',
      tags: [{ name: 'remote' }],
      active: true,
      payRange: '100k-130k',
      jobType: 'full-time',
      deadline: new Date().toISOString(),
    };

    it('should return 201 and populated job when creation succeeds', async () => {
      jest
        .spyOn(TagService, 'processTags')
        .mockResolvedValueOnce([
          { _id: new mongoose.Types.ObjectId().toString(), name: 'remote' },
        ] as any);

      jest
        .spyOn(JobPostingService, 'createJobPosting')
        .mockResolvedValueOnce({ _id: jobId } as any);

      const populate = jest.fn().mockResolvedValue(mockJobPosting as any);
      jest.spyOn(JobPostingModel, 'findById').mockReturnValue({ populate } as any);

      const response = await supertest(app).post('/api/jobposting/create').send(jobRequestBody);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockJobPosting);
    });

    it('should return 500 when tags are invalid (processed tags empty but original are not)', async () => {
      jest.spyOn(TagService, 'processTags').mockResolvedValueOnce([] as any);

      const response = await supertest(app).post('/api/jobposting/create').send(jobRequestBody);

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error when saving job posting: Invalid tags');
    });

    it('should return 500 when createJobPosting service returns an error object', async () => {
      jest
        .spyOn(TagService, 'processTags')
        .mockResolvedValueOnce([
          { _id: new mongoose.Types.ObjectId().toString(), name: 'remote' },
        ] as any);

      jest.spyOn(JobPostingService, 'createJobPosting').mockResolvedValueOnce({
        error: 'Error creating job posting',
      } as any);

      const response = await supertest(app).post('/api/jobposting/create').send(jobRequestBody);

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error when saving job posting: Error creating job posting');
    });

    it('should return 500 when populated job cannot be fetched after creation', async () => {
      jest
        .spyOn(TagService, 'processTags')
        .mockResolvedValueOnce([
          { _id: new mongoose.Types.ObjectId().toString(), name: 'remote' },
        ] as any);

      jest
        .spyOn(JobPostingService, 'createJobPosting')
        .mockResolvedValueOnce({ _id: jobId } as any);

      const populate = jest.fn().mockResolvedValue(null);
      jest.spyOn(JobPostingModel, 'findById').mockReturnValue({ populate } as any);

      const response = await supertest(app).post('/api/jobposting/create').send(jobRequestBody);

      expect(response.status).toBe(500);
      expect(response.text).toBe(
        'Error when saving job posting: Failed to fetch created job posting',
      );
    });

    it('should return 500 when service throws (e.g., createJobPosting throws)', async () => {
      jest
        .spyOn(TagService, 'processTags')
        .mockResolvedValueOnce([
          { _id: new mongoose.Types.ObjectId().toString(), name: 'remote' },
        ] as any);

      jest
        .spyOn(JobPostingService, 'createJobPosting')
        .mockRejectedValueOnce(new Error('Service exploded'));

      const response = await supertest(app).post('/api/jobposting/create').send(jobRequestBody);

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error when saving job posting: Service exploded');
    });
  });

  describe('DELETE /jobposting/:jobId', () => {
    it('should return 401 when requestor is missing', async () => {
      const response = await supertest(app).delete(`/api/jobposting/${jobId}`);

      expect(response.status).toBe(401);
      expect(response.text).toBe('Authentication required');
    });

    it('should return 400 when jobId is invalid', async () => {
      const response = await supertest(app)
        .delete('/api/jobposting/fakeJobID')
        .query({ requestor: username });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid ID format');
    });

    it('should return 404 when service returns a not found error', async () => {
      jest
        .spyOn(JobPostingService, 'deleteJobPosting')
        .mockResolvedValueOnce({ error: 'Job posting not found' } as any);

      const response = await supertest(app)
        .delete(`/api/jobposting/${jobId}`)
        .query({ requestor: username });

      expect(response.status).toBe(404);
      expect(response.text).toBe('Job posting not found');
    });

    it('should return 500 when service returns a general error', async () => {
      jest.spyOn(JobPostingService, 'deleteJobPosting').mockResolvedValueOnce({
        error: 'Error deleting job posting',
      } as any);

      const response = await supertest(app)
        .delete(`/api/jobposting/${jobId}`)
        .query({ requestor: username });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error when deleting job posting: Error deleting job posting');
    });

    it('should return 500 when service throws', async () => {
      jest
        .spyOn(JobPostingService, 'deleteJobPosting')
        .mockRejectedValueOnce(new Error('Service exploded'));

      const response = await supertest(app)
        .delete(`/api/jobposting/${jobId}`)
        .query({ requestor: username });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error when deleting job posting: Service exploded');
    });

    it('should return 200 and deleted job when service succeeds', async () => {
      jest.spyOn(JobPostingService, 'deleteJobPosting').mockResolvedValueOnce({
        ...mockJobPosting,
        active: false,
      } as any);

      const response = await supertest(app)
        .delete(`/api/jobposting/${jobId}`)
        .query({ requestor: username });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ...mockJobPosting,
        active: false,
      });
    });
  });

  describe('PATCH /jobposting/:jobId/toggle', () => {
    const toggledJobPosting = {
      ...mockJobPosting,
      active: !mockJobPosting.active,
    };

    it('should return 401 when requestor is missing', async () => {
      const response = await supertest(app).patch(`/api/jobposting/${jobId}/toggle`);

      expect(response.status).toBe(401);
      expect(response.text).toBe('Authentication required');
    });

    it('should return 400 when jobId is invalid', async () => {
      const response = await supertest(app)
        .patch('/api/jobposting/fakeJobID/toggle')
        .query({ requestor: username });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid ID format');
    });

    it('should return 404 when service returns a not found error', async () => {
      jest.spyOn(JobPostingService, 'toggleJobPostingActive').mockResolvedValueOnce({
        error: 'Job posting not found',
      } as any);

      const response = await supertest(app)
        .patch(`/api/jobposting/${jobId}/toggle`)
        .query({ requestor: username });

      expect(response.status).toBe(404);
      expect(response.text).toBe('Job posting not found');
    });

    it('should return 500 when service returns a general error', async () => {
      jest.spyOn(JobPostingService, 'toggleJobPostingActive').mockResolvedValueOnce({
        error: 'Error toggling job posting',
      } as any);

      const response = await supertest(app)
        .patch(`/api/jobposting/${jobId}/toggle`)
        .query({ requestor: username });

      expect(response.status).toBe(500);
      expect(response.text).toBe(
        'Error when toggling job posting status: Error toggling job posting',
      );
    });

    it('should return 500 when service throws', async () => {
      jest
        .spyOn(JobPostingService, 'toggleJobPostingActive')
        .mockRejectedValueOnce(new Error('Service exploded'));

      const response = await supertest(app)
        .patch(`/api/jobposting/${jobId}/toggle`)
        .query({ requestor: username });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error when toggling job posting status: Service exploded');
    });

    it('should return 200 and toggled job when service succeeds', async () => {
      jest
        .spyOn(JobPostingService, 'toggleJobPostingActive')
        .mockResolvedValueOnce(toggledJobPosting as any);

      const response = await supertest(app)
        .patch(`/api/jobposting/${jobId}/toggle`)
        .query({ requestor: username });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(toggledJobPosting);
    });
  });
});
