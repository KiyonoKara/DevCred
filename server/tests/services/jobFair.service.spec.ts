import mongoose from 'mongoose';
import JobFairModel from '../../models/jobFair.model';
import UserModel from '../../models/users.model';
import {
  createJobFair,
  getJobFairs,
  getJobFairById,
  updateJobFairStatus,
  joinJobFair,
  leaveJobFair,
  addJobFairMessage,
  updateJobFair,
  deleteJobFair,
} from '../../services/jobFair.service';
import { JobFair, DatabaseJobFair, Message } from '../../types/types';
import * as messageService from '../../services/message.service';

describe('Job Fair Service', () => {
  beforeEach(() => {
    // clean all mocks
    jest.clearAllMocks();
  });

  describe('createJobFair', () => {
    const mockJobFairPayload: JobFair = {
      title: 'Boston Career Forum 2025',
      description: 'Early career fair for new graduates!',
      hostUsername: 'recruiter1',
      visibility: 'public',
      status: 'upcoming',
      startTime: new Date('2025-06-01T10:00:00Z'),
      endTime: new Date('2025-06-01T18:00:00Z'),
      codingTournamentEnabled: true,
      overviewMessage: 'Welcome to the forum!',
      participants: [],
      invitedUsers: [],
      chatMessages: [],
      codingSubmissions: [],
      documents: [],
    };

    it('should successfully create a job fair', async () => {
      const mockCreatedJobFair: DatabaseJobFair = {
        _id: new mongoose.Types.ObjectId(),
        ...mockJobFairPayload,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(JobFairModel, 'create').mockResolvedValueOnce(mockCreatedJobFair as any);

      const result = await createJobFair(mockJobFairPayload);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result).toHaveProperty('_id');
        expect(result.title).toBe(mockJobFairPayload.title);
        expect(result.hostUsername).toBe(mockJobFairPayload.hostUsername);
        expect(result.visibility).toBe(mockJobFairPayload.visibility);
        expect(result.status).toBe(mockJobFairPayload.status);
      }
    });

    it('should return an error if job fair creation fails', async () => {
      jest.spyOn(JobFairModel, 'create').mockRejectedValueOnce(new Error('Database error'));

      const result = await createJobFair(mockJobFairPayload);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error creating job fair');
        expect(result.error).toContain('Database error');
      }
    });
  });

  describe('getJobFairs', () => {
    const mockJobFairs: DatabaseJobFair[] = [
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Public Fair',
        description: 'Open to all',
        hostUsername: 'recruiter1',
        visibility: 'public',
        status: 'upcoming',
        startTime: new Date('2025-06-01T10:00:00Z'),
        endTime: new Date('2025-06-01T18:00:00Z'),
        codingTournamentEnabled: true,
        participants: [],
        invitedUsers: [],
        chatMessages: [],
        codingSubmissions: [],
        documents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Private Fair',
        description: 'Invite only',
        hostUsername: 'recruiter2',
        visibility: 'invite-only',
        status: 'live',
        startTime: new Date('2025-05-01T10:00:00Z'),
        endTime: new Date('2025-05-01T18:00:00Z'),
        codingTournamentEnabled: false,
        participants: ['user1'],
        invitedUsers: ['user1', 'user2'],
        chatMessages: [],
        codingSubmissions: [],
        documents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should return all public job fairs when no username is provided', async () => {
      // public job fairs usually don't need auth
      jest.spyOn(JobFairModel, 'find').mockResolvedValueOnce(mockJobFairs as any);

      const result = await getJobFairs();

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result).toHaveLength(1);
        expect(result[0].visibility).toBe('public');
      }
    });

    it('should filter job fairs by status', async () => {
      // should be filterable by upcoming status at least
      jest.spyOn(JobFairModel, 'find').mockResolvedValueOnce([mockJobFairs[0]] as any);

      const result = await getJobFairs('upcoming');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result).toHaveLength(1);
        expect(result[0].status).toBe('upcoming');
      }
    });

    it('should filter job fairs by visibility', async () => {
      jest.spyOn(JobFairModel, 'find').mockResolvedValueOnce([mockJobFairs[0]] as any);

      const result = await getJobFairs(undefined, 'public');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result).toHaveLength(1);
        expect(result[0].visibility).toBe('public');
      }
    });

    it('should return job fairs accessible to a specific user', async () => {
      jest.spyOn(JobFairModel, 'find').mockResolvedValueOnce(mockJobFairs as any);

      const result = await getJobFairs(undefined, undefined, 'user1');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result).toHaveLength(2); // Public fair + invited private fair
      }
    });

    it('should return only public fairs for non-invited user', async () => {
      jest.spyOn(JobFairModel, 'find').mockResolvedValueOnce(mockJobFairs as any);

      const result = await getJobFairs(undefined, undefined, 'user3');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result).toHaveLength(1);
        expect(result[0].visibility).toBe('public');
      }
    });

    it('should return an error if retrieval fails', async () => {
      jest.spyOn(JobFairModel, 'find').mockRejectedValueOnce(new Error('Database error'));

      const result = await getJobFairs();

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error retrieving job fairs');
      }
    });
  });

  describe('getJobFairById', () => {
    const mockJobFair: DatabaseJobFair = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Test Fair',
      description: 'Test description',
      hostUsername: 'recruiter1',
      visibility: 'invite-only',
      status: 'upcoming',
      startTime: new Date('2025-06-01T10:00:00Z'),
      endTime: new Date('2025-06-01T18:00:00Z'),
      codingTournamentEnabled: true,
      participants: ['user1'],
      invitedUsers: ['user2'],
      chatMessages: [],
      codingSubmissions: [],
      documents: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return a job fair by ID for public fair', async () => {
      const publicJobFair = { ...mockJobFair, visibility: 'public' as const };
      jest.spyOn(JobFairModel, 'findById').mockReturnValue({
        populate: jest.fn().mockResolvedValueOnce(publicJobFair),
      } as any);

      const result = await getJobFairById(mockJobFair._id.toString());

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result._id).toEqual(publicJobFair._id);
        expect(result.title).toBe(publicJobFair.title);
      }
    });

    it('should return job fair for host', async () => {
      jest.spyOn(JobFairModel, 'findById').mockReturnValue({
        populate: jest.fn().mockResolvedValueOnce(mockJobFair),
      } as any);

      const result = await getJobFairById(mockJobFair._id.toString(), 'recruiter1');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result._id).toEqual(mockJobFair._id);
      }
    });

    it('should return job fair for invited user', async () => {
      jest.spyOn(JobFairModel, 'findById').mockReturnValue({
        populate: jest.fn().mockResolvedValueOnce(mockJobFair),
      } as any);

      const result = await getJobFairById(mockJobFair._id.toString(), 'user2');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result._id).toEqual(mockJobFair._id);
      }
    });

    it('should return job fair for participant', async () => {
      // job fair should be seen by participant
      jest.spyOn(JobFairModel, 'findById').mockReturnValue({
        populate: jest.fn().mockResolvedValueOnce(mockJobFair),
      } as any);

      const result = await getJobFairById(mockJobFair._id.toString(), 'user1');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result._id).toEqual(mockJobFair._id);
      }
    });

    it('should return access denied for non-invited user on private fair', async () => {
      jest.spyOn(JobFairModel, 'findById').mockReturnValue({
        populate: jest.fn().mockResolvedValueOnce(mockJobFair),
      } as any);

      const result = await getJobFairById(mockJobFair._id.toString(), 'user3');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Access denied');
      }
    });

    it('should return access denied for private fair without username', async () => {
      jest.spyOn(JobFairModel, 'findById').mockReturnValue({
        populate: jest.fn().mockResolvedValueOnce(mockJobFair),
      } as any);

      const result = await getJobFairById(mockJobFair._id.toString());

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Access denied');
      }
    });

    it('should return error if job fair not found', async () => {
      jest.spyOn(JobFairModel, 'findById').mockReturnValue({
        populate: jest.fn().mockResolvedValueOnce(null),
      } as any);

      const result = await getJobFairById(new mongoose.Types.ObjectId().toString());

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Job fair not found');
      }
    });

    it('should return an error if retrieval fails', async () => {
      jest.spyOn(JobFairModel, 'findById').mockReturnValue({
        populate: jest.fn().mockRejectedValueOnce(new Error('Database error')),
      } as any);

      const result = await getJobFairById(mockJobFair._id.toString());

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error retrieving job fair');
      }
    });
  });

  describe('updateJobFairStatus', () => {
    const mockJobFair = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Test Fair',
      hostUsername: 'recruiter1',
      status: 'upcoming' as const,
      save: jest.fn().mockResolvedValue(true),
    };

    it('should update job fair status successfully', async () => {
      // recruiter should be able to update the status due to their user type
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(mockJobFair as any);

      const result = await updateJobFairStatus(mockJobFair._id.toString(), 'recruiter1', 'live');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(mockJobFair.status).toBe('live');
        expect(mockJobFair.save).toHaveBeenCalled();
      }
    });

    it('should return error if job fair not found', async () => {
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(null);

      const result = await updateJobFairStatus(
        new mongoose.Types.ObjectId().toString(),
        'recruiter1',
        'live',
      );

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Job fair not found');
      }
    });

    it('should return error if user is not the host', async () => {
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(mockJobFair as any);

      const result = await updateJobFairStatus(mockJobFair._id.toString(), 'wrongUser', 'live');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Only the host can update job fair status');
      }
    });

    it('should return an error if update fails', async () => {
      const failingMockJobFair = {
        ...mockJobFair,
        save: jest.fn().mockRejectedValueOnce(new Error('Save failed')),
      };
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(failingMockJobFair as any);

      const result = await updateJobFairStatus(mockJobFair._id.toString(), 'recruiter1', 'live');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error updating job fair status');
      }
    });
  });

  describe('joinJobFair', () => {
    const mockJobFair = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Test Fair',
      visibility: 'public' as const,
      hostUsername: 'recruiter1',
      participants: [] as string[],
      invitedUsers: [] as string[],
      save: jest.fn().mockResolvedValue(true),
    };

    it('should add participant to public job fair', async () => {
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(mockJobFair as any);

      const result = await joinJobFair(mockJobFair._id.toString(), 'user1');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(mockJobFair.participants).toContain('user1');
        expect(mockJobFair.save).toHaveBeenCalled();
      }
    });

    it('should add invited user to invite-only job fair', async () => {
      const inviteOnlyJobFair = {
        ...mockJobFair,
        visibility: 'invite-only' as const,
        invitedUsers: ['user1'],
        participants: [] as string[],
      };
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(inviteOnlyJobFair as any);

      const result = await joinJobFair(mockJobFair._id.toString(), 'user1');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(inviteOnlyJobFair.participants).toContain('user1');
      }
    });

    it('should allow host to join', async () => {
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(mockJobFair as any);

      const result = await joinJobFair(mockJobFair._id.toString(), 'recruiter1');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(mockJobFair.participants).toContain('recruiter1');
      }
    });

    it('should return error if job fair not found', async () => {
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(null);

      const result = await joinJobFair(new mongoose.Types.ObjectId().toString(), 'user1');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Job fair not found');
      }
    });

    it('should return error if access denied to invite-only fair', async () => {
      const inviteOnlyJobFair = {
        ...mockJobFair,
        visibility: 'invite-only' as const,
        invitedUsers: [] as string[],
      };
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(inviteOnlyJobFair as any);

      const result = await joinJobFair(mockJobFair._id.toString(), 'user1');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Access denied');
      }
    });

    it('should return error if user is already a participant', async () => {
      const jobFairWithParticipant = {
        ...mockJobFair,
        participants: ['user1'],
      };
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(jobFairWithParticipant as any);

      const result = await joinJobFair(mockJobFair._id.toString(), 'user1');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('already a participant');
      }
    });

    it('should return an error if join fails', async () => {
      const failingJobFair = {
        ...mockJobFair,
        participants: [] as string[],
        save: jest.fn().mockRejectedValueOnce(new Error('Save failed')),
      };
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(failingJobFair as any);

      const result = await joinJobFair(mockJobFair._id.toString(), 'user2');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error joining job fair');
      }
    });
  });

  describe('leaveJobFair', () => {
    const mockJobFair = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Test Fair',
      participants: ['user1', 'user2'],
      save: jest.fn().mockResolvedValue(true),
    };

    it('should remove participant from job fair', async () => {
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(mockJobFair as any);

      const result = await leaveJobFair(mockJobFair._id.toString(), 'user1');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(mockJobFair.participants).not.toContain('user1');
        expect(mockJobFair.participants).toContain('user2');
        expect(mockJobFair.save).toHaveBeenCalled();
      }
    });

    it('should return error if job fair not found', async () => {
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(null);

      const result = await leaveJobFair(new mongoose.Types.ObjectId().toString(), 'user1');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Job fair not found');
      }
    });

    it('should return error if user is not a participant', async () => {
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(mockJobFair as any);

      const result = await leaveJobFair(mockJobFair._id.toString(), 'user3');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('not a participant');
      }
    });

    it('should return an error if leave fails', async () => {
      const failingJobFair = {
        _id: mockJobFair._id,
        title: 'Test Fair',
        participants: ['user1', 'user2'],
        indexOf: jest.fn().mockReturnValue(0),
        splice: jest.fn(),
        save: jest.fn().mockRejectedValueOnce(new Error('Save failed')),
      };
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(failingJobFair as any);

      const result = await leaveJobFair(mockJobFair._id.toString(), 'user1');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error leaving job fair');
      }
    });
  });

  describe('addJobFairMessage', () => {
    const mockJobFair = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Test Fair',
      hostUsername: 'recruiter1',
      participants: ['user1', 'user2'],
      chatMessages: [] as mongoose.Types.ObjectId[],
      save: jest.fn().mockResolvedValue(true),
    };

    const mockMessage: Omit<Message, 'type'> = {
      msg: 'Hello everyone!',
      msgFrom: 'user1',
      msgDateTime: new Date('2025-06-01T12:00:00Z'),
    };

    const mockSavedMessage = {
      _id: new mongoose.Types.ObjectId(),
      ...mockMessage,
      type: 'direct',
    };

    it('should allow participant to send message', async () => {
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(mockJobFair as any);
      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValueOnce({ username: 'user1', userType: 'talent' }),
      } as any);
      jest.spyOn(messageService, 'saveMessage').mockResolvedValueOnce(mockSavedMessage as any);

      const result = await addJobFairMessage(mockJobFair._id.toString(), mockMessage);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(mockJobFair.chatMessages).toContain(mockSavedMessage._id);
        expect(mockJobFair.save).toHaveBeenCalled();
      }
    });

    it('should allow host to send message', async () => {
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(mockJobFair as any);
      jest.spyOn(messageService, 'saveMessage').mockResolvedValueOnce(mockSavedMessage as any);

      const hostMessage = { ...mockMessage, msgFrom: 'recruiter1' };
      const result = await addJobFairMessage(mockJobFair._id.toString(), hostMessage);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(mockJobFair.chatMessages).toContain(mockSavedMessage._id);
      }
    });

    it('should return error if job fair not found', async () => {
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(null);

      const result = await addJobFairMessage(new mongoose.Types.ObjectId().toString(), mockMessage);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Job fair not found');
      }
    });

    it('should return error if non-participant tries to send message', async () => {
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(mockJobFair as any);

      const nonParticipantMessage = { ...mockMessage, msgFrom: 'user3' };
      const result = await addJobFairMessage(mockJobFair._id.toString(), nonParticipantMessage);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Only participants and hosts can send messages');
      }
    });

    it('should return error if non-host recruiter tries to send message', async () => {
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(mockJobFair as any);
      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValueOnce({ username: 'user1', userType: 'recruiter' }),
      } as any);

      const result = await addJobFairMessage(mockJobFair._id.toString(), mockMessage);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Recruiters cannot send messages');
      }
    });

    it('should return error if message save fails', async () => {
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(mockJobFair as any);
      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValueOnce({ username: 'user1', userType: 'talent' }),
      } as any);
      jest
        .spyOn(messageService, 'saveMessage')
        .mockResolvedValueOnce({ error: 'Failed to save message' });

      const result = await addJobFairMessage(mockJobFair._id.toString(), mockMessage);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Failed to save message');
      }
    });

    it('should return an error if adding message fails', async () => {
      const failingJobFair = {
        ...mockJobFair,
        chatMessages: [...mockJobFair.chatMessages],
        save: jest.fn().mockRejectedValueOnce(new Error('Save failed')),
      };
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(failingJobFair as any);
      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValueOnce({ username: 'user1', userType: 'talent' }),
      } as any);
      jest.spyOn(messageService, 'saveMessage').mockResolvedValueOnce(mockSavedMessage as any);

      const result = await addJobFairMessage(mockJobFair._id.toString(), mockMessage);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error adding job fair message');
      }
    });
  });

  describe('updateJobFair', () => {
    const mockJobFair = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Original Title',
      description: 'Original Description',
      hostUsername: 'recruiter1',
      visibility: 'public' as const,
      startTime: new Date('2025-06-01T10:00:00Z'),
      endTime: new Date('2025-06-01T18:00:00Z'),
      codingTournamentEnabled: true,
      overviewMessage: 'Welcome!',
      invitedUsers: [] as string[],
      save: jest.fn().mockResolvedValue(true),
    };

    it('should update job fair title', async () => {
      const testJobFair = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Original Title',
        hostUsername: 'recruiter1',
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(testJobFair as any);

      const result = await updateJobFair(testJobFair._id.toString(), 'recruiter1', {
        title: 'New Title',
      });

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(testJobFair.title).toBe('New Title');
        expect(testJobFair.save).toHaveBeenCalled();
      }
    });

    it('should update multiple fields', async () => {
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(mockJobFair as any);

      const updateData = {
        title: 'Updated Title',
        description: 'Updated Description',
        visibility: 'invite-only' as const,
        codingTournamentEnabled: false,
      };

      const result = await updateJobFair(mockJobFair._id.toString(), 'recruiter1', updateData);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(mockJobFair.title).toBe('Updated Title');
        expect(mockJobFair.description).toBe('Updated Description');
        expect(mockJobFair.visibility).toBe('invite-only');
        expect(mockJobFair.codingTournamentEnabled).toBe(false);
      }
    });

    it('should update invited users', async () => {
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(mockJobFair as any);

      const result = await updateJobFair(mockJobFair._id.toString(), 'recruiter1', {
        invitedUsers: ['user1', 'user2'],
      });

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(mockJobFair.invitedUsers).toEqual(['user1', 'user2']);
      }
    });

    it('should return error if job fair not found', async () => {
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(null);

      const result = await updateJobFair(new mongoose.Types.ObjectId().toString(), 'recruiter1', {
        title: 'New Title',
      });

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Job fair not found');
      }
    });

    it('should return error if user is not the host', async () => {
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(mockJobFair as any);

      const result = await updateJobFair(mockJobFair._id.toString(), 'wrongUser', {
        title: 'New Title',
      });

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Only the host can update');
      }
    });

    it('should return an error if update fails', async () => {
      const failingJobFair = {
        ...mockJobFair,
        save: jest.fn().mockRejectedValueOnce(new Error('Save failed')),
      };
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(failingJobFair as any);

      const result = await updateJobFair(mockJobFair._id.toString(), 'recruiter1', {
        title: 'New Title',
      });

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error updating job fair');
      }
    });
  });

  describe('deleteJobFair', () => {
    const mockJobFair = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Test Fair',
      hostUsername: 'recruiter1',
    };

    it('should delete job fair successfully', async () => {
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(mockJobFair as any);
      jest.spyOn(JobFairModel, 'findByIdAndDelete').mockResolvedValueOnce(mockJobFair as any);

      const result = await deleteJobFair(mockJobFair._id.toString(), 'recruiter1');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result).toHaveProperty('_id');
        expect(result).toHaveProperty('title', 'Test Fair');
      }
    });

    it('should return error if job fair not found', async () => {
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(null);

      const result = await deleteJobFair(new mongoose.Types.ObjectId().toString(), 'recruiter1');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Job fair not found');
      }
    });

    it('should return error if user is not the host', async () => {
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(mockJobFair as any);

      const result = await deleteJobFair(mockJobFair._id.toString(), 'wrongUser');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Only the host can delete');
      }
    });

    it('should return an error if deletion fails', async () => {
      jest.spyOn(JobFairModel, 'findById').mockResolvedValueOnce(mockJobFair as any);
      jest
        .spyOn(JobFairModel, 'findByIdAndDelete')
        .mockRejectedValueOnce(new Error('Delete failed'));

      const result = await deleteJobFair(mockJobFair._id.toString(), 'recruiter1');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error deleting job fair');
      }
    });
  });
});
