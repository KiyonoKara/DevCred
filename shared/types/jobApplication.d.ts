import { ObjectId } from 'mongodb';
import { JobPosting } from './jobPosting';

/**
 * Type representing the possible statuses of a job application.
 * - `Submitted`: The application was just submitted.
 * - `Archived`: The position for which the application was made has expired.
 * - `In Review`: The application is being reviewed.
 * - `Accepted`: The applicant has/ will be offered the job.
 * - `Rejected`: The applicant was rejected from the job.
 */
export type JobStatus = 'Submitted' | 'Archived' | 'In Review' | 'Accepted' | 'Rejected';

/**
 * Represents a Job Application
 * - `jobPosting`: Reference to the `JobPosting` document of the job being applied to.
 * - `user`: Username of the user applying to a job.
 * - `jobStatus`: Status of a user's application.
 * - `applicationDate`: Date that the user applied to the job.
 */
export interface JobApplication {
  jobPosting: JobPosting;
  user: string;
  jobStatus: JobStatus;
  applicationDate: Date;
}

/**
 * Represents a Database Job Application
 * _id - Object Id of the job application document
 * createdAt - created at date timestamp
 * updatedAt - updated at date timestamp
 */
export interface DatabaseJobApplication extends JobApplication {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents a Populated Database Job Application
 * `jobPosting`: The job posting associated to the application
 */
export interface PopulatedDatabaseJobApplication extends Omit<JobApplication, 'jobPosting'> {
  jobPosting: {
    company: string;
    recruiter: string;
    title: string;
    active: boolean;
  };
}

/**
 * Type representing possible responses for a JobApplication-related operation.
 * - Either a `DatabaseJobApplication` object or an error message.
 */
export type JobApplicationResponse = DatabaseJobApplication | { error: string };

/**
 * Type representing possible responses for a JobApplication-related operation.
 * - Either a `PopulatedDatabaseJobApplication` object or an error message.
 */
export type PopulatedJobApplicationResponse = PopulatedDatabaseJobApplication | { error: string };

/**
 * Type representing possible responses for a JobApplication array-related operation.
 * - Either a `PopulatedDatabaseJobApplication[]` object or an error message.
 */
export type PopulatedJobApplicationListResponse =
  | PopulatedDatabaseJobApplication[]
  | { error: string };
