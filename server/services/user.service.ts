import UserModel from '../models/users.model';
import {
  DatabaseUser,
  SafeDatabaseUser,
  User,
  UserCredentials,
  UserResponse,
  UsersResponse,
} from '../types/types';

/**
 * Saves a new user to the database.
 *
 * @param {User} user - The user object to be saved, containing user details like username, password, etc.
 * @returns {Promise<UserResponse>} - Resolves with the saved user object (without the password) or an error message.
 */
export const saveUser = async (user: User): Promise<UserResponse> => {
  try {
    const result: DatabaseUser = await UserModel.create(user);

    if (!result) {
      throw Error('Failed to create user');
    }

    // Remove password field from returned object
    const safeUser: SafeDatabaseUser = {
      _id: result._id,
      username: result.username,
      dateJoined: result.dateJoined,
      biography: result.biography,
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
    const user: SafeDatabaseUser | null = await UserModel.findOne({ username }).select('-password');

    if (!user) {
      throw Error('User not found');
    }

    return user;
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
    const users: SafeDatabaseUser[] = await UserModel.find().select('-password');

    if (!users) {
      throw Error('Users could not be retrieved');
    }

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
    const user: SafeDatabaseUser | null = await UserModel.findOne({ username, password }).select(
      '-password',
    );

    if (!user) {
      throw Error('Authentication failed');
    }

    return user;
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
    ).select('-password');

    if (!updatedUser) {
      throw Error('Error updating user');
    }

    return updatedUser;
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
