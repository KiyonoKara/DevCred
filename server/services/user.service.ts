import UserModel from '../models/users.model';
import QuestionModel from '../models/questions.model';
import AnswerModel from '../models/answers.model';
import TagModel from '../models/tags.model';
import {
  SafeDatabaseUser,
  User,
  UserCredentials,
  UserResponse,
  UsersResponse,
  DatabaseQuestion,
  DatabaseAnswer,
  DatabaseTag,
} from '../types/types';

// TODO: Add in recruiter validation checks + Ability to sign up as recruiter

/**
 * Saves a new user to the database.
 *
 * @param {User} user - The user object to be saved, containing user details like username, password, etc.
 * @returns {Promise<UserResponse>} - Resolves with the saved user object (without the password) or an error message.
 */
export const saveUser = async (user: User): Promise<UserResponse> => {
  try {
    const result = await UserModel.create(user);

    if (!result) {
      throw Error('Failed to create user');
    }

    // Convert to plain object and remove password field
    const resultObj = result.toObject ? result.toObject() : result;
    const safeUser: SafeDatabaseUser = {
      _id: resultObj._id,
      username: resultObj.username,
      dateJoined: resultObj.dateJoined,
      biography: resultObj.biography,
      userType: resultObj.userType,
      profileVisibility: resultObj.profileVisibility,
      dmEnabled: resultObj.dmEnabled,
      notificationPreferences: resultObj.notificationPreferences || {
        enabled: true,
        summarized: false,
        summaryTime: '09:00',
        dmEnabled: true,
        jobFairEnabled: true,
        communityEnabled: true,
      },
    };

    return safeUser;
  } catch (error) {
    return { error: `Error occurred when saving user: ${error}` };
  }
};

/**
 * Retrieves a user from the database by their username.
 *
 * @param {string} username - The username of the user to find.
 * @returns {Promise<UserResponse>} - Resolves with the found user object (without the password) or an error message.
 */
export const getUserByUsername = async (username: string): Promise<UserResponse> => {
  try {
    const user = await UserModel.findOne({ username }).select('-password').lean();

    if (!user) {
      throw Error('User not found');
    }

    // Ensure notificationPreferences exists with defaults if missing
    if (!user.notificationPreferences) {
      user.notificationPreferences = {
        enabled: true,
        summarized: false,
        summaryTime: '09:00',
        dmEnabled: true,
        jobFairEnabled: true,
        communityEnabled: true,
      };
    }

    // Ensure all required fields have defaults
    const safeUser: SafeDatabaseUser = {
      _id: user._id,
      username: user.username,
      dateJoined: user.dateJoined,
      biography: user.biography || '',
      userType: user.userType || 'talent',
      profileVisibility: user.profileVisibility || 'public-full',
      dmEnabled: user.dmEnabled !== undefined ? user.dmEnabled : true,
      notificationPreferences: user.notificationPreferences,
      activityHistory: user.activityHistory || [],
      activeResumeId: user.activeResumeId,
    };

    return safeUser;
  } catch (error) {
    return { error: `Error occurred when finding user: ${error}` };
  }
};

/**
 * Retrieves all users from the database.
 * Users documents are returned in the order in which they were created, oldest to newest.
 *
 * @returns {Promise<UsersResponse>} - Resolves with the found user objects (without the passwords) or an error message.
 */
export const getUsersList = async (): Promise<UsersResponse> => {
  try {
    const users: SafeDatabaseUser[] = await UserModel.find().select('-password').lean();

    if (!users) {
      throw Error('Users could not be retrieved');
    }

    // Ensure notificationPreferences exists with defaults if missing for all users
    users.forEach(user => {
      const userObj = user as SafeDatabaseUser & { notificationPreferences?: unknown };
      if (!userObj.notificationPreferences) {
        userObj.notificationPreferences = {
          enabled: true,
          summarized: false,
          summaryTime: '09:00',
          dmEnabled: true,
          jobFairEnabled: true,
          communityEnabled: true,
        };
      }
    });

    return users;
  } catch (error) {
    return { error: `Error occurred when finding users: ${error}` };
  }
};

