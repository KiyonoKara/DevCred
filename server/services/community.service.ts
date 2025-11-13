import { Types } from 'mongoose';
import CommunityModel from '../models/community.model';
import QuestionModel from '../models/questions.model';
import { Community, CommunityResponse, DatabaseCommunity, CommunityEngagementSummary } from '../types/types';

/**
 * Retrieves a community by its ID.
 *
 * @param communityId - The ID of the community to retrieve
 * @returns A Promise resolving to the community document or an error object
 */
export const getCommunity = async (communityId: string): Promise<CommunityResponse> => {
  try {
    const community = await CommunityModel.findById(communityId);
    if (!community) {
      return { error: 'Community not found' };
    }
    return community;
  } catch (err) {
    return { error: (err as Error).message };
  }
};

/**
 * Retrieves all communities from the database.
 *
 * @returns A Promise resolving to an array of community documents or an error object
 */
export const getAllCommunities = async (): Promise<DatabaseCommunity[] | { error: string }> => {
  try {
    const communities = await CommunityModel.find({});
    return communities;
  } catch (err) {
    return { error: (err as Error).message };
  }
};

/**
 * Retrieves the top communities a user engages with based on questions and answers.
 *
 * @param username - Username of the user to evaluate engagement for.
 * @param limit - Maximum number of communities to return.
 * @returns A list of communities with engagement metrics or an error object.
 */
export const getUserCommunityEngagement = async (
  username: string,
  limit = 10,
): Promise<CommunityEngagementSummary[] | { error: string }> => {
  try {
    const questionCounts = await QuestionModel.aggregate<
      { _id: Types.ObjectId; questionCount: number }
    >([
      {
        $match: {
          askedBy: username,
          community: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$community',
          questionCount: { $sum: 1 },
        },
      },
    ]);

    const answerCounts = await QuestionModel.aggregate<
      { _id: Types.ObjectId; answerCount: number }
    >([
      {
        $match: {
          community: { $ne: null },
          answers: { $exists: true, $ne: [] },
        },
      },
      {
        $lookup: {
          from: 'Answer',
          localField: 'answers',
          foreignField: '_id',
          as: 'answerDocs',
        },
      },
      { $unwind: '$answerDocs' },
      {
        $match: {
          'answerDocs.ansBy': username,
        },
      },
      {
        $group: {
          _id: '$community',
          answerCount: { $sum: 1 },
        },
      },
    ]);

    const engagementMap = new Map<
      string,
      {
        questionCount: number;
        answerCount: number;
      }
    >();

    questionCounts.forEach(entry => {
      if (!entry._id) {
        return;
      }
      engagementMap.set(entry._id.toString(), {
        questionCount: entry.questionCount,
        answerCount: 0,
      });
    });

    answerCounts.forEach(entry => {
      if (!entry._id) {
        return;
      }
      const key = entry._id.toString();
      const existing = engagementMap.get(key);
      if (existing) {
        existing.answerCount = entry.answerCount;
      } else {
        engagementMap.set(key, {
          questionCount: 0,
          answerCount: entry.answerCount,
        });
      }
    });

    if (engagementMap.size === 0) {
      return [];
    }

    const communityIds = Array.from(engagementMap.keys()).map(id => new Types.ObjectId(id));
    const communities = await CommunityModel.find({ _id: { $in: communityIds } });

    const summaries: CommunityEngagementSummary[] = communities.map(community => {
      const metrics = engagementMap.get(community._id.toString()) ?? {
        questionCount: 0,
        answerCount: 0,
      };

      const score = metrics.questionCount + metrics.answerCount;

      return {
        community,
        questionCount: metrics.questionCount,
        answerCount: metrics.answerCount,
        score,
      };
    });

    return summaries
      .filter(summary => summary.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (err) {
    return { error: `Error calculating community engagement: ${(err as Error).message}` };
  }
};

/**
 * Toggles a user's membership status in a community.
 * If the user is already a participant, they will be removed.
 * If the user is not a participant, they will be added.
 *
 * @param communityId - The ID of the community to update
 * @param username - The username of the user whose membership to toggle
 * @returns A Promise resolving to the updated community document or an error object
 */
export const toggleCommunityMembership = async (
  communityId: string,
  username: string,
): Promise<CommunityResponse> => {
  try {
    const community = await CommunityModel.findById(communityId);
    if (!community) {
      return { error: 'Community not found' };
    }

    // Check if user is the admin and trying to leave
    if (community.admin === username && community.participants.includes(username)) {
      return {
        error:
          'Community admins cannot leave their communities. Please transfer ownership or delete the community instead.',
      };
    }

    // Check if user is already a participant
    const isParticipant = community.participants.includes(username);

    let updatedCommunity: DatabaseCommunity | null;

    if (isParticipant) {
      // User is already a participant, so remove them
      updatedCommunity = await CommunityModel.findByIdAndUpdate(
        communityId,
        { $pull: { participants: username } },
        { new: true },
      );
    } else {
      // User is not a participant, so add them
      updatedCommunity = await CommunityModel.findByIdAndUpdate(
        communityId,
        { $addToSet: { participants: username } },
        { new: true },
      );
    }

    return updatedCommunity || { error: 'Failed to update community' };
  } catch (err) {
    return { error: (err as Error).message };
  }
};

/**
 * Creates a new community with the provided data.
 * The admin user is automatically added to the participants list if not already included.
 *
 * @param communityData - Object containing community details including name, description, visibility, admin, and participants
 * @returns A Promise resolving to the newly created community document or an error object
 */
export const createCommunity = async (communityData: Community): Promise<CommunityResponse> => {
  try {
    // Ensure admin is included in the participants list
    const newCommunity = new CommunityModel({
      ...communityData,
      admin: communityData.admin,
      participants: communityData.participants.includes(communityData.admin)
        ? communityData.participants
        : [...communityData.participants, communityData.admin],
      visibility: communityData.visibility || 'PUBLIC',
    });

    const savedCommunity = await newCommunity.save();
    return savedCommunity;
  } catch (err) {
    return { error: (err as Error).message };
  }
};

/**
 * Deletes a community by its ID if the requesting user is the admin.
 *
 * @param communityId - The ID of the community to delete
 * @param username - The username of the user requesting deletion
 * @returns A Promise resolving to a success object or an error object
 */
export const deleteCommunity = async (
  communityId: string,
  username: string,
): Promise<CommunityResponse> => {
  try {
    // First get the community to check admin status
    const community = await CommunityModel.findById(communityId);

    if (!community) {
      return { error: 'Community not found' };
    }

    // Check if the user is the admin
    if (community.admin !== username) {
      return { error: 'Unauthorized: Only the community admin can delete this community' };
    }

    // If user is admin, proceed with deletion
    const result = await CommunityModel.findByIdAndDelete(communityId);

    if (!result) {
      return { error: 'Community not found or already deleted' };
    }

    return result;
  } catch (err) {
    return { error: (err as Error).message };
  }
};
