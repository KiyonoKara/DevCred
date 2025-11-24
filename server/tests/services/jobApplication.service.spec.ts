import { UserResponse } from '@fake-stack-overflow/shared';
import JobApplicationModel from '../../models/jobApplication.model';
import JobPostingModel from '../../models/jobPosting.model';
import ResumeModel from '../../models/resume.model';
import UserModel from '../../models/users.model';
import * as ChatService from '../../services/chat.service';
import {
  createApplication,
  deleteApplication,
  getAllApplications,
  getApplicationByJobId,
  hasUserApplied,
} from '../../services/jobApplication.service';
import * as MessageService from '../../services/message.service';
import * as UserService from '../../services/user.service';

describe('Job Application Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  const jobId = 'job123';
  const username = 'talentUser123';
  const recruiterUsername = 'recruiter123';

  const mockTalentUser = {
    _id: 'user1',
    username,
    userType: 'talent',
  };

  const mockRecruiterUser = {
    _id: 'user2',
    username: recruiterUsername,
    userType: 'recruiter',
  };

  const mockJob = {
    _id: jobId,
    company: 'Tech Corp',
    recruiter: recruiterUsername,
    title: 'Software Engineer',
    description: 'Build scalable applications',
    location: 'Remote',
  } as any;

  const mockResume = {
    _id: 'resume123',
    userId: username,
    isActive: true,
    isDMFile: false,
    fileName: 'resume.pdf',
  } as any;

  const mockApplication = {
    _id: 'app123',
    jobPosting: mockJob,
    user: username,
    jobStatus: 'Submitted',
    applicationDate: new Date(),
  } as any;

  const mockIntroMessage = {
    _id: 'msg1',
    msg: 'intro message',
    msgFrom: username,
    msgDateTime: new Date(),
    type: 'application',
  } as any;

  const mockResumeMessage = {
    _id: 'msg2',
    msg: 'resume message',
    msgFrom: username,
    msgDateTime: new Date(),
    type: 'resume',
  } as any;

  const mockSoloChat = {
    _id: 'chat123',
    participants: [recruiterUsername, username],
    messages: [],
  } as any;

  describe('hasUserApplied', () => {
    it('should return true when an application exists for the user and job', async () => {
      jest
        .spyOn(JobApplicationModel, 'findOne')
        .mockResolvedValue(
          mockApplication as unknown as ReturnType<typeof JobApplicationModel.findOne>,
        );

      const result = await hasUserApplied(jobId, username);

      expect(result).toBe(true);
    });

    it('should return false when no application exists for the user and job', async () => {
      jest
        .spyOn(JobApplicationModel, 'findOne')
        .mockResolvedValue(null as unknown as ReturnType<typeof JobApplicationModel.findOne>);

      const result = await hasUserApplied(jobId, username);

      expect(result).toBe(false);
    });

    it('should return error when a database error occurs', async () => {
      jest.spyOn(JobApplicationModel, 'findOne').mockRejectedValue(new Error('DB error'));

      const result = await hasUserApplied(jobId, username);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Error checking application status' });
    });
  });

  describe('createApplication', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.restoreAllMocks();
    });
    it('should return error when user is not found', async () => {
      jest
        .spyOn(UserModel, 'findOne')
        .mockReturnValue({ select: jest.fn().mockResolvedValue(null) } as unknown as ReturnType<
          typeof UserModel.findOne
        >);

      const result = await createApplication(jobId, username);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'User not found' });
    });

    it('should return error when user is a recruiter', async () => {
      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockRecruiterUser),
      } as unknown as ReturnType<typeof UserModel.findOne>);

      const result = await createApplication(jobId, recruiterUsername);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Recruiters cannot apply to jobs' });
    });

    it('should return error when job is not found', async () => {
      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockTalentUser),
      } as unknown as ReturnType<typeof UserModel.findOne>);
      jest.spyOn(JobPostingModel, 'findById').mockResolvedValue(null);

      const result = await createApplication(jobId, username);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Job not found' });
    });

    it('should return error when active resume does not exist', async () => {
      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockTalentUser),
      } as unknown as ReturnType<typeof UserModel.findOne>);
      jest.spyOn(JobPostingModel, 'findById').mockResolvedValue(mockJob);
      jest.spyOn(ResumeModel, 'findOne').mockResolvedValue(null);

      const result = await createApplication(jobId, username);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Cannot apply for job without active resume on profile!' });
    });

    it('should return generic error when introduction message creation fails', async () => {
      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockTalentUser),
      } as unknown as ReturnType<typeof UserModel.findOne>);
      jest.spyOn(JobPostingModel, 'findById').mockResolvedValue(mockJob);
      jest.spyOn(ResumeModel, 'findOne').mockResolvedValue(mockResume);
      jest.spyOn(JobApplicationModel, 'create').mockResolvedValue(mockApplication);

      jest
        .spyOn(MessageService, 'saveMessage')
        .mockResolvedValueOnce({ error: 'intro failed' })
        .mockResolvedValueOnce({ error: 'intro failed' });

      const result = await createApplication(jobId, username);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Error when applying to a job' });
    });

    it('should return generic error when resume message creation fails', async () => {
      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockTalentUser),
      } as unknown as ReturnType<typeof UserModel.findOne>);
      jest.spyOn(JobPostingModel, 'findById').mockResolvedValue(mockJob);
      jest.spyOn(ResumeModel, 'findOne').mockResolvedValue(mockResume);
      jest.spyOn(JobApplicationModel, 'create').mockResolvedValue(mockApplication);

      jest
        .spyOn(MessageService, 'saveMessage')
        .mockResolvedValueOnce(mockIntroMessage)
        .mockResolvedValueOnce({ error: 'resume failed' });

      const result = await createApplication(jobId, username);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Error when applying to a job' });
    });

    it('should return generic error when chats cannot be fetched', async () => {
      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockTalentUser),
      } as unknown as ReturnType<typeof UserModel.findOne>);
      jest.spyOn(JobPostingModel, 'findById').mockResolvedValue(mockJob);
      jest.spyOn(ResumeModel, 'findOne').mockResolvedValue(mockResume);
      jest.spyOn(JobApplicationModel, 'create').mockResolvedValue(mockApplication);

      jest
        .spyOn(MessageService, 'saveMessage')
        .mockResolvedValueOnce(mockIntroMessage)
        .mockResolvedValueOnce(mockResumeMessage);

      jest.spyOn(ChatService, 'getChatsByParticipants').mockResolvedValue(null as unknown as any);

      const result = await createApplication(jobId, username);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Error when applying to a job' });
    });

    it('should return generic error when saveChat returns an error object', async () => {
      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockTalentUser),
      } as unknown as ReturnType<typeof UserModel.findOne>);
      jest.spyOn(JobPostingModel, 'findById').mockResolvedValue(mockJob);
      jest.spyOn(ResumeModel, 'findOne').mockResolvedValue(mockResume);
      jest.spyOn(JobApplicationModel, 'create').mockResolvedValue(mockApplication);

      jest
        .spyOn(MessageService, 'saveMessage')
        .mockResolvedValueOnce(mockIntroMessage)
        .mockResolvedValueOnce(mockResumeMessage);

      const groupChat = { _id: 'group', participants: [recruiterUsername, username, 'other'] };
      jest.spyOn(ChatService, 'getChatsByParticipants').mockResolvedValue([groupChat] as any);

      jest.spyOn(ChatService, 'saveChat').mockResolvedValue({ error: 'chat error' } as any);

      const result = await createApplication(jobId, username);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Error when applying to a job' });
    });

    it('should return generic error when incrementing user points fails', async () => {
      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockTalentUser),
      } as unknown as ReturnType<typeof UserModel.findOne>);
      jest.spyOn(JobPostingModel, 'findById').mockResolvedValue(mockJob);
      jest.spyOn(ResumeModel, 'findOne').mockResolvedValue(mockResume);
      jest.spyOn(JobApplicationModel, 'create').mockResolvedValue(mockApplication);

      jest
        .spyOn(MessageService, 'saveMessage')
        .mockResolvedValueOnce(mockIntroMessage)
        .mockResolvedValueOnce(mockResumeMessage);

      jest.spyOn(ChatService, 'getChatsByParticipants').mockResolvedValue([mockSoloChat] as any);
      jest.spyOn(ChatService, 'addMessageToChat').mockResolvedValue({} as any);

      jest
        .spyOn(UserService, 'incrementUserPoint')
        .mockResolvedValue({ error: 'points error' } as unknown as UserResponse);

      const result = await createApplication(jobId, username);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Error when applying to a job' });
    });

    it('should successfully create an application using existing solo chat', async () => {
      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockTalentUser),
      } as unknown as ReturnType<typeof UserModel.findOne>);
      jest.spyOn(JobPostingModel, 'findById').mockResolvedValue(mockJob);
      jest.spyOn(ResumeModel, 'findOne').mockResolvedValue(mockResume);
      jest.spyOn(JobApplicationModel, 'create').mockResolvedValue(mockApplication);

      jest
        .spyOn(MessageService, 'saveMessage')
        .mockResolvedValueOnce(mockIntroMessage)
        .mockResolvedValueOnce(mockResumeMessage);

      jest.spyOn(ChatService, 'getChatsByParticipants').mockResolvedValue([mockSoloChat] as any);

      jest.spyOn(ChatService, 'addMessageToChat').mockResolvedValue({} as any);

      jest
        .spyOn(UserService, 'incrementUserPoint')
        .mockResolvedValue({ success: true } as unknown as UserResponse);

      const result = await createApplication(jobId, username);

      expect(result).toEqual(mockApplication);
    });

    it('should successfully create an application by creating a new chat when none exists with 2 participants', async () => {
      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockTalentUser),
      } as unknown as ReturnType<typeof UserModel.findOne>);
      jest.spyOn(JobPostingModel, 'findById').mockResolvedValue(mockJob);
      jest.spyOn(ResumeModel, 'findOne').mockResolvedValue(mockResume);
      jest.spyOn(JobApplicationModel, 'create').mockResolvedValue(mockApplication);

      jest
        .spyOn(MessageService, 'saveMessage')
        .mockResolvedValueOnce(mockIntroMessage)
        .mockResolvedValueOnce(mockResumeMessage);

      const groupChat = { _id: 'group', participants: [recruiterUsername, username, 'otherUser'] };
      jest.spyOn(ChatService, 'getChatsByParticipants').mockResolvedValue([groupChat] as any);

      jest.spyOn(ChatService, 'saveChat').mockResolvedValue({
        _id: 'newChat',
        participants: [recruiterUsername, username],
        messages: [mockIntroMessage, mockResumeMessage],
      } as any);

      jest
        .spyOn(UserService, 'incrementUserPoint')
        .mockResolvedValue({ success: true } as unknown as UserResponse);

      const result = await createApplication(jobId, username);

      expect(result).toEqual(mockApplication);
    });
  });

  describe('deleteApplication', () => {
    it('should return error when application is not found', async () => {
      jest
        .spyOn(JobApplicationModel, 'findById')
        .mockReturnValue({ populate: jest.fn().mockResolvedValue(null) } as any);

      const result = await deleteApplication('fake_id', username);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Application not found' });
    });

    it('should return error when username matches neither applicant nor recruiter', async () => {
      const populate = jest.fn().mockResolvedValue(mockApplication);

      jest.spyOn(JobApplicationModel, 'findById').mockReturnValue({ populate } as any);

      const result = await deleteApplication(mockApplication._id, 'unauthorizedUser');

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Not authorized to withdraw application' });
    });

    it('should allow deletion when username matches applicant', async () => {
      const populate = jest.fn().mockResolvedValue(mockApplication);

      jest.spyOn(JobApplicationModel, 'findById').mockReturnValue({ populate } as any);

      jest
        .spyOn(JobApplicationModel, 'findByIdAndDelete')
        .mockResolvedValue(mockApplication as any);

      const result = await deleteApplication(mockApplication._id, mockApplication.user);

      expect(result).toEqual(mockApplication);
    });

    it('should allow deletion when username matches recruiter', async () => {
      const populate = jest.fn().mockResolvedValue(mockApplication);

      jest.spyOn(JobApplicationModel, 'findById').mockReturnValue({ populate } as any);

      jest
        .spyOn(JobApplicationModel, 'findByIdAndDelete')
        .mockResolvedValue(mockApplication as any);

      const result = await deleteApplication(
        mockApplication._id,
        mockApplication.jobPosting.recruiter,
      );

      expect(result).toEqual(mockApplication);
    });

    it('should return error when deletion result is null (already deleted)', async () => {
      const populate = jest.fn().mockResolvedValue(mockApplication);

      jest.spyOn(JobApplicationModel, 'findById').mockReturnValue({ populate } as any);

      jest.spyOn(JobApplicationModel, 'findByIdAndDelete').mockResolvedValue(null as any);

      const result = await deleteApplication(mockApplication._id, mockApplication.user);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Application not found or already deleted' });
    });

    it('should return error when an exception is thrown', async () => {
      const populate = jest.fn().mockRejectedValue(new Error('DB error'));

      jest.spyOn(JobApplicationModel, 'findById').mockReturnValue({ populate } as any);

      const result = await deleteApplication(mockApplication._id, username);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Application not found or already deleted' });
    });
  });

  describe('getAllApplications', () => {
    it('should return error when user is not found', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValue(null as any);

      const result = await getAllApplications(username);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'User not found' });
    });

    it('should return error when user type is not talent', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValue(mockRecruiterUser as any);

      const result = await getAllApplications(mockRecruiterUser.username);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'User type not authorized' });
    });

    it('should return applications when user is talent', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValue(mockTalentUser as any);

      jest
        .spyOn(JobApplicationModel, 'find')
        .mockReturnValue({ populate: jest.fn().mockResolvedValue([mockApplication]) } as any);

      const result = await getAllApplications(mockTalentUser.username);

      expect(result).toEqual([mockApplication]);
    });

    it('should return error when an exception occurs', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValue(mockTalentUser as any);

      jest.spyOn(JobApplicationModel, 'find').mockImplementation(() => {
        throw new Error('DB error');
      });

      const result = await getAllApplications(mockTalentUser.username);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Applications could not be fetched for user' });
    });
  });

  describe('getApplicationByJobId', () => {
    it('should return error when user is not found', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValue(null as any);

      const result = await getApplicationByJobId(username, jobId);

      expect(result).toEqual({ error: 'User not found' });
    });

    it('should return error when user type is not recruiter', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValue(mockTalentUser as any);

      const result = await getApplicationByJobId(mockTalentUser.username, jobId);

      expect(result).toEqual({ error: 'User type not authorized' });
    });

    it('should return error when job is not found', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValue(mockRecruiterUser as any);

      jest.spyOn(JobPostingModel, 'findById').mockResolvedValue(null as any);

      const result = await getApplicationByJobId(mockRecruiterUser.username, jobId);

      expect(result).toEqual({ error: 'Job not found' });
    });

    it('should return error when recruiter does not match job.recruiter', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValue(mockRecruiterUser as any);

      jest.spyOn(JobPostingModel, 'findById').mockResolvedValue({
        ...mockJob,
        recruiter: 'differentRecruiter',
      } as any);

      const result = await getApplicationByJobId(mockRecruiterUser.username, jobId);

      expect(result).toEqual({ error: 'User not authorized to view job applications' });
    });

    it('should return applications when user is recruiter and job belongs to them', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValue(mockRecruiterUser as any);

      jest.spyOn(JobPostingModel, 'findById').mockResolvedValue({
        ...mockJob,
        recruiter: mockRecruiterUser.username,
      } as any);

      const populate = jest.fn().mockResolvedValue([mockApplication]);

      jest.spyOn(JobApplicationModel, 'find').mockReturnValue({ populate } as any);

      const result = await getApplicationByJobId(mockRecruiterUser.username, jobId);

      expect(JobApplicationModel.find).toHaveBeenCalledWith({ jobPosting: jobId });
      expect(result).toEqual([mockApplication]);
    });

    it('should return error when an exception occurs', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValue(mockRecruiterUser as any);

      jest.spyOn(JobPostingModel, 'findById').mockImplementation(() => {
        throw new Error('DB error');
      });

      const result = await getApplicationByJobId(mockRecruiterUser.username, jobId);

      expect(result).toEqual({ error: 'Applications could not be fetched for job' });
    });
  });
});
