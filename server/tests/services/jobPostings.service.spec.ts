import { DatabaseJobPosting, DatabaseTag, JobPosting } from '@fake-stack-overflow/shared';
import JobPostingModel from '../../models/jobPosting.model';
import UserModel from '../../models/users.model';
import * as JobPostingService from '../../services/jobPosting.service';
import {
  checkKeywordInJobPosting,
  checkTagInJobPosting,
  createJobPosting,
  deleteJobPosting,
  filterJobPostingsBySearch,
  getJobPostingById,
  getJobPostingByRecruiter,
  getJobPostings,
  toggleJobPostingActive,
} from '../../services/jobPosting.service';
import * as ParseUtil from '../../utils/parse.util';

describe('Job Posting Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createJobPosting', () => {
    const mockJob: JobPosting = {
      company: 'Tech Corp',
      recruiter: 'recruiter123',
      title: 'Software Engineer',
      description: 'Build scalable applications',
      location: 'Remote',
      tags: [],
      active: true,
      payRange: '100k-140k',
      jobType: 'full-time',
      deadline: new Date('2030-01-01'),
    };

    it('should create and return a new job posting', async () => {
      const mockCreatedPosting = { _id: 'abc123', ...mockJob };

      jest
        .spyOn(JobPostingModel, 'create')
        .mockResolvedValue(
          mockCreatedPosting as unknown as ReturnType<typeof JobPostingModel.create>,
        );

      const result = await createJobPosting(mockJob);

      expect(JobPostingModel.create).toHaveBeenCalledWith(mockJob);
      expect(result).toEqual(mockCreatedPosting);
    });

    it('should return an error object when creation fails', async () => {
      jest.spyOn(JobPostingModel, 'create').mockRejectedValue(new Error('DB error'));

      const result = await createJobPosting(mockJob);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Error creating job posting' });
    });
  });

  describe('deleteJobPosting', () => {
    const mockJobId = 'job123';
    const mockUsername = 'recruiter123';

    const mockJob = {
      _id: mockJobId,
      company: 'Tech Corp',
      recruiter: mockUsername,
      title: 'Software Engineer',
      description: 'Build scalable applications',
      location: 'Remote',
      tags: [],
      active: true,
      payRange: '100k-140k',
      jobType: 'full-time',
      deadline: new Date('2030-01-01'),
    };

    it('should delete and return the job posting when it exists for the recruiter', async () => {
      jest
        .spyOn(JobPostingModel, 'findOne')
        .mockResolvedValue(mockJob as unknown as ReturnType<typeof JobPostingModel.findOne>);

      jest
        .spyOn(JobPostingModel, 'findByIdAndDelete')
        .mockResolvedValue(
          mockJob as unknown as ReturnType<typeof JobPostingModel.findByIdAndDelete>,
        );

      const result = await deleteJobPosting(mockJobId, mockUsername);

      expect(result).toEqual(mockJob);
    });

    it('should return an error when job is not found for the recruiter', async () => {
      jest.spyOn(JobPostingModel, 'findOne').mockResolvedValue(null);

      const result = await deleteJobPosting('Fake Id', 'Fake Username');

      expect(JobPostingModel.findByIdAndDelete).not.toHaveBeenCalled();
      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Job not found' });
    });

    it('should return an error when the job posting is not found or already deleted', async () => {
      jest
        .spyOn(JobPostingModel, 'findOne')
        .mockResolvedValue(mockJob as unknown as ReturnType<typeof JobPostingModel.findOne>);

      jest.spyOn(JobPostingModel, 'findByIdAndDelete').mockResolvedValue(null);

      const result = await deleteJobPosting(mockJobId, mockUsername);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({
        error: 'Job Posting not found or already deleted',
      });
    });

    it('should return an error object when deletion throws', async () => {
      jest
        .spyOn(JobPostingModel, 'findOne')
        .mockResolvedValue(mockJob as unknown as ReturnType<typeof JobPostingModel.findOne>);

      jest.spyOn(JobPostingModel, 'findByIdAndDelete').mockRejectedValue(new Error('DB error'));

      const result = await deleteJobPosting(mockJobId, mockUsername);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({
        error: 'Error deleting job posting',
      });
    });
  });

  describe('toggleJobPostingActive', () => {
    const mockJobId = 'job123';
    const mockUsername = 'recruiter123';

    const baseJob = {
      _id: mockJobId,
      company: 'Tech Corp',
      recruiter: mockUsername,
      title: 'Software Engineer',
      description: 'Build scalable applications',
      location: 'Remote',
      tags: [],
      active: true,
      payRange: '100k-140k',
      jobType: 'full-time',
      deadline: null,
      save: jest.fn().mockResolvedValue({}),
    };

    it('should return an error when job is not found initially', async () => {
      jest.spyOn(JobPostingModel, 'findOne').mockResolvedValue(null);

      const result = await toggleJobPostingActive('fake_id', mockUsername);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Job not found' });
    });

    it('should toggle the active flag when job is not past deadline', async () => {
      const mockJobActive = { ...baseJob, active: true, deadline: null };
      const mockJobInactive = { ...baseJob, active: false, deadline: null };

      const findOneMock = jest
        .spyOn(JobPostingModel, 'findOne')
        .mockResolvedValueOnce(
          mockJobActive as unknown as ReturnType<typeof JobPostingModel.findOne>,
        );

      findOneMock.mockResolvedValueOnce(
        mockJobInactive as unknown as ReturnType<typeof JobPostingModel.findOne>,
      );

      const result = await toggleJobPostingActive(mockJobId, mockUsername);

      expect(mockJobActive.save).toHaveBeenCalled();
      expect(result).toEqual(mockJobInactive);
    });

    it('should reactivate job and clear deadline when past the deadline', async () => {
      const mockInactiveJob = {
        ...baseJob,
        active: false,
        deadline: new Date('2000-01-01'),
      };

      const mockActiveJob = {
        ...baseJob,
        active: true,
        deadline: null,
      };

      jest
        .spyOn(JobPostingModel, 'findOne')
        .mockResolvedValueOnce(
          mockInactiveJob as unknown as ReturnType<typeof JobPostingModel.findOne>,
        )
        .mockResolvedValueOnce(
          mockActiveJob as unknown as ReturnType<typeof JobPostingModel.findOne>,
        );

      const result = await toggleJobPostingActive(mockJobId, mockUsername);

      expect(mockInactiveJob.save).toHaveBeenCalled();
      expect(result).toEqual(mockActiveJob);
    });

    it('should return an error if second lookup fails after save', async () => {
      const mockJob = { ...baseJob, active: true };

      jest
        .spyOn(JobPostingModel, 'findOne')
        .mockResolvedValueOnce(mockJob as unknown as ReturnType<typeof JobPostingModel.findOne>)
        .mockResolvedValueOnce(null as unknown as ReturnType<typeof JobPostingModel.findOne>);

      const result = await toggleJobPostingActive(mockJobId, mockUsername);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Job not found' });
    });

    it('should return an error if saving the job throws', async () => {
      const mockJob = {
        ...baseJob,
        save: jest.fn().mockRejectedValue(new Error('DB error')),
      };

      jest
        .spyOn(JobPostingModel, 'findOne')
        .mockResolvedValue(mockJob as unknown as ReturnType<typeof JobPostingModel.findOne>);

      const result = await toggleJobPostingActive(mockJobId, mockUsername);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Error modifying job posting' });
    });

    it('should return an error when an unexpected exception occurs', async () => {
      jest.spyOn(JobPostingModel, 'findOne').mockRejectedValue(new Error('Unexpected failure'));

      const result = await toggleJobPostingActive(mockJobId, mockUsername);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Error modifying job posting' });
    });
  });

  describe('checkKeywordInJobPosting', () => {
    const mockJob = {
      _id: 'job123',
      company: 'Tech Corp',
      recruiter: 'recruiter123',
      title: 'Senior Software Engineer',
      description: 'Develop scalable backend systems',
      location: 'Remote',
      tags: [],
      active: true,
      payRange: '100k-140k',
      jobType: 'full-time',
      deadline: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as DatabaseJobPosting & { tags: DatabaseTag[] };

    it('should return true when a keyword matches the title', () => {
      const result = checkKeywordInJobPosting(mockJob, ['senior']);
      expect(result).toBe(true);
    });

    it('should return true when a keyword matches the description', () => {
      const result = checkKeywordInJobPosting(mockJob, ['backend']);
      expect(result).toBe(true);
    });

    it('should return true when a keyword matches the company name', () => {
      const result = checkKeywordInJobPosting(mockJob, ['tech']);
      expect(result).toBe(true);
    });

    it('should match words ignoring case matching', () => {
      const result = checkKeywordInJobPosting(mockJob, ['ENGINEER']);
      expect(result).toBe(true);
    });

    it('should return false when no keywords match', () => {
      const result = checkKeywordInJobPosting(mockJob, ['marketing', 'sales']);
      expect(result).toBe(false);
    });

    it('should return false when keyword list is empty', () => {
      const result = checkKeywordInJobPosting(mockJob, []);
      expect(result).toBe(false);
    });

    it('should return true when a keyword partially matches a field', () => {
      const result = checkKeywordInJobPosting(mockJob, ['engine']);
      expect(result).toBe(true);
    });

    it('should return true when at least one keyword matches', () => {
      const result = checkKeywordInJobPosting(mockJob, ['sales', 'engineer', 'randomword']);
      expect(result).toBe(true);
    });
  });
  describe('filterJobPostingsBySearch', () => {
    const jobList = [
      {
        _id: 'job1',
        company: 'Tech Corp',
        recruiter: 'recruiter1',
        title: 'Backend Engineer',
        description: 'Build backend APIs',
        location: 'Remote',
        tags: [],
        active: true,
      } as unknown as DatabaseJobPosting & { tags: DatabaseTag[] },
      {
        _id: 'job2',
        company: 'Biz Corp',
        recruiter: 'recruiter2',
        title: 'Frontend Developer',
        description: 'Build UI components',
        location: 'Onsite',
        tags: [],
        active: true,
      } as unknown as DatabaseJobPosting & { tags: DatabaseTag[] },
    ];

    it('should return all jobs when both searchKeyword and searchTags are empty', () => {
      jest.spyOn(ParseUtil, 'parseTags').mockReturnValue([]);
      jest.spyOn(ParseUtil, 'parseKeyword').mockReturnValue([]);

      const result = filterJobPostingsBySearch(jobList, '');

      expect(result).toEqual(jobList);
    });

    it('should filter using only tags when searchKeyword is empty', () => {
      jest.spyOn(ParseUtil, 'parseTags').mockReturnValue(['remote']);
      jest.spyOn(ParseUtil, 'parseKeyword').mockReturnValue([]);

      jest
        .spyOn(JobPostingService, 'checkTagInJobPosting')
        .mockImplementation(job => job._id.toString() === 'job1');

      const result = filterJobPostingsBySearch(jobList, 'remote');

      expect(result).toEqual([jobList[0]]);
    });

    it('should filter using only keywords when searchTags is empty', () => {
      jest.spyOn(ParseUtil, 'parseTags').mockReturnValue([]);
      jest.spyOn(ParseUtil, 'parseKeyword').mockReturnValue(['frontend']);

      jest
        .spyOn(JobPostingService, 'checkKeywordInJobPosting')
        .mockImplementation(job => job._id.toString() === 'job2');

      const result = filterJobPostingsBySearch(jobList, 'frontend');

      expect(result).toEqual([jobList[1]]);
    });

    it('should filter by or if keyword and tags when both are present in found jobs', () => {
      jest.spyOn(ParseUtil, 'parseTags').mockReturnValue(['remote']);
      jest.spyOn(ParseUtil, 'parseKeyword').mockReturnValue(['frontend']);

      jest
        .spyOn(JobPostingService, 'checkKeywordInJobPosting')
        .mockImplementation(job => job._id.toString() === 'job2');

      jest
        .spyOn(JobPostingService, 'checkTagInJobPosting')
        .mockImplementation(job => job._id.toString() === 'job1');

      const result = filterJobPostingsBySearch(jobList, 'frontend #remote');

      expect(result).toEqual(jobList);
    });

    it('should return an empty array when neither keywords nor tags match any job', () => {
      jest.spyOn(ParseUtil, 'parseTags').mockReturnValue(['fake-tag']);
      jest.spyOn(ParseUtil, 'parseKeyword').mockReturnValue(['fake-keyword']);

      jest.spyOn(JobPostingService, 'checkKeywordInJobPosting').mockReturnValue(false);
      jest.spyOn(JobPostingService, 'checkTagInJobPosting').mockReturnValue(false);

      const result = filterJobPostingsBySearch(jobList, 'nonexistent-keyword #nonexistent-tag');

      expect(result).toEqual([]);
    });
  });

  describe('checkTagInJobPosting', () => {
    const mockJob = {
      _id: 'job123',
      company: 'Tech Corp',
      recruiter: 'recruiter123',
      title: 'Backend Engineer',
      description: 'Build backend APIs',
      location: 'Remote',
      active: true,
      tags: [{ name: 'remote' }, { name: 'typescript' }, { name: 'backend' }],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as DatabaseJobPosting & { tags: DatabaseTag[] };

    beforeEach(() => {
      jest.clearAllMocks();
      jest.restoreAllMocks();
    });

    it('should return true when a tag name matches exactly', () => {
      expect(checkTagInJobPosting(mockJob, ['remote'])).toBe(true);
    });

    it('should return true when a tag matches case-insensitively', () => {
      const result = checkTagInJobPosting(mockJob, ['BACKEND']);
      expect(result).toBe(true);
    });

    it('should return false when no tags match', () => {
      const result = checkTagInJobPosting(mockJob, ['marketing']);
      expect(result).toBe(false);
    });

    it('should return false when tag list is empty', () => {
      const result = checkTagInJobPosting(mockJob, []);
      expect(result).toBe(false);
    });

    it('should return true if at least one tag matches even when others do not', () => {
      const result = checkTagInJobPosting(mockJob, ['sales', 'typescript', 'random']);
      expect(result).toBe(true);
    });

    it('should return false when job has no tags', () => {
      const emptyTagJob = { ...mockJob, tags: [] };
      const result = checkTagInJobPosting(emptyTagJob, ['remote']);
      expect(result).toBe(false);
    });

    it('should not return true on partial matches', () => {
      const result = checkTagInJobPosting(mockJob, ['type']);
      expect(result).toBe(false);
    });
  });

  describe('getJobPostings', () => {
    const mockUsername = 'talentUser';

    const mockUser = {
      _id: 'user123',
      username: mockUsername,
    };

    const mockJobs = [
      {
        _id: 'job1',
        company: 'Tech Corp',
        recruiter: 'recruiter1',
        title: 'Backend Engineer',
        description: 'Build backend APIs',
        location: 'Remote',
        tags: [],
        active: true,
        jobType: 'full-time',
        deadline: null,
      },
      {
        _id: 'job2',
        company: 'Biz Corp',
        recruiter: 'recruiter2',
        title: 'Frontend Developer',
        description: 'Build UI components',
        location: 'New York',
        tags: [],
        active: true,
        jobType: 'part-time',
        deadline: null,
      },
    ];

    afterEach(() => {
      jest.clearAllMocks();
      jest.restoreAllMocks();
    });

    const mockFindChain = (jobsToReturn = mockJobs) => {
      return jest.spyOn(JobPostingModel, 'find').mockReturnValue({
        populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(jobsToReturn) }),
      } as unknown as ReturnType<typeof JobPostingModel.find>);
    };

    it('should return error when user is not found', async () => {
      jest
        .spyOn(UserModel, 'findOne')
        .mockResolvedValue(null as unknown as ReturnType<typeof UserModel.findOne>);

      const result = await getJobPostings(mockUsername);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'User not found' });
    });

    it('should fetch active, non-expired jobs with no extra filters', async () => {
      jest
        .spyOn(UserModel, 'findOne')
        .mockResolvedValue(mockUser as unknown as ReturnType<typeof UserModel.findOne>);

      mockFindChain();

      const result = await getJobPostings(mockUsername);

      expect(result).toEqual(mockJobs);
    });

    it('should apply location filter when location is provided', async () => {
      jest
        .spyOn(UserModel, 'findOne')
        .mockResolvedValue(mockUser as unknown as ReturnType<typeof UserModel.findOne>);

      mockFindChain([mockJobs[1]]);

      const result = await getJobPostings(mockUsername, 'New York');

      expect(result).toEqual([mockJobs[1]]);
    });

    it('should apply jobType filter when jobType is provided', async () => {
      jest
        .spyOn(UserModel, 'findOne')
        .mockResolvedValue(mockUser as unknown as ReturnType<typeof UserModel.findOne>);

      mockFindChain([mockJobs[0]]);

      const jobType = 'full-time';
      const result = await getJobPostings(mockUsername, undefined, jobType);

      expect(result).toEqual([mockJobs[0]]);
    });

    it('should apply search filter using filterJobPostingsBySearch when search is provided', async () => {
      jest
        .spyOn(UserModel, 'findOne')
        .mockResolvedValue(mockUser as unknown as ReturnType<typeof UserModel.findOne>);

      mockFindChain(mockJobs);

      jest
        .spyOn(JobPostingService, 'filterJobPostingsBySearch')
        .mockReturnValue([mockJobs[0]] as any);

      const result = await getJobPostings(mockUsername, undefined, undefined, 'backend #remote');

      expect(result).toEqual([mockJobs[0]]);
    });

    it('should return error when an exception occurs', async () => {
      jest
        .spyOn(UserModel, 'findOne')
        .mockResolvedValue(mockUser as unknown as ReturnType<typeof UserModel.findOne>);

      jest.spyOn(JobPostingModel, 'find').mockImplementation(() => {
        throw new Error('DB failure');
      });

      const result = await getJobPostings(mockUsername);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Error fetching jobs' });
    });
  });

  describe('getJobPostingById', () => {
    const mockJobId = 'job123';
    const mockRequestor = 'recruiter123';

    const baseJob = {
      _id: mockJobId,
      company: 'Tech Corp',
      recruiter: mockRequestor,
      title: 'Software Engineer',
      description: 'Build backend systems',
      location: 'Remote',
      tags: [],
      active: true,
      jobType: 'full-time',
      deadline: null,
      populate: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      jest.restoreAllMocks();
    });

    it('should return an error when the job is not found', async () => {
      baseJob.populate.mockResolvedValueOnce(
        null as unknown as ReturnType<typeof JobPostingModel.findById>,
      );

      jest
        .spyOn(JobPostingModel, 'findById')
        .mockReturnValueOnce(baseJob as unknown as ReturnType<typeof JobPostingModel.findById>);

      const result = await getJobPostingById('fakeId', 'otherRequestor');

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Job posting not found' });
    });

    it('should return an error when job is inactive and requester is not the recruiter', async () => {
      baseJob.populate.mockResolvedValueOnce({ ...baseJob, active: false } as unknown as ReturnType<
        typeof JobPostingModel.findById
      >);

      jest
        .spyOn(JobPostingModel, 'findById')
        .mockReturnValueOnce(baseJob as unknown as ReturnType<typeof JobPostingModel.findById>);

      const result = await getJobPostingById(mockJobId, 'Other Requestor');

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Error in fetching job posting' });
    });

    it('should return the job when it is inactive and the requester is the recruiter', async () => {
      baseJob.populate.mockResolvedValueOnce({ ...baseJob, active: false } as unknown as ReturnType<
        typeof JobPostingModel.findById
      >);

      jest
        .spyOn(JobPostingModel, 'findById')
        .mockReturnValueOnce(baseJob as unknown as ReturnType<typeof JobPostingModel.findById>);

      const result = await getJobPostingById(mockJobId, mockRequestor);

      expect(result).toEqual({ ...baseJob, active: false });
    });

    it('should return the job when it is active regardless of requester', async () => {
      baseJob.populate.mockResolvedValueOnce(
        baseJob as unknown as ReturnType<typeof JobPostingModel.findById>,
      );

      jest
        .spyOn(JobPostingModel, 'findById')
        .mockReturnValueOnce(baseJob as unknown as ReturnType<typeof JobPostingModel.findById>);

      const result = await getJobPostingById(mockJobId, 'anotherUser');

      expect(result).toEqual(baseJob);
    });

    it('should return an error when a database error occurs', async () => {
      baseJob.populate.mockRejectedValueOnce(new Error('DB error'));

      jest
        .spyOn(JobPostingModel, 'findById')
        .mockReturnValueOnce(baseJob as unknown as ReturnType<typeof JobPostingModel.findById>);

      const result = await getJobPostingById(mockJobId, mockRequestor);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Error fetching job posting' });
    });
  });

  describe('getJobPostingByRecruiter', () => {
    const recruiterUsername = 'recruiter123';

    const mockJobs = [
      {
        _id: 'job1',
        company: 'Tech Corp',
        recruiter: recruiterUsername,
        title: 'Backend Engineer',
        description: 'Build backend APIs',
        location: 'Remote',
        tags: [],
        active: true,
        jobType: 'full-time',
        deadline: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: 'job2',
        company: 'Tech Corp',
        recruiter: recruiterUsername,
        title: 'Frontend Developer',
        description: 'Build UI components',
        location: 'Remote',
        tags: [],
        active: true,
        jobType: 'part-time',
        deadline: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as unknown as DatabaseJobPosting[];

    beforeEach(() => {
      jest.clearAllMocks();
      jest.restoreAllMocks();
    });

    it('should return an error when requestingUsername does not match recruiterUsername', async () => {
      const result = await getJobPostingByRecruiter(recruiterUsername, 'differentUser');

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Error fetching recruiter job posting' });
    });

    it('should return jobs when recruiterUsername matches requestingUsername and jobs exist', async () => {
      jest
        .spyOn(JobPostingModel, 'find')
        .mockResolvedValue(mockJobs as unknown as ReturnType<typeof JobPostingModel.find>);

      const result = await getJobPostingByRecruiter(recruiterUsername, recruiterUsername);

      expect(result).toEqual(mockJobs);
    });

    it('should return an error when jobs result is null', async () => {
      jest
        .spyOn(JobPostingModel, 'find')
        .mockResolvedValue(null as unknown as ReturnType<typeof JobPostingModel.find>);

      const result = await getJobPostingByRecruiter(recruiterUsername, recruiterUsername);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Job postings not found' });
    });

    it('should return an error when a database error occurs', async () => {
      jest.spyOn(JobPostingModel, 'find').mockRejectedValue(new Error('DB error'));

      const result = await getJobPostingByRecruiter(recruiterUsername, recruiterUsername);

      expect(result).toHaveProperty('error');
      expect(result).toEqual({ error: 'Error fetching recruiter job posting' });
    });
  });
});
