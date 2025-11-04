import { ObjectId } from 'mongodb';
import { Request } from 'express';
import { Tag } from './tag';

/**
 * Type representing the possible types of a job posting.
 * - `internship`: An internship position.
 * - `co-op`: A co-op position.
 * - `full-time`: A full-time position.
 */
export type JobType = 'internship' | 'co-op' | 'full-time';

/**
 * Represents a Job Posting
 * - `company`: The company for which the job is being posted.
 * - `recruiter`: Username of the recruiter making the job posting.
 * - `title`: Title of the position that the posting is being made for.
 * - `payRange`: A pay range description of the position.
 * - `description`: The description for the job being posted.
 * - `location`: The location of the job.
 * - `jobType`: The type of job (internship/co-op/full-time).
 * - `tags`: An array of references to `Tag` documents associated with the job posting.
 * - `active`: A boolean representing if the job posting is active or not
 * - `deadline`: A date on which a job will automatically be set to inactive.
 */
export interface JobPosting {
  company: string;
  recruiter: string;
  title: string;
  payRange?: string | null;
  description: string;
  location: string;
  jobType?: JobType | null;
  tags: Tag[];
  active: boolean;
  deadline?: Date | null;
}

/**
 * Represents a Database Job Posting
 * _id - Object Id of the job posting document
 * createdAt - created at date timestamp
 * updatedAt - updated at date timestamp
 */
export interface DatabaseJobPosting extends JobPosting {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Type representing possible responses for a JobPosting-related operation.
 * - Either a `DatabaseJobPosting` object or an error message.
 */
export type JobPostingResponse = DatabaseJobPosting | { error: string };

/**
 * Type representing possible responses for a JobPosting Array-related operation.
 * - Either a `DatabaseJobPosting[]` object or an error message.
 */
export type JobPostingListResponse = DatabaseJobPosting[] | { error: string };

/**
 * Interface for the request when finding job postings with filters.
 * - `location`: Filter by location (query).
 * - `jobType`: Filter by job type (query).
 * - `search`: Search string for tags/keywords (query).
 * - `username`: The username of the requester (from headers).
 */
export interface FindJobPostingsRequest extends Request {
  query: {
    location?: string;
    jobType?: JobType;
    search?: string;
  };
}