/**
 * Authenticates a user by verifying their username and password.
 *
 * @param {UserCredentials} loginCredentials - An object containing the username and password.
 * @returns {Promise<UserResponse>} - Resolves with the authenticated user object (without the password) or an error message.
 */
export const loginUser = async (loginCredentials: UserCredentials): Promise<UserResponse> => {
  const { username, password } = loginCredentials;

  try {
    const user = await UserModel.findOne({ username, password }).select('-password').lean();

    if (!user) {
      throw Error('Authentication failed');
    }

    // Ensure notificationPreferences exists with defaults if missing
    if (!user.notificationPreferences) {
      user.notificationPreferences = {
        enabled: true,
        summarized: false,
        summaryTime: '09:00',
        dmEnabled: true,
        jobFairEnabled: true,
        communityEnabled: true,
      };
    }

    // Ensure all required fields have defaults
    const safeUser: SafeDatabaseUser = {
      _id: user._id,
      username: user.username,
      dateJoined: user.dateJoined,
      biography: user.biography || '',
      userType: user.userType || 'talent',
      profileVisibility: user.profileVisibility || 'public-full',
      dmEnabled: user.dmEnabled !== undefined ? user.dmEnabled : true,
      notificationPreferences: user.notificationPreferences,
      activityHistory: user.activityHistory || [],
      activeResumeId: user.activeResumeId,
    };

    return safeUser;
  } catch (error) {
    return { error: `Error occurred when authenticating user: ${error}` };
  }
};

/**
 * Deletes a user from the database by their username.
 *
 * @param {string} username - The username of the user to delete.
 * @returns {Promise<UserResponse>} - Resolves with the deleted user object (without the password) or an error message.
 */
export const deleteUserByUsername = async (username: string): Promise<UserResponse> => {
  try {
    const deletedUser: SafeDatabaseUser | null = await UserModel.findOneAndDelete({
      username,
    }).select('-password');

    if (!deletedUser) {
      throw Error('Error deleting user');
    }

    return deletedUser;
  } catch (error) {
    return { error: `Error occurred when finding user: ${error}` };
  }
};

/**
 * Updates user information in the database.
 *
 * @param {string} username - The username of the user to update.
 * @param {Partial<User>} updates - An object containing the fields to update and their new values.
 * @returns {Promise<UserResponse>} - Resolves with the updated user object (without the password) or an error message.
 */
export const updateUser = async (
  username: string,
  updates: Partial<User>,
): Promise<UserResponse> => {
  try {
    const updatedUser: SafeDatabaseUser | null = await UserModel.findOneAndUpdate(
      { username },
      { $set: updates },
      { new: true },
    )
      .select('-password')
      .lean();

    if (!updatedUser) {
      throw Error('Error updating user');
    }

    // Convert to plain object and ensure notificationPreferences exists with defaults if missing
    const userObj = updatedUser as SafeDatabaseUser & { notificationPreferences?: unknown };
    if (!userObj.notificationPreferences) {
      userObj.notificationPreferences = {
        enabled: true,
        summarized: false,
        summaryTime: '09:00',
        dmEnabled: true,
        jobFairEnabled: true,
        communityEnabled: true,
      };
    }

    return userObj as SafeDatabaseUser;
  } catch (error) {
    return { error: `Error occurred when updating user: ${error}` };
  }
};

/**
 * Updates user privacy settings (profile visibility and DM preferences).
 *
 * @param {string} username - The username of the user to update.
 * @param {Object} privacySettings - The privacy settings to update.
 * @param {string} privacySettings.profileVisibility - The profile visibility setting.
 * @param {boolean} privacySettings.dmEnabled - Whether DMs are enabled.
 * @returns {Promise<UserResponse>} - Resolves with the updated user object or an error message.
 */
