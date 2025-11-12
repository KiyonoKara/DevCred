import JobApplicationModel from '../models/jobApplication.model';
import JobPostingModel from '../models/jobPosting.model';
import UserModel from '../models/users.model';
import { JobApplicationResponse, PopulatedJobApplicationListResponse } from '../types/types';

/**
 * Gets the count of applications for a specific job posting.
 * @param {string} jobId - The ID of the job posting.
 * @returns {Promise<number>} - The count of applications or 0 if error.
 */
export const getApplicationCount = async (jobId: string): Promise<number> => {
  try {
    const count = await JobApplicationModel.countDocuments({ jobPosting: jobId });
    return count;
  } catch (err) {
    return 0;
  }
};

/**
 * Checks if a user has applied to a job posting.
 * @param {string} jobId - The ID of the job posting.
 * @param {string} username - The username of the user.
 * @returns {Promise<boolean>} - True if the user has applied, false otherwise.
 */
export const hasUserApplied = async (jobId: string, username: string): Promise<boolean> => {
  try {
    const application = await JobApplicationModel.findOne({
      jobPosting: jobId,
      user: username,
    });
    return application !== null;
  } catch (err) {
    return false;
  }
};

/**
 * Creates a new job application
 * @param {string} jobId - The ID of the job posting to apply for.
 * @param {string} username - The username of the applicant.
 * @returns {Promise<JobApplicationResponse>} - The created job application or an error message.
 */
export const createApplication = async (
  jobId: string,
  username: string,
): Promise<JobApplicationResponse> => {
  try {
    const job = await JobPostingModel.findById(jobId);
    if (!job) {
      return { error: 'Job not found' };
    }

    const newApplication = await JobApplicationModel.create({
      jobPosting: job,
      user: username,
      jobStatus: 'Submitted',
      applicationDate: new Date(),
    });

    // TODO: Add DM Logic

    return newApplication;
  } catch (err) {
    return { error: 'Error when applying to a job' };
  }
};

/**
 * Deletes a job application if user is authorized.
 * @param {string} applicationId - The ID of the application to delete.
 * @param {string} username - The username of the user requesting deletion.
 * @returns {Promise<JobApplicationResponse>} - The deleted job application or an error message.
 */
export const deleteApplication = async (
  applicationId: string,
  username: string,
): Promise<JobApplicationResponse> => {
  try {
    const application = await JobApplicationModel.findById(applicationId).populate('jobPosting');

    if (!application) {
      return { error: 'Application not found' };
    }

    if (application.user !== username || application.jobPosting.recruiter !== username) {
      return { error: 'Not authorized to withdraw application' };
    }

    const result = await JobApplicationModel.findByIdAndDelete(applicationId);
    if (!result) {
      return { error: 'Application not found or already deleted' };
    }

    return result;
  } catch (err) {
    return { error: 'Application not found or already deleted' };
  }
};

/**
 * Retrieves all job applications for a given user (talent user type only).
 * @param {string} username - The username of the user whose applications to fetch.
 * @returns {Promise<PopulatedJobApplicationListResponse>} - A list of job applications or an error message.
 */
export const getAllApplications = async (
  username: string,
): Promise<PopulatedJobApplicationListResponse> => {
  try {
    const user = await UserModel.findOne({ username: username });
    if (!user) {
      return { error: 'User not found' };
    }

    if (user.userType !== 'talent') {
      return { error: 'User type not authorized' };
    }

    const applications = await JobApplicationModel.find({ user: username }).populate('jobPosting');
    return applications;
  } catch (err) {
    return { error: 'Applications could not be fetched for user' };
  }
};

/**
 * Retrieves all job applications for a job posting when requested by user (recruiter user type only).
 * @param {string} username - The username of the recruiter requesting the applications.
 * @param {string} jobId - The ID of the job posting.
 * @returns {Promise<PopulatedJobApplicationListResponse>} - A list of job applications or an error message.
 */
export const getApplicationByJobId = async (
  username: string,
  jobId: string,
): Promise<PopulatedJobApplicationListResponse> => {
  try {
    const user = await UserModel.findOne({ username: username });
    if (!user) {
      return { error: 'User not found' };
    }

    if (user.userType !== 'recruiter') {
      return { error: 'User type not authorized' };
    }

    const job = await JobPostingModel.findById(jobId);
    if (!job) {
      return { error: 'Job not found' };
    }

    if (job.recruiter !== username) {
      return { error: 'User not authorized to view job applications' };
    }

    const applications = await JobApplicationModel.find({
      jobPosting: jobId,
    }).populate('jobPosting');

    return applications;
  } catch (err) {
    return { error: 'Applications could not be fetched for job' };
  }
};
