import NotificationModel from '../models/notification.model';
import UserModel from '../models/users.model';
import JobFairModel from '../models/jobFair.model';
import QuestionModel from '../models/questions.model';
import ChatModel from '../models/chat.model';
import { createNotification } from './notification.service';
import { DatabaseNotification } from '../types/types';

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
    const user = await UserModel.findOne({ username }).select('notificationPreferences');
    if (
      !user ||
      !user.notificationPreferences?.enabled ||
      !user.notificationPreferences?.summarized
    ) {
      return { error: 'User does not have summarized notifications enabled' };
    }

    // Get the last summary notification time (or 24 hours ago if none)
    const lastSummary = await NotificationModel.findOne({
      recipient: username,
      type: 'dm', // We'll use a special type or check message content
      message: { $regex: /^Summary:/ },
    })
      .sort({ createdAt: -1 })
      .limit(1);

    const sinceTime = lastSummary?.createdAt || new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Count new DM messages
    let dmCount = 0;
    if (user.notificationPreferences.dmEnabled) {
      const chats = await ChatModel.find({ participants: username });
      for (const chat of chats) {
        const otherParticipant = chat.participants.find(p => p !== username);
        if (otherParticipant) {
          // Count messages from the other participant since last summary
          const messages = await NotificationModel.countDocuments({
            recipient: username,
            type: 'dm',
            relatedId: chat._id.toString(),
            createdAt: { $gt: sinceTime },
          });
          dmCount += messages;
        }
      }
    }

    // Count job fair updates
    let jobFairCount = 0;
    let upcomingJobFairCount = 0;
    let endedJobFairCount = 0;
    if (user.notificationPreferences.jobFairEnabled) {
      const jobFairs = await JobFairModel.find({ participants: username });
      const now = new Date();
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      for (const jobFair of jobFairs) {
        // Check for status changes to 'live' or 'ended' since last summary
        const statusNotifications = await NotificationModel.countDocuments({
          recipient: username,
          type: 'jobFair',
          relatedId: jobFair._id.toString(),
          createdAt: { $gt: sinceTime },
        });
        jobFairCount += statusNotifications;

        // Check for upcoming job fairs (starting within 24 hours)
        if (
          jobFair.status === 'upcoming' &&
          jobFair.startTime <= oneDayFromNow &&
          jobFair.startTime > now
        ) {
          upcomingJobFairCount += 1;
        }

        // Check for recently ended job fairs
        if (jobFair.status === 'ended' && jobFair.endTime > sinceTime) {
          endedJobFairCount += 1;
        }
      }
    }

    // Count community questions
    let communityQuestionCount = 0;
    const communityCounts: { [key: string]: number } = {};
    if (user.notificationPreferences.communityEnabled) {
      // Get all communities user is part of
      const communities = await QuestionModel.distinct('community', {
        community: { $ne: null },
      });

      for (const communityId of communities) {
        const questions = await QuestionModel.find({
          community: communityId,
          askedBy: { $ne: username },
          askDateTime: { $gt: sinceTime },
        });

        if (questions.length > 0) {
          // Get community name (would need to populate, but for now just count)
          const communityName = `Community ${communityId}`;
          communityCounts[communityName] = questions.length;
          communityQuestionCount += questions.length;
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
      return { error: 'No new notifications to summarize' };
    }

    const summaryMessage = `Summary: ${summaryParts.join('; ')}`;

    // Create summary notification
    const summaryNotification = await createNotification({
      recipient: username,
      type: 'dm', // Using 'dm' type for summary, could add 'summary' type later
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

export default generateSummaryNotification;