export const updateUserPrivacySettings = async (
  username: string,
  privacySettings: {
    profileVisibility?: 'private' | 'public-metrics-only' | 'public-full';
    dmEnabled?: boolean;
  },
): Promise<UserResponse> => {
  return updateUser(username, privacySettings);
};

type QuestionWithTags = Omit<DatabaseQuestion, 'tags'> & {
  tags?: unknown[];
};

type AnswerWithComments = Omit<DatabaseAnswer, 'comments'> & {
  comments?: unknown[];
};

export interface UserActivityQuestionSummary {
  id: string;
  title: string;
  askDateTime: Date;
  viewsCount: number;
  answersCount: number;
  tags: { _id: string; name: string }[];
}

export interface UserActivityAnswerSummary {
  id: string;
  text: string;
  ansDateTime: Date;
  commentsCount: number;
  question: {
    id: string;
    title: string;
    askDateTime: Date;
    askedBy: string;
    viewsCount: number;
  } | null;
}

export interface UserActivityResult {
  profile: {
    username: string;
    biography: string;
    dateJoined: Date | null;
    profileVisibility: 'private' | 'public-metrics-only' | 'public-full';
  };
  summary: {
    totalQuestions: number;
    totalAnswers: number;
  };
  visibility: 'private' | 'public-metrics-only' | 'public-full';
  canViewDetails: boolean;
  isOwner: boolean;
  questions: UserActivityQuestionSummary[];
  answers: UserActivityAnswerSummary[];
}

const mapQuestionSummary = (question: QuestionWithTags): UserActivityQuestionSummary => {
  const tags = Array.isArray(question.tags)
    ? question.tags
        .filter(
          (tag): tag is DatabaseTag =>
            typeof (tag as DatabaseTag).name === 'string' && Boolean((tag as DatabaseTag)._id),
        )
        .map(tag => ({ _id: String(tag._id), name: tag.name }))
    : [];

  return {
    id: String(question._id),
    title: question.title,
    askDateTime: question.askDateTime,
    viewsCount: question.views ? question.views.length : 0,
    answersCount: question.answers ? question.answers.length : 0,
    tags,
  };
};

const mapAnswerSummary = (
  answer: AnswerWithComments,
  relatedQuestion: DatabaseQuestion | undefined,
): UserActivityAnswerSummary => ({
  id: String(answer._id),
  text: answer.text,
  ansDateTime: answer.ansDateTime,
  commentsCount: Array.isArray(answer.comments) ? answer.comments.length : 0,
  question: relatedQuestion
    ? {
        id: String(relatedQuestion._id),
        title: relatedQuestion.title,
        askDateTime: relatedQuestion.askDateTime,
        askedBy: relatedQuestion.askedBy,
        viewsCount: relatedQuestion.views ? relatedQuestion.views.length : 0,
      }
    : null,
});

/**
 * Retrieves detailed activity information for a user, respecting their profile visibility settings.
 *
 * @param username - The username whose activity should be fetched.
 * @param viewerUsername - The username of the viewer requesting the data (used for privacy checks).
 * @returns Aggregated question and answer activity for the user.
 */
