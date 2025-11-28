import UserModel from '../models/users.model';
import JobFairModel from '../models/jobFair.model';
import QuestionModel from '../models/questions.model';
import ChatModel from '../models/chat.model';
import CommunityModel from '../models/community.model';
import MessageModel from '../models/messages.model';
import { createNotification } from './notification.service';
import { DatabaseNotification } from '../types/types';

/**
 * Helper function to get the time since which to check for new notifications.
 * Always checks since yesterday at the same time as the user's summary time preference.
 * This ensures a consistent 24-hour window that resets each day at the summary time.
 * @param summaryTime - The user's summary time preference in "HH:MM" format (local time).
 * @returns Date - The Date object representing yesterday at the summary time.
 */
function getSinceTime(summaryTime: string): Date {
  const now = new Date();
  const timeParts = summaryTime.split(':');

  if (timeParts.length !== 2) {
    // Fallback to 24 hours ago if time format is invalid
    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  const summaryHour = parseInt(timeParts[0], 10);
  const summaryMinute = parseInt(timeParts[1], 10);

  if (isNaN(summaryHour) || isNaN(summaryMinute)) {
    // Fallback to 24 hours ago if time values are invalid
    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  // Create a date object for yesterday at the summary time (in server local time)
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(summaryHour, summaryMinute, 0, 0);
  yesterday.setSeconds(0, 0);

  return yesterday;
}

/**
 * Generates a summarized notification for a user based on their preferences.
 * Checks for new messages, job fair updates, and community questions since last summary.
 * @param username - The username to generate summary for.
 * @returns {Promise<DatabaseNotification | { error: string }>} - The summary notification or error.
 */
const generateSummaryNotification = async (
  username: string,
): Promise<DatabaseNotification | { error: string }> => {
  try {
    const user = await UserModel.findOne({ username })
      .select('notificationPreferences lastLogin')
      .lean();
    if (
      !user ||
      !user.notificationPreferences?.enabled ||
      !user.notificationPreferences?.summarized
    ) {
      return { error: 'User does not have summarized notifications enabled' };
    }

    const summaryTime = user.notificationPreferences?.summaryTime || '09:00';
    const now = new Date();

    // Check if user has lastLogin and if the gap exceeds 24 hours
    let sinceTime: Date;
    const userWithLastLogin = user as typeof user & { lastLogin?: Date | string };
    if (userWithLastLogin.lastLogin) {
      const lastLoginDate = new Date(userWithLastLogin.lastLogin);
      const timeSinceLastLogin = now.getTime() - lastLoginDate.getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (timeSinceLastLogin > twentyFourHours) {
        // Use lastLogin as sinceTime if gap exceeds 24 hours
        sinceTime = lastLoginDate;
      } else {
        // Use default 24-hour window
        sinceTime = getSinceTime(summaryTime);
      }
    } else {
      // No lastLogin recorded, use default 24-hour window
      sinceTime = getSinceTime(summaryTime);
    }

    // Count new DM messages - count ACTUAL messages, not notifications
    let dmCount = 0;
    if (user.notificationPreferences.dmEnabled) {
      const chats = await ChatModel.find({ participants: username }).lean();
      for (const chat of chats) {
        const otherParticipant = chat.participants.find(p => p !== username);
        if (otherParticipant && chat.messages && chat.messages.length > 0) {
          // Query actual messages from the database, filtering by date at database level
          const messages = await MessageModel.find({
            _id: { $in: chat.messages },
            msgFrom: otherParticipant,
            type: 'direct',
            msgDateTime: { $gt: sinceTime }, // Only fetch messages after sinceTime
          })
            .lean()
            .exec();

          dmCount += messages.length;
        }
      }
    }

    // Count job fair updates - check ACTUAL job fair data
    let jobFairCount = 0;
    let upcomingJobFairCount = 0;
    let endedJobFairCount = 0;
    if (user.notificationPreferences.jobFairEnabled) {
      const jobFairs = await JobFairModel.find({ participants: username }).lean();
      const now = new Date();
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      for (const jobFair of jobFairs) {
        // Check if job fair was created or updated since last summary
        // If updatedAt is after sinceTime, something changed
        const jobFairUpdated = jobFair.updatedAt && new Date(jobFair.updatedAt) > sinceTime;
        const jobFairCreated = jobFair.createdAt && new Date(jobFair.createdAt) > sinceTime;

        if (jobFairCreated || jobFairUpdated) {
          // Check if status changed to 'live' or 'ended' since last summary
          if (jobFair.status === 'live' || jobFair.status === 'ended') {
            jobFairCount += 1;
          }
        }

        // Check for upcoming job fairs (starting within 24 hours)
        if (jobFair.status === 'upcoming' && jobFair.startTime) {
          const startTime = new Date(jobFair.startTime);
          if (startTime <= oneDayFromNow && startTime > now) {
            // Only count if we haven't seen this job fair start time before
            // Check if start time is within the summary window
            if (
              startTime > sinceTime ||
              startTime <= new Date(sinceTime.getTime() + 24 * 60 * 60 * 1000)
            ) {
              upcomingJobFairCount += 1;
            }
          }
        }

        // Check for recently ended job fairs
        if (jobFair.status === 'ended' && jobFair.endTime) {
          const endTime = new Date(jobFair.endTime);
          if (endTime > sinceTime) {
            endedJobFairCount += 1;
          }
        }
      }
    }

    // Count community questions - check ACTUAL questions
    let communityQuestionCount = 0;
    const communityCounts: { [key: string]: number } = {};
    if (user.notificationPreferences.communityEnabled) {
      // Get all communities user is part of (where user is a participant)
      const userCommunities = await CommunityModel.find({
        participants: username,
      })
        .select('_id name')
        .lean();

      for (const community of userCommunities) {
        // Query questions with date filtering at database level to avoid fetching old questions
        const recentQuestions = await QuestionModel.find({
          community: community._id,
          askedBy: { $ne: username },
          askDateTime: { $gt: sinceTime }, // Only fetch questions after sinceTime
        })
          .lean()
          .exec();

        if (recentQuestions.length > 0) {
          // Use community name if available, otherwise use ID
          const communityName = community.name || `Community ${community._id}`;
          communityCounts[communityName] = recentQuestions.length;
          communityQuestionCount += recentQuestions.length;
        }
      }
    }

    // Build summary message
    const summaryParts: string[] = [];
    if (dmCount > 0) {
      summaryParts.push(`${dmCount} new DM message${dmCount > 1 ? 's' : ''}`);
    }
    if (jobFairCount > 0) {
      summaryParts.push(`${jobFairCount} job fair update${jobFairCount > 1 ? 's' : ''}`);
    }
    if (upcomingJobFairCount > 0) {
      summaryParts.push(
        `${upcomingJobFairCount} job fair${upcomingJobFairCount > 1 ? 's' : ''} starting soon`,
      );
    }
    if (endedJobFairCount > 0) {
      summaryParts.push(
        `${endedJobFairCount} job fair${endedJobFairCount > 1 ? 's' : ''} just ended`,
      );
    }
    if (communityQuestionCount > 0) {
      const communityList = Object.entries(communityCounts)
        .map(([name, count]) => `${name}: ${count}`)
        .join(', ');
      summaryParts.push(
        `${communityQuestionCount} new question${communityQuestionCount > 1 ? 's' : ''} in followed communities (${communityList})`,
      );
    }

    if (summaryParts.length === 0) {
      // No new notifications to summarize - this is not an error, just nothing to report
      // Return a special indicator that can be checked by the scheduler
      return { error: 'No new notifications to summarize' };
    }

    const summaryMessage = `Summary: ${summaryParts.join('; ')}`;

    // Create summary notification
    const summaryNotification = await createNotification({
      recipient: username,
      type: 'dm',
      title: 'Daily Notification Summary',
      message: summaryMessage,
      read: false,
    });

    if ('error' in summaryNotification) {
      return summaryNotification;
    }

    // Ensure it's a DatabaseNotification (not a Mongoose document)
    const notification = summaryNotification as DatabaseNotification;
    return notification;
  } catch (error) {
    return { error: `Error generating summary notification: ${error}` };
  }
};

/**
 * Checks and logs what will be included in the next summary for a user.
 * This is called every minute to show pending summary contents.
 * @param username - The username to check pending summary for.
 */
export async function checkPendingSummaryContents(username: string): Promise<void> {
  try {
    const user = await UserModel.findOne({ username }).select('notificationPreferences');
    if (
      !user ||
      !user.notificationPreferences?.enabled ||
      !user.notificationPreferences?.summarized
    ) {
      return;
    }
    // Function intentionally left empty after removing logs
    // Keeping function signature for compatibility with scheduler
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      `[Notification Scheduler] Error checking pending summary for ${username}:`,
      error,
    );
    if (error instanceof Error) {
      // eslint-disable-next-line no-console
      console.error(`[Notification Scheduler] Error stack:`, error.stack);
    }
  }
}

/**
 * Gets detailed breakdown for a summary notification.
 * Returns messages grouped by chat, questions grouped by community, and job fair updates.
 * @param username - The username to get summary breakdown for.
 * @param sinceTime - The time since which to fetch updates (from the summary notification's createdAt).
 * @returns Promise with detailed breakdown or error.
 */
export async function getSummaryBreakdown(
  username: string,
  sinceTime: Date,
): Promise<
  | {
      dmMessages: { [chatId: string]: { otherUser: string; count: number; chatId: string } };
      communityQuestions: {
        [communityId: string]: {
          communityName: string;
          count: number;
          questions: Array<{ _id: string; title: string; askedBy: string; askDateTime: Date }>;
        };
      };
      jobFairs: Array<{
        _id: string;
        title: string;
        status: string;
        startTime?: Date;
        endTime?: Date;
      }>;
    }
  | { error: string }
> {
  try {
    const user = await UserModel.findOne({ username }).select('notificationPreferences');
    if (!user) {
      return { error: 'User not found' };
    }

    const dmMessages: {
      [chatId: string]: {
        otherUser: string;
        count: number;
        chatId: string;
        isDeleted?: boolean;
      };
    } = {};
    const communityQuestions: {
      [communityId: string]: {
        communityName: string;
        count: number;
        questions: Array<{ _id: string; title: string; askedBy: string; askDateTime: Date }>;
      };
    } = {};
    const jobFairs: Array<{
      _id: string;
      title: string;
      status: string;
      startTime?: Date;
      endTime?: Date;
    }> = [];

    // Get DM messages grouped by chat
    if (user.notificationPreferences?.dmEnabled) {
      const chats = await ChatModel.find({ participants: username }).lean();
      for (const chat of chats) {
        const otherParticipant = chat.participants.find(p => p !== username);
        if (otherParticipant && chat.messages && chat.messages.length > 0) {
          const messages = await MessageModel.find({
            _id: { $in: chat.messages },
            msgFrom: otherParticipant,
            type: 'direct',
            msgDateTime: { $gt: sinceTime },
          })
            .lean()
            .exec();

          if (messages.length > 0) {
            // Check if chat is deleted by the user (check deletedBy array)
            const isDeleted = chat.deletedBy?.some(
              (deletion: { username: string }) => deletion.username === username,
            );

            dmMessages[chat._id.toString()] = {
              otherUser: otherParticipant,
              count: messages.length,
              chatId: chat._id.toString(),
              isDeleted: isDeleted || false,
            };
          }
        }
      }
    }

    // Get community questions grouped by community
    if (user.notificationPreferences?.communityEnabled) {
      const userCommunities = await CommunityModel.find({
        participants: username,
      })
        .select('_id name')
        .lean();

      for (const community of userCommunities) {
        // Communities are completely deleted from DB if deleted, so if we found it, it exists
        // No need to check for deletion here
        const questions = await QuestionModel.find({
          community: community._id,
          askedBy: { $ne: username },
          askDateTime: { $gt: sinceTime },
        })
          .select('_id title askedBy askDateTime')
          .lean()
          .exec();

        if (questions.length > 0) {
          communityQuestions[community._id.toString()] = {
            communityName: community.name || `Community ${community._id}`,
            count: questions.length,
            questions: questions.map(q => ({
              _id: q._id.toString(),
              title: q.title || '',
              askedBy: q.askedBy || '',
              askDateTime: q.askDateTime || new Date(),
            })),
          };
        }
      }
      // Note: Deleted communities won't appear in the query results, so they're automatically filtered out
    }

    // Get job fair updates
    if (user.notificationPreferences?.jobFairEnabled) {
      const jobFairsList = await JobFairModel.find({ participants: username }).lean();
      const now = new Date();
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      for (const jobFair of jobFairsList) {
        const jobFairUpdated = jobFair.updatedAt && new Date(jobFair.updatedAt) > sinceTime;
        const jobFairCreated = jobFair.createdAt && new Date(jobFair.createdAt) > sinceTime;

        // Check for upcoming job fairs starting within 24 hours
        const isUpcomingSoon =
          jobFair.status === 'upcoming' &&
          jobFair.startTime &&
          new Date(jobFair.startTime) <= oneDayFromNow &&
          new Date(jobFair.startTime) > now &&
          new Date(jobFair.startTime) > sinceTime;

        // Check for recently ended job fairs
        const recentlyEnded =
          jobFair.status === 'ended' && jobFair.endTime && new Date(jobFair.endTime) > sinceTime;

        if (jobFairCreated || jobFairUpdated || isUpcomingSoon || recentlyEnded) {
          jobFairs.push({
            _id: jobFair._id.toString(),
            title: jobFair.title || '',
            status: jobFair.status || 'upcoming',
            startTime: jobFair.startTime ? new Date(jobFair.startTime) : undefined,
            endTime: jobFair.endTime ? new Date(jobFair.endTime) : undefined,
          });
        }
      }
      // Note: Deleted job fairs won't appear in the query results, so they're automatically filtered out
    }

    return { dmMessages, communityQuestions, jobFairs };
  } catch (error) {
    return { error: `Error getting summary breakdown: ${error}` };
  }
}

export default generateSummaryNotification;
