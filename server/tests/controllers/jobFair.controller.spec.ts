import request from 'supertest';
import { Express } from 'express';
import mongoose from 'mongoose';
import { app } from '../../app';
import * as jobFairService from '../../services/jobFair.service';
import * as notificationService from '../../services/notification.service';
import UserModel from '../../models/users.model';
import { DatabaseJobFair } from '../../types/types';

let testApp: Express;

// Declare service spies at the top level
let createJobFairSpy: jest.SpyInstance;
let getJobFairsSpy: jest.SpyInstance;
let getJobFairByIdSpy: jest.SpyInstance;
let updateJobFairStatusSpy: jest.SpyInstance;
let joinJobFairSpy: jest.SpyInstance;
let leaveJobFairSpy: jest.SpyInstance;
let addJobFairMessageSpy: jest.SpyInstance;
let updateJobFairSpy: jest.SpyInstance;
let deleteJobFairSpy: jest.SpyInstance;
let createNotificationSpy: jest.SpyInstance;
let userModelFindOneSpy: jest.SpyInstance;

describe('JobFair Controller', () => {
  beforeAll(() => {
    testApp = app;
  });

  beforeEach(() => {
    // clean all mocks
    jest.clearAllMocks();

    // init the spies
    createJobFairSpy = jest.spyOn(jobFairService, 'createJobFair');
    getJobFairsSpy = jest.spyOn(jobFairService, 'getJobFairs');
    getJobFairByIdSpy = jest.spyOn(jobFairService, 'getJobFairById');
    updateJobFairStatusSpy = jest.spyOn(jobFairService, 'updateJobFairStatus');
    joinJobFairSpy = jest.spyOn(jobFairService, 'joinJobFair');
    leaveJobFairSpy = jest.spyOn(jobFairService, 'leaveJobFair');
    addJobFairMessageSpy = jest.spyOn(jobFairService, 'addJobFairMessage');
    updateJobFairSpy = jest.spyOn(jobFairService, 'updateJobFair');
    deleteJobFairSpy = jest.spyOn(jobFairService, 'deleteJobFair');
    createNotificationSpy = jest.spyOn(notificationService, 'createNotification');
    userModelFindOneSpy = jest.spyOn(UserModel, 'findOne');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockJobFairId = new mongoose.Types.ObjectId();
  const mockMessageId = new mongoose.Types.ObjectId();

  // basing thhe data off the boston career fair because it's relevant
  const mockJobFair: DatabaseJobFair = {
    _id: mockJobFairId,
    title: 'Boston Career Forum 2025',
    description: 'Early career fair for new graduates!',
    hostUsername: 'recruiter1',
    visibility: 'public',
    status: 'upcoming',
    startTime: new Date('2025-06-01T10:00:00Z'),
    endTime: new Date('2025-06-01T18:00:00Z'),
    codingTournamentEnabled: true,
    overviewMessage: 'Welcome to the forum!',
    participants: ['user1'],
    invitedUsers: [],
    chatMessages: [mockMessageId],
    codingSubmissions: [],
    documents: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('POST /api/jobfair/create', () => {
    const validJobFairData = {
      title: 'Boston Career Forum 2025',
      description: 'Early career fair for new graduates!',
      hostUsername: 'recruiter1',
      visibility: 'public',
      startTime: '2025-06-01T10:00:00.000Z',
      endTime: '2025-06-01T18:00:00.000Z',
      codingTournamentEnabled: true,
      overviewMessage: 'Welcome!',
      invitedUsers: [],
    };

    it('should create a job fair successfully', async () => {
      createJobFairSpy.mockResolvedValueOnce(mockJobFair);

      const response = await request(testApp).post('/api/jobfair/create').send(validJobFairData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.title).toBe(validJobFairData.title);
      expect(response.body.hostUsername).toBe(validJobFairData.hostUsername);
    });

    it('should return 400 if hostUsername is missing (OpenAPI validation)', async () => {
      const invalidData = { ...validJobFairData };
      delete (invalidData as any).hostUsername;

      const response = await request(testApp).post('/api/jobfair/create').send(invalidData);

      expect(response.status).toBe(400);
      // OpenAPI validation returns "message" field
      // done since the yml file changes quite a bit
      expect(response.body.message).toBeDefined();
    });

    it('should return 500 if service returns error', async () => {
      createJobFairSpy.mockResolvedValueOnce({ error: 'Database error' });

      const response = await request(testApp).post('/api/jobfair/create').send(validJobFairData);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Database error');
    });
  });

  describe('GET /api/jobfair/list', () => {
    const mockJobFairs: DatabaseJobFair[] = [mockJobFair];

    it('should get all job fairs without filters', async () => {
      getJobFairsSpy.mockResolvedValueOnce(mockJobFairs);

      const response = await request(testApp).get('/api/jobfair/list');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]._id).toBe(mockJobFairId.toString());
      expect(getJobFairsSpy).toHaveBeenCalledWith(undefined, undefined, undefined);
    });

    it('should filter job fairs by status', async () => {
      getJobFairsSpy.mockResolvedValueOnce(mockJobFairs);

      const response = await request(testApp).get('/api/jobfair/list?status=upcoming');

      expect(response.status).toBe(200);
      expect(getJobFairsSpy).toHaveBeenCalledWith('upcoming', undefined, undefined);
    });

    it('should filter job fairs by visibility', async () => {
      getJobFairsSpy.mockResolvedValueOnce(mockJobFairs);

      const response = await request(testApp).get('/api/jobfair/list?visibility=public');

      expect(response.status).toBe(200);
      expect(getJobFairsSpy).toHaveBeenCalledWith(undefined, 'public', undefined);
    });

    it('should filter job fairs by username', async () => {
      getJobFairsSpy.mockResolvedValueOnce(mockJobFairs);

      const response = await request(testApp).get('/api/jobfair/list').set('username', 'user1');

      expect(response.status).toBe(200);
      expect(getJobFairsSpy).toHaveBeenCalledWith(undefined, undefined, 'user1');
    });

    it('should handle multiple filters', async () => {
      getJobFairsSpy.mockResolvedValueOnce(mockJobFairs);

      const response = await request(testApp)
        .get('/api/jobfair/list?status=live&visibility=public')
        .set('username', 'user1');

      expect(response.status).toBe(200);
      expect(getJobFairsSpy).toHaveBeenCalledWith('live', 'public', 'user1');
    });

    it('should return 500 if service returns error', async () => {
      getJobFairsSpy.mockResolvedValueOnce({ error: 'Database error' });

      const response = await request(testApp).get('/api/jobfair/list');

      expect(response.status).toBe(500);
      expect(response.text).toContain('Database error');
    });
  });

  describe('GET /api/jobfair/:jobFairId', () => {
    it('should get job fair by ID', async () => {
      getJobFairByIdSpy.mockResolvedValueOnce(mockJobFair);

      const response = await request(testApp).get(`/api/jobfair/${mockJobFairId}`);

      expect(response.status).toBe(200);
      expect(response.body._id).toBe(mockJobFairId.toString());
      expect(response.body.title).toBe(mockJobFair.title);
      expect(getJobFairByIdSpy).toHaveBeenCalledWith(mockJobFairId.toString(), undefined);
    });

    it('should get job fair with username parameter', async () => {
      getJobFairByIdSpy.mockResolvedValueOnce(mockJobFair);

      const response = await request(testApp)
        .get(`/api/jobfair/${mockJobFairId}`)
        .set('username', 'user1');

      expect(response.status).toBe(200);
      expect(getJobFairByIdSpy).toHaveBeenCalledWith(mockJobFairId.toString(), 'user1');
    });

    it('should return 404 if job fair not found', async () => {
      getJobFairByIdSpy.mockResolvedValueOnce({ error: 'Job fair not found' });

      const response = await request(testApp).get(`/api/jobfair/${mockJobFairId}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 if access denied', async () => {
      getJobFairByIdSpy.mockResolvedValueOnce({ error: 'Access denied' });

      const response = await request(testApp).get(`/api/jobfair/${mockJobFairId}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 500 for other errors', async () => {
      getJobFairByIdSpy.mockResolvedValueOnce({ error: 'Database error' });

      const response = await request(testApp).get(`/api/jobfair/${mockJobFairId}`);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Database error');
    });
  });

  describe('PATCH /api/jobfair/:jobFairId/status', () => {
    const statusUpdate = { status: 'live' as const, hostUsername: 'recruiter1' };

    it('should update job fair status', async () => {
      const updatedJobFair = { ...mockJobFair, status: 'live' as const };
      updateJobFairStatusSpy.mockResolvedValueOnce(updatedJobFair);

      userModelFindOneSpy.mockReturnValue({
        // when user has notifs disabled
        select: jest.fn().mockResolvedValue(null),
      } as any);

      const response = await request(testApp)
        .patch(`/api/jobfair/${mockJobFairId}/status`)
        .send(statusUpdate);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('live');
      expect(updateJobFairStatusSpy).toHaveBeenCalledWith(
        mockJobFairId.toString(),
        'recruiter1',
        'live',
      );
    });

    it('should create notifications for participants when status is live', async () => {
      const updatedJobFair = {
        ...mockJobFair,
        status: 'live' as const,
        participants: ['user1', 'user2'],
      };
      updateJobFairStatusSpy.mockResolvedValueOnce(updatedJobFair);
      createNotificationSpy.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

      // Mock the UserModel.findOne to return users with notification preferences
      // it works this way trust me
      userModelFindOneSpy.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          notificationPreferences: { enabled: true, jobFairEnabled: true },
        }),
      } as any);

      const response = await request(testApp)
        .patch(`/api/jobfair/${mockJobFairId}/status`)
        .send(statusUpdate);

      expect(response.status).toBe(200);
      expect(createNotificationSpy).toHaveBeenCalledTimes(2);
    });

    it('should create notifications for participants when status is ended', async () => {
      const endedJobFair = { ...mockJobFair, status: 'ended' as const, participants: ['user1'] };
      updateJobFairStatusSpy.mockResolvedValueOnce(endedJobFair);
      createNotificationSpy.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

      // Mock UserModel.findOne
      userModelFindOneSpy.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          notificationPreferences: { enabled: true, jobFairEnabled: true },
        }),
      } as any);

      const response = await request(testApp)
        .patch(`/api/jobfair/${mockJobFairId}/status`)
        .send({ status: 'ended', hostUsername: 'recruiter1' });

      expect(response.status).toBe(200);
      expect(createNotificationSpy).toHaveBeenCalledTimes(1);
    });

    it('should return 400 if hostUsername is missing (OpenAPI validation)', async () => {
      const response = await request(testApp)
        .patch(`/api/jobfair/${mockJobFairId}/status`)
        .send({ status: 'live' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBeDefined();
    });

    it('should return 403 if user is not authorized', async () => {
      updateJobFairStatusSpy.mockResolvedValueOnce({
        error: 'Only the host can update job fair status',
      });

      const response = await request(testApp)
        .patch(`/api/jobfair/${mockJobFairId}/status`)
        .send(statusUpdate);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 if job fair not found', async () => {
      updateJobFairStatusSpy.mockResolvedValueOnce({ error: 'Job fair not found' });

      const response = await request(testApp)
        .patch(`/api/jobfair/${mockJobFairId}/status`)
        .send(statusUpdate);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 500 for other errors', async () => {
      updateJobFairStatusSpy.mockResolvedValueOnce({ error: 'Database error' });

      const response = await request(testApp)
        .patch(`/api/jobfair/${mockJobFairId}/status`)
        .send(statusUpdate);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Database error');
    });
  });

  describe('PUT /api/jobfair/:jobFairId', () => {
    const updateData = {
      hostUsername: 'recruiter1',
      title: 'Updated Title',
      description: 'Updated Description',
    };

    it('should update job fair', async () => {
      const updatedJobFair = { ...mockJobFair, ...updateData };
      updateJobFairSpy.mockResolvedValueOnce(updatedJobFair);

      const response = await request(testApp).put(`/api/jobfair/${mockJobFairId}`).send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated Title');
      expect(updateJobFairSpy).toHaveBeenCalledWith(mockJobFairId.toString(), 'recruiter1', {
        title: 'Updated Title',
        description: 'Updated Description',
      });
    });

    it('should return 400 if hostUsername is missing (OpenAPI validation)', async () => {
      const response = await request(testApp)
        .put(`/api/jobfair/${mockJobFairId}`)
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBeDefined();
    });

    it('should return 403 if user is not the host', async () => {
      updateJobFairSpy.mockResolvedValueOnce({ error: 'Only the host can update the job fair' });

      const response = await request(testApp).put(`/api/jobfair/${mockJobFairId}`).send(updateData);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 if job fair not found', async () => {
      updateJobFairSpy.mockResolvedValueOnce({ error: 'Job fair not found' });

      const response = await request(testApp).put(`/api/jobfair/${mockJobFairId}`).send(updateData);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 500 for other errors', async () => {
      updateJobFairSpy.mockResolvedValueOnce({ error: 'Database error' });

      const response = await request(testApp).put(`/api/jobfair/${mockJobFairId}`).send(updateData);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Database error');
    });
  });

  describe('POST /api/jobfair/:jobFairId/join', () => {
    const joinData = { username: 'user2' };

    it('should join job fair', async () => {
      const updatedJobFair = {
        ...mockJobFair,
        participants: [...mockJobFair.participants, 'user2'],
      };
      joinJobFairSpy.mockResolvedValueOnce(updatedJobFair);

      const response = await request(testApp)
        .post(`/api/jobfair/${mockJobFairId}/join`)
        .send(joinData);

      expect(response.status).toBe(200);
      expect(response.body.participants).toContain('user2');
      expect(joinJobFairSpy).toHaveBeenCalledWith(mockJobFairId.toString(), 'user2');
    });

    it('should return 400 if username is missing', async () => {
      const response = await request(testApp).post(`/api/jobfair/${mockJobFairId}/join`).send({});

      expect(response.status).toBe(400);
      // OpenAPI validation because the yml file has ever-changing documentation
      expect(response.body.message || response.body.error).toBeDefined();
    });

    it('should return 400 if user already joined', async () => {
      // if they are already a participant then they don't need to join again
      // technically 403 also works but that would imply the user can't see the job fair at all
      joinJobFairSpy.mockResolvedValueOnce({
        error: 'User is already a participant in this job fair',
      });

      const response = await request(testApp)
        .post(`/api/jobfair/${mockJobFairId}/join`)
        .send(joinData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 if access denied', async () => {
      // when user tries to join a job fair uninvited
      joinJobFairSpy.mockResolvedValueOnce({ error: 'Access denied' });

      const response = await request(testApp)
        .post(`/api/jobfair/${mockJobFairId}/join`)
        .send(joinData);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 if job fair not found', async () => {
      // when user tries to join a non-existent job fair
      joinJobFairSpy.mockResolvedValueOnce({ error: 'Job fair not found' });

      const response = await request(testApp)
        .post(`/api/jobfair/${mockJobFairId}/join`)
        .send(joinData);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 500 for other errors', async () => {
      joinJobFairSpy.mockResolvedValueOnce({ error: 'Database error' });

      const response = await request(testApp)
        .post(`/api/jobfair/${mockJobFairId}/join`)
        .send(joinData);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Database error');
    });
  });

  describe('POST /api/jobfair/:jobFairId/leave', () => {
    const leaveData = { username: 'user1' };

    it('should leave job fair', async () => {
      const updatedJobFair = { ...mockJobFair, participants: [] };
      leaveJobFairSpy.mockResolvedValueOnce(updatedJobFair);

      const response = await request(testApp)
        .post(`/api/jobfair/${mockJobFairId}/leave`)
        .send(leaveData);

      expect(response.status).toBe(200);
      expect(response.body.participants).not.toContain('user1');
      expect(leaveJobFairSpy).toHaveBeenCalledWith(mockJobFairId.toString(), 'user1');
    });

    it('should return 401 if username is missing', async () => {
      const response = await request(testApp).post(`/api/jobfair/${mockJobFairId}/leave`).send({});

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Authentication required');
    });

    it('should return 400 if user is not a participant', async () => {
      leaveJobFairSpy.mockResolvedValueOnce({
        error: 'User is not a participant in this job fair',
      });

      const response = await request(testApp)
        .post(`/api/jobfair/${mockJobFairId}/leave`)
        .send(leaveData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 if job fair not found', async () => {
      leaveJobFairSpy.mockResolvedValueOnce({ error: 'Job fair not found' });

      const response = await request(testApp)
        .post(`/api/jobfair/${mockJobFairId}/leave`)
        .send(leaveData);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 500 for other errors', async () => {
      leaveJobFairSpy.mockResolvedValueOnce({ error: 'Database error' });

      const response = await request(testApp)
        .post(`/api/jobfair/${mockJobFairId}/leave`)
        .send(leaveData);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Database error');
    });
  });

  describe('POST /api/jobfair/:jobFairId/message', () => {
    const messageData = {
      msg: 'Hello everyone!',
      msgFrom: 'user1',
      msgDateTime: new Date('2025-06-01T12:00:00Z').toISOString(),
    };

    it('should add message', async () => {
      const updatedJobFair = {
        ...mockJobFair,
        chatMessages: [...mockJobFair.chatMessages, new mongoose.Types.ObjectId()],
      };
      addJobFairMessageSpy.mockResolvedValueOnce(updatedJobFair);

      const response = await request(testApp)
        .post(`/api/jobfair/${mockJobFairId}/message`)
        .send(messageData);

      expect(response.status).toBe(200);
      expect(addJobFairMessageSpy).toHaveBeenCalledWith(
        mockJobFairId.toString(),
        expect.objectContaining({
          msg: messageData.msg,
          msgFrom: messageData.msgFrom,
        }),
      );
    });

    it('should return 400 if message data is invalid (OpenAPI validation)', async () => {
      const response = await request(testApp)
        .post(`/api/jobfair/${mockJobFairId}/message`)
        // missing msgFrom and msgDateTime
        .send({ msg: 'Hello' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBeDefined();
    });

    it('should return 500 if recruiter tries to send message', async () => {
      addJobFairMessageSpy.mockResolvedValueOnce({
        error: 'Recruiters cannot send messages in job fairs hosted by other recruiters',
      });

      const response = await request(testApp)
        .post(`/api/jobfair/${mockJobFairId}/message`)
        .send(messageData);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Recruiters cannot send messages');
    });

    it('should return 403 if non-participant tries to send message', async () => {
      addJobFairMessageSpy.mockResolvedValueOnce({
        error: 'Only participants and hosts can send messages',
      });

      const response = await request(testApp)
        .post(`/api/jobfair/${mockJobFairId}/message`)
        .send(messageData);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 if job fair not found', async () => {
      addJobFairMessageSpy.mockResolvedValueOnce({ error: 'Job fair not found' });

      const response = await request(testApp)
        .post(`/api/jobfair/${mockJobFairId}/message`)
        .send(messageData);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 500 for other errors', async () => {
      addJobFairMessageSpy.mockResolvedValueOnce({ error: 'Database error' });

      const response = await request(testApp)
        .post(`/api/jobfair/${mockJobFairId}/message`)
        .send(messageData);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Database error');
    });
  });

  describe('POST /api/jobfair/:jobFairId/submission', () => {
    const submissionData = {
      submittedBy: 'user1',
      code: 'console.log("Hello World");',
      language: 'javascript',
      submittedAt: new Date('2025-06-01T12:00:00Z').toISOString(),
    };

    it('should submit coding challenge', async () => {
      const mockUser = { _id: new mongoose.Types.ObjectId(), userType: 'talent' };
      userModelFindOneSpy.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const updatedJobFair = { ...mockJobFair };
      addJobFairMessageSpy.mockResolvedValueOnce(updatedJobFair);

      const response = await request(testApp)
        .post(`/api/jobfair/${mockJobFairId}/submission`)
        .send(submissionData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('_id');
      expect(addJobFairMessageSpy).toHaveBeenCalledWith(
        mockJobFairId.toString(),
        expect.objectContaining({
          msgFrom: 'user1',
          msg: expect.stringContaining('__CODE_SUBMISSION__'),
        }),
      );
    });

    it('should return 400 if submittedBy is missing (OpenAPI validation)', async () => {
      const response = await request(testApp)
        .post(`/api/jobfair/${mockJobFairId}/submission`)
        .send({ code: 'test', language: 'javascript', submittedAt: new Date().toISOString() });

      expect(response.status).toBe(400);
      expect(response.body.message).toBeDefined();
    });

    it('should return 403 if user is a recruiter', async () => {
      const mockRecruiter = { _id: new mongoose.Types.ObjectId(), userType: 'recruiter' };
      userModelFindOneSpy.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockRecruiter),
      } as any);

      const response = await request(testApp)
        .post(`/api/jobfair/${mockJobFairId}/submission`)
        .send(submissionData);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Recruiters cannot submit code');
    });

    it('should return 403 if user is not a participant', async () => {
      const mockUser = { _id: new mongoose.Types.ObjectId(), userType: 'talent' };
      userModelFindOneSpy.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      } as any);
      addJobFairMessageSpy.mockResolvedValueOnce({
        error: 'Only participants and hosts can send messages',
      });

      const response = await request(testApp)
        .post(`/api/jobfair/${mockJobFairId}/submission`)
        .send(submissionData);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Only participants');
    });

    it('should return 404 if user not found', async () => {
      userModelFindOneSpy.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as any);

      const response = await request(testApp)
        .post(`/api/jobfair/${mockJobFairId}/submission`)
        .send(submissionData);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('User not found');
    });

    it('should return 404 if job fair not found', async () => {
      const mockUser = { _id: new mongoose.Types.ObjectId(), userType: 'talent' };
      userModelFindOneSpy.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      } as any);
      addJobFairMessageSpy.mockResolvedValueOnce({ error: 'Job fair not found' });

      const response = await request(testApp)
        .post(`/api/jobfair/${mockJobFairId}/submission`)
        .send(submissionData);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 500 for other errors', async () => {
      userModelFindOneSpy.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Database error')),
      } as any);

      const response = await request(testApp)
        .post(`/api/jobfair/${mockJobFairId}/submission`)
        .send(submissionData);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Database error');
    });
  });

  describe('DELETE /api/jobfair/:jobFairId', () => {
    const deleteData = { hostUsername: 'recruiter1' };

    it('should delete job fair', async () => {
      deleteJobFairSpy.mockResolvedValueOnce(mockJobFair);

      const response = await request(testApp)
        .delete(`/api/jobfair/${mockJobFairId}`)
        .send(deleteData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('_id');
      expect(deleteJobFairSpy).toHaveBeenCalledWith(mockJobFairId.toString(), 'recruiter1');
    });

    it('should return 400 if hostUsername is missing (OpenAPI validation)', async () => {
      const response = await request(testApp).delete(`/api/jobfair/${mockJobFairId}`).send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBeDefined();
    });

    it('should return 403 if user is not the host', async () => {
      deleteJobFairSpy.mockResolvedValueOnce({ error: 'Only the host can delete the job fair' });

      const response = await request(testApp)
        .delete(`/api/jobfair/${mockJobFairId}`)
        .send(deleteData);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 if job fair not found', async () => {
      deleteJobFairSpy.mockResolvedValueOnce({ error: 'Job fair not found' });

      const response = await request(testApp)
        .delete(`/api/jobfair/${mockJobFairId}`)
        .send(deleteData);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 500 for other errors', async () => {
      deleteJobFairSpy.mockResolvedValueOnce({ error: 'Database error' });

      const response = await request(testApp)
        .delete(`/api/jobfair/${mockJobFairId}`)
        .send(deleteData);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Database error');
    });
  });
});