export const getUserActivityData = async (
  username: string,
  viewerUsername?: string,
): Promise<UserActivityResult | { error: string; statusCode?: number }> => {
  try {
    const userDoc = await UserModel.findOne({ username })
      .select('username biography dateJoined profileVisibility')
      .lean();

    if (!userDoc) {
      return { error: 'User not found', statusCode: 404 };
    }

    const profileVisibility: 'private' | 'public-metrics-only' | 'public-full' =
      userDoc.profileVisibility ?? 'public-full';
    const isOwner = viewerUsername === username;
    const canViewDetails = isOwner || profileVisibility === 'public-full';

    const [totalQuestions, totalAnswers] = await Promise.all([
      QuestionModel.countDocuments({ askedBy: username }),
      AnswerModel.countDocuments({ ansBy: username }),
    ]);

    if (!canViewDetails && profileVisibility === 'private') {
      return {
        profile: {
          username: userDoc.username,
          biography: userDoc.biography ?? '',
          dateJoined: userDoc.dateJoined ?? null,
          profileVisibility,
        },
        summary: {
          totalQuestions,
          totalAnswers,
        },
        visibility: profileVisibility,
        canViewDetails,
        isOwner,
        questions: [],
        answers: [],
      };
    }

    const questionDocs: QuestionWithTags[] = canViewDetails
      ? ((await QuestionModel.find({ askedBy: username })
          .populate<{ tags: DatabaseTag[] }>({
            path: 'tags',
            model: TagModel,
            select: ['name'],
          })
          .select(['title', 'askDateTime', 'views', 'answers', 'tags'])
          .lean()) as QuestionWithTags[])
      : [];

    const questionSummaries = questionDocs.map(question => mapQuestionSummary(question));

    let answerSummaries: UserActivityAnswerSummary[] = [];

    if (canViewDetails) {
      const answerDocs = await AnswerModel.find({ ansBy: username })
        .select(['text', 'ansDateTime', 'comments'])
        .lean<AnswerWithComments[]>();

      if (answerDocs.length > 0) {
        const answerIds = answerDocs.map(answer => answer._id);
        const answerIdStrings = new Set(answerIds.map(id => String(id)));
        const questionDocsForAnswers = await QuestionModel.find({
          answers: { $in: answerIds },
        })
          .select(['_id', 'title', 'askDateTime', 'askedBy', 'views', 'answers'])
          .lean();

        const questionByAnswerId = new Map<string, DatabaseQuestion>();

        questionDocsForAnswers.forEach(question => {
          question.answers?.forEach(answerId => {
            const key = String(answerId);
            if (answerIdStrings.has(key)) {
              questionByAnswerId.set(key, question as DatabaseQuestion);
            }
          });
        });

        answerSummaries = answerDocs.map(answer =>
          mapAnswerSummary(
            answer as DatabaseAnswer,
            questionByAnswerId.get(String(answer._id)) as DatabaseQuestion | undefined,
          ),
        );
      }
    }

    return {
      profile: {
        username: userDoc.username,
        biography: userDoc.biography ?? '',
        dateJoined: userDoc.dateJoined ?? null,
        profileVisibility,
      },
      summary: {
        totalQuestions,
        totalAnswers,
      },
      visibility: profileVisibility,
      canViewDetails,
      isOwner,
      questions: questionSummaries,
      answers: answerSummaries,
    };
  } catch (error) {
    return { error: `Error occurred when retrieving user activity: ${error}` };
  }
};

/**
 * Checks if a user accepts direct messages.
 *
 * @param {string} username - The username to check DM permissions for.
 * @returns {Promise<boolean>} - Resolves with true if DMs are enabled, false otherwise.
 */
export const canReceiveDirectMessages = async (username: string): Promise<boolean> => {
  try {
    const user = await UserModel.findOne({ username }).select('dmEnabled');
    // Default to true if not set
    return user ? user.dmEnabled !== false : true;
  } catch (error) {
    // Assume false on error for privacy
    return false;
  }
};

/**
 * Gets the profile visibility for a user.
 *
 * @param {string} username - The username to check profile visibility.
 * @returns {Promise<'private' | 'public-metrics-only' | 'public-full'>} - The user's profile visibility setting.
 */
export const getUserProfileVisibility = async (
  username: string,
): Promise<'private' | 'public-metrics-only' | 'public-full'> => {
  try {
    const user = await UserModel.findOne({ username }).select('profileVisibility');
    // Default to full public visibility if not set
    return user?.profileVisibility || 'public-full';
  } catch (error) {
    // Default to private on error for privacy
    return 'private';
  }
};
