import JobPostingModel from '../models/jobPosting.model';
import TagModel from '../models/tags.model';
import UserModel from '../models/users.model';
import {
  DatabaseJobPosting,
  DatabaseTag,
  JobPosting,
  JobPostingListResponse,
  JobPostingResponse,
  JobType,
} from '../types/types';
import { parseKeyword, parseTags } from '../utils/parse.util';

/**
 * Creates a new job posting (recruiter user type method only).
 * @param {JobPosting} job - The job posting
 * @returns {Promise<JobPostingResponse>} - The created job posting or an error message.
 */
export const createJobPosting = async (job: JobPosting): Promise<JobPostingResponse> => {
  try {
    const community = await JobPostingModel.create(job);
    return community;
  } catch (err) {
    return {
      error: 'Error creating job posting',
    };
  }
};

/**
 * Deletes a job posting (recruiter user type method only).
 * @param {string} jobId - The ID of the job posting
 * @param {string} username - The username of the recruiter requesting deletion.
 * @returns {Promise<JobPostingResponse>} - The deleted job posting or an error message.
 */
export const deleteJobPosting = async (
  jobId: string,
  username: string,
): Promise<JobPostingResponse> => {
  try {
    const job = await JobPostingModel.findOne({ _id: jobId, recruiter: username });

    if (!job) {
      return {
        error: 'Job not found',
      };
    }
    const result = await JobPostingModel.findByIdAndDelete(jobId);

    if (!result) {
      return { error: 'Job Posting not found or already deleted' };
    }

    return result;
  } catch (err) {
    return {
      error: 'Error deleting job posting',
    };
  }
};

/**
 * Toggles a job posting's active status, taking into consideration the deadline
 * @param {string} jobId - The ID of the job posting
 * @param {string} username - The username of the recruiter toggling the posting.
 * @returns {Promise<JobPostingResponse>} - The updated job posting or an error message.
 */
export const toggleJobPostingActive = async (
  jobId: string,
  username: string,
): Promise<JobPostingResponse> => {
  try {
    let job = await JobPostingModel.findOne({ _id: jobId, recruiter: username });
    if (!job) {
      return {
        error: 'Job not found',
      };
    }

    const today = new Date();
    const dueDate = job.deadline ? new Date(job.deadline) : null;

    // If the job is beyond the due date of the job
    // (meaning it is not returned when fetched as due date takes precedence over activation status)
    // Re-activate the position, wiping the due date in the process.
    if (dueDate && today > dueDate) {
      job.deadline = null;
      job.active = true;
    } else {
      job.active = !job.active;
    }
    await job.save();

    job = await JobPostingModel.findOne({ _id: jobId, recruiter: username });
    if (!job) {
      return {
        error: 'Job not found',
      };
    }

    return job;
  } catch (err) {
    return {
      error: 'Error modifying job posting',
    };
  }
};

/**
 * Checks if keywords exist in a job posting's title or description.
 * @param {DatabaseJobPosting} job - The job posting to check
 * @param {string[]} keywordlist - The keywords to check
 * @returns {boolean} - `true` if any keyword is found
 */
const checkKeywordInJobPosting = (
  job: DatabaseJobPosting & { tags: DatabaseTag[] },
  keywordlist: string[],
): boolean => {
  for (const word of keywordlist) {
    if (
      job.title.toLowerCase().includes(word.toLowerCase()) ||
      job.description.toLowerCase().includes(word.toLowerCase()) ||
      job.company.toLowerCase().includes(word.toLowerCase())
    ) {
      return true;
    }
  }
  return false;
};

/**
 * Checks if given job posting contains any tags from the given list.
 * @param {DatabaseJobPosting} job - The job posting to check
 * @param {string[]} taglist - The list of tags to check for
 * @returns {boolean} - `true` if any tag is present in the job posting, `false` otherwise
 */
