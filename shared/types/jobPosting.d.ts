import { ObjectId } from 'mongodb';
import { Tag } from './tag';

/**
 * Represents a Job Posting
 * - `company`: The company for which the job is being posted.
 * - `recruiter`: Username of the recruiter making the job posting.
 * - `title`: Title of the position that the posting is being made for.
 * - `payRange`: A pay range description of the position.
 * - `description`: The description for the job being posted.
 * - `location`: The location of the job.
 * - `tags`: An array of references to `Tag` documents associated with the job posting.
 * - `active`: A boolean representing if the job posting is active or not
 * - `deadline`: A date on which a job will automatically be set to inactive.
 */
export interface JobPosting {
  company: String;
  recruiter: String;
  title: String;
  payRange?: String | null;
  description: String;
  location: String;
  tags: Tag[];
  active: Boolean;
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