const checkTagInJobPosting = (
  job: DatabaseJobPosting & { tags: DatabaseTag[] },
  taglist: string[],
): boolean => {
  for (const tagname of taglist) {
    for (const tag of job.tags) {
      if (tagname.toLowerCase() === tag.name.toLowerCase()) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Filters job postings by search string containing tags and/or keywords.
 * @param {(DatabaseJobPosting & { tags: DatabaseTag[] })[]} jobList - The list of job postings
 * @param {string} search - The search string
 * @returns {(DatabaseJobPosting & { tags: DatabaseTag[] })[]} - Filtered list of job postings
 */
const filterJobPostingsBySearch = (
  jobList: (DatabaseJobPosting & { tags: DatabaseTag[] })[],
  search: string,
): (DatabaseJobPosting & { tags: DatabaseTag[] })[] => {
  const searchTags = parseTags(search);
  const searchKeyword = parseKeyword(search);

  return jobList.filter((job: DatabaseJobPosting & { tags: DatabaseTag[] }) => {
    if (searchKeyword.length === 0 && searchTags.length === 0) {
      return true;
    }

    if (searchKeyword.length === 0) {
      return checkTagInJobPosting(job, searchTags);
    }

    if (searchTags.length === 0) {
      return checkKeywordInJobPosting(job, searchKeyword);
    }

    return checkKeywordInJobPosting(job, searchKeyword) || checkTagInJobPosting(job, searchTags);
  });
};

/**
 * Retrieves job postings for a user with optional filtering.
 * Returns recruiter made job posts if recruiter requests/
 * Returns job posts that are active if talent requests.
 * @param {string} username - The username of the requester.
 * @param {string} location - Optional location filter.
 * @param {JobType} jobType - Optional job type filter.
 * @param {string} search - Optional search string for tags/keywords.
 * @returns {Promise<JobPostingListResponse>} - A list of job postings or an error message.
 */
export const getJobPostings = async (
  username: string,
  location?: string,
  jobType?: JobType,
  search?: string,
): Promise<JobPostingListResponse> => {
  try {
    const user = await UserModel.findOne({ username: username });
    if (!user) {
      return {
        error: 'User not found',
      };
    }

    // TODO: does this type work?
    const query: Record<string, unknown> = {};
    // For talent users, only show active jobs that haven't expired
    query.active = true;
    query.$or = [{ deadline: null }, { deadline: { $gt: new Date() } }];

    // Apply location filter
    if (location) {
      query.location = { $regex: location, $options: 'i' }; // Case-insensitive partial match
    }

    // Apply job type filter
    if (jobType) {
      query.jobType = jobType;
    }

    let jobs: (DatabaseJobPosting & { tags: DatabaseTag[] })[] = await JobPostingModel.find(query)
      .populate<{ tags: DatabaseTag[] }>({
        path: 'tags',
        model: TagModel,
      })
      .lean();

    // Apply search filter (tags/keywords) if provided
    if (search) {
      jobs = filterJobPostingsBySearch(
        jobs as unknown as (DatabaseJobPosting & { tags: DatabaseTag[] })[],
        search,
      );
    }

    return jobs as unknown as DatabaseJobPosting[];
  } catch (err) {
    return {
      error: 'Error fetching jobs',
    };
  }
};

/**
 * Retrieves a single job posting by ID.
 * @param {string} jobId - The ID of the job posting.
 * @returns {Promise<JobPostingResponse>} - The job posting or an error message.
 */
export const getJobPostingById = async (
  jobId: string,
  requestor: string,
): Promise<JobPostingResponse> => {
  try {
    const job = await JobPostingModel.findById(jobId).populate<{ tags: DatabaseTag[] }>({
      path: 'tags',
      model: TagModel,
    });

    if (!job) {
      return {
        error: 'Job posting not found',
      };
    }

    if (!job.active && job.recruiter !== requestor) {
      return {
        error: 'Error in fetching job posting',
      };
    }

    return job;
  } catch (err) {
    return {
      error: 'Error fetching job posting',
    };
  }
};

/**
 * Returns all job postings made by a recruiter
 * @param recruiterUsername username of recruiter to get postings for
 * @param requestingUsername username of user requesting postings
 * @returns job postings created by the recruiter if the requestor is valid
 */
export const getJobPostingByRecruiter = async (
  recruiterUsername: string,
  requestingUsername: string,
): Promise<JobPostingListResponse> => {
  try {
    if (recruiterUsername !== requestingUsername) {
      throw new Error('Cannot request postings from a recruiter.');
    }
    const jobs = await JobPostingModel.find({ recruiter: recruiterUsername });

    if (!jobs) {
      return {
        error: 'Job postings not found',
      };
    }

    return jobs;
  } catch (err) {
    return {
      error: 'Error fetching recruiter job posting',
    };
  }
};
