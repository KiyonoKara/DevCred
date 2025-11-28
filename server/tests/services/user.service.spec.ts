import mongoose, { Query } from 'mongoose';
import UserModel from '../../models/users.model';
import QuestionModel from '../../models/questions.model';
import AnswerModel from '../../models/answers.model';
import {
  deleteUserByUsername,
  getUserByUsername,
  getUsersList,
  incrementUserPoint,
  loginUser,
  saveUser,
  updateUser,
  getUserActivityData,
} from '../../services/user.service';
import { SafeDatabaseUser, User, UserCredentials } from '../../types/types';
import { safeUser, user, QUESTIONS, ans1, tag1, tag2 } from '../mockData.models';

describe('User model', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('saveUser', () => {
    it('should return the saved user', async () => {
      jest
        .spyOn(UserModel, 'create')
        .mockResolvedValueOnce({ ...user, _id: mongoose.Types.ObjectId } as unknown as ReturnType<
          typeof UserModel.create<User>
        >);

      const savedUser = (await saveUser(user)) as SafeDatabaseUser;

      expect(savedUser._id).toBeDefined();
      expect(savedUser.username).toEqual(user.username);
      expect(savedUser.dateJoined).toEqual(user.dateJoined);
    });

    it('should throw an error if error when saving to database', async () => {
      jest
        .spyOn(UserModel, 'create')
        .mockRejectedValueOnce(() => new Error('Error saving document'));

      const saveError = await saveUser(user);

      expect('error' in saveError).toBe(true);
    });

    it('should return error when create returns null', async () => {
      jest.spyOn(UserModel, 'create').mockResolvedValueOnce(null as any);

      const saveError = await saveUser(user);

      expect('error' in saveError).toBe(true);
    });
  });
});

describe('getUserByUsername', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return the matching user', async () => {
    jest.spyOn(UserModel, 'findOne').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(user),
      }),
    } as unknown as Query<SafeDatabaseUser, typeof UserModel>);

    const retrievedUser = (await getUserByUsername(user.username)) as SafeDatabaseUser;

    expect(retrievedUser.username).toEqual(user.username);
    expect(retrievedUser.dateJoined).toEqual(user.dateJoined);
  });

  it('should throw an error if the user is not found', async () => {
    jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(null);

    const getUserError = await getUserByUsername(user.username);

    expect('error' in getUserError).toBe(true);
  });

  it('should return error when findOne returns null with select', async () => {
    jest.spyOn(UserModel, 'findOne').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    } as unknown as Query<SafeDatabaseUser, typeof UserModel>);

    const getUserError = await getUserByUsername(user.username);

    expect('error' in getUserError).toBe(true);
  });

  it('should throw an error if there is an error while searching the database', async () => {
    const mockError = new Error('Error finding document');
    jest.spyOn(UserModel, 'findOne').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockImplementation(() => Promise.reject(mockError)),
      }),
    } as unknown as Query<SafeDatabaseUser, typeof UserModel>);

    const getUserError = await getUserByUsername(user.username);

    expect('error' in getUserError).toBe(true);
  });
});

describe('getUsersList', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return the users', async () => {
    jest.spyOn(UserModel, 'find').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([safeUser]),
      }),
    } as unknown as Query<SafeDatabaseUser[], typeof UserModel>);

    const retrievedUsers = (await getUsersList()) as SafeDatabaseUser[];

    expect(retrievedUsers[0].username).toEqual(safeUser.username);
    expect(retrievedUsers[0].dateJoined).toEqual(safeUser.dateJoined);
  });

  it('should throw an error if the users cannot be found', async () => {
    jest.spyOn(UserModel, 'find').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    } as unknown as Query<SafeDatabaseUser[], typeof UserModel>);

    const getUsersError = await getUsersList();

    expect('error' in getUsersError).toBe(true);
  });

  it('should throw an error if there is an error while searching the database', async () => {
    const mockError = new Error('Error finding documents');
    jest.spyOn(UserModel, 'find').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockImplementation(() => Promise.reject(mockError)),
      }),
    } as unknown as Query<SafeDatabaseUser[], typeof UserModel>);

    const getUsersError = await getUsersList();

    expect('error' in getUsersError).toBe(true);
  });
});

describe('loginUser', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return the user if authentication succeeds', async () => {
    jest.spyOn(UserModel, 'findOne').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(safeUser),
      }),
    } as unknown as Query<SafeDatabaseUser, typeof UserModel>);
    jest.spyOn(UserModel, 'updateOne').mockResolvedValue({} as any);

    const credentials: UserCredentials = {
      username: user.username,
      password: user.password,
    };

    const loggedInUser = (await loginUser(credentials)) as SafeDatabaseUser;

    expect(loggedInUser.username).toEqual(user.username);
    expect(loggedInUser.dateJoined).toEqual(user.dateJoined);
    expect(UserModel.updateOne).toHaveBeenCalledWith(
      { username: user.username },
      expect.objectContaining({ lastLogin: expect.any(Date) }),
    );
  }, 10000);

  it('should return the user if the password fails', async () => {
    jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(null);

    const credentials: UserCredentials = {
      username: user.username,
      password: 'wrongPassword',
    };

    const loginError = await loginUser(credentials);

    expect('error' in loginError).toBe(true);
  });

  it('should return the user is not found', async () => {
    jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(null);

    const credentials: UserCredentials = {
      username: 'wrongUsername',
      password: user.password,
    };

    const loginError = await loginUser(credentials);

    expect('error' in loginError).toBe(true);
  });

  it('should return error when findOne returns null with select in loginUser', async () => {
    jest.spyOn(UserModel, 'findOne').mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    } as unknown as Query<SafeDatabaseUser, typeof UserModel>);

    const credentials: UserCredentials = {
      username: user.username,
      password: user.password,
    };

    const loginError = await loginUser(credentials);

    expect('error' in loginError).toBe(true);
  });
});

describe('deleteUserByUsername', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return the deleted user when deleted succesfully', async () => {
    jest.spyOn(UserModel, 'findOneAndDelete').mockReturnValue({
      select: jest.fn().mockResolvedValue(safeUser),
    } as unknown as Query<SafeDatabaseUser, typeof UserModel>);

    const deletedUser = (await deleteUserByUsername(user.username)) as SafeDatabaseUser;

    expect(deletedUser.username).toEqual(user.username);
    expect(deletedUser.dateJoined).toEqual(user.dateJoined);
  });

  it('should throw an error if the username is not found', async () => {
    jest.spyOn(UserModel, 'findOneAndDelete').mockResolvedValue(null);

    const deletedError = await deleteUserByUsername(user.username);

    expect('error' in deletedError).toBe(true);
  });

  it('should return error when findOneAndDelete returns null with select', async () => {
    jest.spyOn(UserModel, 'findOneAndDelete').mockResolvedValue(null);

    const deletedError = await deleteUserByUsername(user.username);

    expect('error' in deletedError).toBe(true);
  });

  it('should throw an error if a database error while deleting', async () => {
    jest.spyOn(UserModel, 'findOneAndDelete').mockReturnValue({
      select: jest.fn().mockRejectedValue(new Error('Error deleting document')),
    } as unknown as Query<SafeDatabaseUser, typeof UserModel>);

    const deletedError = await deleteUserByUsername(user.username);

    expect('error' in deletedError).toBe(true);
  });
});

describe('updateUser', () => {
  const updatedUser: User = {
    ...user,
    password: 'newPassword',
  };

  const safeUpdatedUser: SafeDatabaseUser = {
    _id: new mongoose.Types.ObjectId(),
    username: user.username,
    userType: 'talent',
    dateJoined: user.dateJoined,
    points: 0,
  };

  const updates: Partial<User> = {
    password: 'newPassword',
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return the updated user when updated succesfully', async () => {
    jest.spyOn(UserModel, 'findOneAndUpdate').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(safeUpdatedUser),
      }),
    } as unknown as Query<SafeDatabaseUser, typeof UserModel>);

    const result = (await updateUser(user.username, updates)) as SafeDatabaseUser;

    expect(result.username).toEqual(user.username);
    expect(result.username).toEqual(updatedUser.username);
    expect(result.dateJoined).toEqual(user.dateJoined);
    expect(result.dateJoined).toEqual(updatedUser.dateJoined);
  });

  it('should throw an error if the username is not found', async () => {
    jest.spyOn(UserModel, 'findOneAndUpdate').mockResolvedValueOnce(null);

    const updatedError = await updateUser(user.username, updates);

    expect('error' in updatedError).toBe(true);
  });

  it('should return error when findOneAndUpdate returns null with select', async () => {
    jest.spyOn(UserModel, 'findOneAndUpdate').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    } as unknown as Query<SafeDatabaseUser, typeof UserModel>);

    const updatedError = await updateUser(user.username, updates);

    expect('error' in updatedError).toBe(true);
  });

  it('should throw an error if a database error while deleting', async () => {
    jest.spyOn(UserModel, 'findOneAndUpdate').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('Error updating document')),
      }),
    } as unknown as Query<SafeDatabaseUser, typeof UserModel>);

    const updatedError = await updateUser(user.username, updates);

    expect('error' in updatedError).toBe(true);
  });

  it('should update the biography if the user is found', async () => {
    const newBio = 'This is a new biography';
    const biographyUpdates: Partial<User> = { biography: newBio };
    jest.spyOn(UserModel, 'findOneAndUpdate').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ ...safeUpdatedUser, biography: newBio }),
      }),
    } as unknown as Query<SafeDatabaseUser, typeof UserModel>);

    const result = await updateUser(user.username, biographyUpdates);

    // Check that the result is a SafeUser and the biography got updated
    if ('username' in result) {
      expect(result.biography).toEqual(newBio);
    } else {
      throw new Error('Expected a safe user, got an error object.');
    }
  });

  it('should return an error if biography update fails because user not found', async () => {
    // Simulate user not found
    jest.spyOn(UserModel, 'findOneAndUpdate').mockResolvedValueOnce(null);

    const newBio = 'No user found test';
    const biographyUpdates: Partial<User> = { biography: newBio };
    const updatedError = await updateUser(user.username, biographyUpdates);

    expect('error' in updatedError).toBe(true);
  });
});

describe('updateUser', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const updatedUser: User = {
    ...user,
    password: 'newPassword',
  };

  const safeUpdatedUser: SafeDatabaseUser = {
    _id: new mongoose.Types.ObjectId(),
    username: user.username,
    userType: 'talent',
    dateJoined: user.dateJoined,
    points: 1,
  };

  it('should return the updated user point count successfully', async () => {
    jest
      .spyOn(UserModel, 'findOneAndUpdate')
      .mockReturnValue(safeUpdatedUser as unknown as Query<SafeDatabaseUser, typeof UserModel>);

    const result = (await incrementUserPoint(user.username)) as SafeDatabaseUser;

    expect(result.points).toEqual(1);
    expect(result.username).toEqual(user.username);
    expect(result.username).toEqual(updatedUser.username);
    expect(result.dateJoined).toEqual(user.dateJoined);
    expect(result.dateJoined).toEqual(updatedUser.dateJoined);
  });

  it('should catch the unsuccessful update of a user not in the database', async () => {
    jest.spyOn(UserModel, 'findOneAndUpdate').mockRejectedValue({
      error: 'Answering user not Found',
    });

    const result = await incrementUserPoint(user.username);

    expect(result).toHaveProperty('error');
  });
});

describe('getUserActivityData', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const testUsername = 'testuser';
  const viewerUsername = 'viewer';
  const mockUserDoc = {
    username: testUsername,
    biography: 'Test biography',
    dateJoined: new Date('2024-01-01'),
    profileVisibility: 'public-full',
    points: 100,
  };

  it('should return full activity data for public-full profile when viewed by others', async () => {
    jest.spyOn(UserModel, 'findOne').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUserDoc),
      }),
    } as unknown as Query<typeof mockUserDoc, typeof UserModel>);

    jest.spyOn(QuestionModel, 'countDocuments').mockResolvedValueOnce(2);
    jest.spyOn(AnswerModel, 'countDocuments').mockResolvedValueOnce(1);

    const mockQuestions = [
      {
        ...QUESTIONS[0],
        tags: [tag1, tag2],
      },
      {
        ...QUESTIONS[1],
        tags: [tag1],
      },
    ];

    const mockAnswers = [ans1];
    const mockQuestionForAnswer = QUESTIONS[0];

    // Mock QuestionModel.find for questions
    const questionFindMock = {
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockQuestions),
    };
    jest.spyOn(QuestionModel, 'find').mockReturnValueOnce(questionFindMock as any);

    // Mock AnswerModel.find
    const answerFindMock = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockAnswers),
    };
    jest.spyOn(AnswerModel, 'find').mockReturnValueOnce(answerFindMock as any);

    // Mock QuestionModel.find for answers' related questions
    const questionForAnswerFindMock = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([mockQuestionForAnswer]),
    };
    jest.spyOn(QuestionModel, 'find').mockReturnValueOnce(questionForAnswerFindMock as any);

    const result = await getUserActivityData(testUsername, viewerUsername);

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.visibility).toBe('public-full');
      expect(result.canViewDetails).toBe(true);
      expect(result.isOwner).toBe(false);
      expect(result.questions.length).toBeGreaterThan(0);
      expect(result.answers.length).toBeGreaterThan(0);
    }
  });

  it('should return only summary for private profile when viewed by others', async () => {
    const privateUserDoc = {
      ...mockUserDoc,
      profileVisibility: 'private',
    };

    jest.spyOn(UserModel, 'findOne').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(privateUserDoc),
      }),
    } as unknown as Query<typeof privateUserDoc, typeof UserModel>);

    jest.spyOn(QuestionModel, 'countDocuments').mockResolvedValueOnce(2);
    jest.spyOn(AnswerModel, 'countDocuments').mockResolvedValueOnce(1);

    const result = await getUserActivityData(testUsername, viewerUsername);

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.visibility).toBe('private');
      expect(result.canViewDetails).toBe(false);
      expect(result.isOwner).toBe(false);
      expect(result.questions).toEqual([]);
      expect(result.answers).toEqual([]);
      expect(result.summary.totalQuestions).toBe(2);
      expect(result.summary.totalAnswers).toBe(1);
    }
  });

  it('should return only summary for public-metrics-only profile when viewed by others', async () => {
    const metricsOnlyUserDoc = {
      ...mockUserDoc,
      profileVisibility: 'public-metrics-only',
    };

    jest.spyOn(UserModel, 'findOne').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(metricsOnlyUserDoc),
      }),
    } as unknown as Query<typeof metricsOnlyUserDoc, typeof UserModel>);

    jest.spyOn(QuestionModel, 'countDocuments').mockResolvedValueOnce(2);
    jest.spyOn(AnswerModel, 'countDocuments').mockResolvedValueOnce(1);

    const result = await getUserActivityData(testUsername, viewerUsername);

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.visibility).toBe('public-metrics-only');
      expect(result.canViewDetails).toBe(false);
      expect(result.isOwner).toBe(false);
      expect(result.questions).toEqual([]);
      expect(result.answers).toEqual([]);
      expect(result.summary.totalQuestions).toBe(2);
      expect(result.summary.totalAnswers).toBe(1);
    }
  });

  it('should return full data for owner regardless of privacy settings', async () => {
    const privateUserDoc = {
      ...mockUserDoc,
      profileVisibility: 'private',
    };

    jest.spyOn(UserModel, 'findOne').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(privateUserDoc),
      }),
    } as unknown as Query<typeof privateUserDoc, typeof UserModel>);

    jest.spyOn(QuestionModel, 'countDocuments').mockResolvedValueOnce(2);
    jest.spyOn(AnswerModel, 'countDocuments').mockResolvedValueOnce(1);

    const mockQuestions = [
      {
        ...QUESTIONS[0],
        tags: [tag1, tag2],
      },
    ];

    const mockAnswers = [ans1];
    const mockQuestionForAnswer = QUESTIONS[0];

    // Mock QuestionModel.find for questions
    const questionFindMock = {
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockQuestions),
    };
    jest.spyOn(QuestionModel, 'find').mockReturnValueOnce(questionFindMock as any);

    // Mock AnswerModel.find
    const answerFindMock = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockAnswers),
    };
    jest.spyOn(AnswerModel, 'find').mockReturnValueOnce(answerFindMock as any);

    // Mock QuestionModel.find for answers' related questions
    const questionForAnswerFindMock = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([mockQuestionForAnswer]),
    };
    jest.spyOn(QuestionModel, 'find').mockReturnValueOnce(questionForAnswerFindMock as any);

    const result = await getUserActivityData(testUsername, testUsername);

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.visibility).toBe('private');
      expect(result.canViewDetails).toBe(true);
      expect(result.isOwner).toBe(true);
      expect(result.questions.length).toBeGreaterThan(0);
      expect(result.answers.length).toBeGreaterThan(0);
    }
  });

  it('should handle private profile + public biography combination', async () => {
    const privateUserWithBio = {
      ...mockUserDoc,
      profileVisibility: 'private',
      biography: 'Public biography text',
    };

    jest.spyOn(UserModel, 'findOne').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(privateUserWithBio),
      }),
    } as unknown as Query<typeof privateUserWithBio, typeof UserModel>);

    jest.spyOn(QuestionModel, 'countDocuments').mockResolvedValueOnce(0);
    jest.spyOn(AnswerModel, 'countDocuments').mockResolvedValueOnce(0);

    const result = await getUserActivityData(testUsername, viewerUsername);

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.profile.biography).toBe('Public biography text');
      expect(result.visibility).toBe('private');
      expect(result.canViewDetails).toBe(false);
      expect(result.questions).toEqual([]);
      expect(result.answers).toEqual([]);
    }
  });

  it('should return error when user is not found', async () => {
    jest.spyOn(UserModel, 'findOne').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    } as unknown as Query<null, typeof UserModel>);

    const result = await getUserActivityData('nonexistent', viewerUsername);

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('User not found');
      expect(result.statusCode).toBe(404);
    }
  });

  it('should handle empty username', async () => {
    jest.spyOn(UserModel, 'findOne').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    } as unknown as Query<null, typeof UserModel>);

    const result = await getUserActivityData('', viewerUsername);

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('User not found');
      expect(result.statusCode).toBe(404);
    }
  });

  it('should handle null viewerUsername', async () => {
    jest.spyOn(UserModel, 'findOne').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUserDoc),
      }),
    } as unknown as Query<typeof mockUserDoc, typeof UserModel>);

    jest.spyOn(QuestionModel, 'countDocuments').mockResolvedValueOnce(2);
    jest.spyOn(AnswerModel, 'countDocuments').mockResolvedValueOnce(1);

    const mockQuestions = [
      {
        ...QUESTIONS[0],
        tags: [tag1, tag2],
      },
    ];

    const mockAnswers = [ans1];
    const mockQuestionForAnswer = QUESTIONS[0];

    const questionFindMock = {
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockQuestions),
    };
    jest.spyOn(QuestionModel, 'find').mockReturnValueOnce(questionFindMock as any);

    const answerFindMock = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockAnswers),
    };
    jest.spyOn(AnswerModel, 'find').mockReturnValueOnce(answerFindMock as any);

    const questionForAnswerFindMock = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([mockQuestionForAnswer]),
    };
    jest.spyOn(QuestionModel, 'find').mockReturnValueOnce(questionForAnswerFindMock as any);

    const result = await getUserActivityData(testUsername, null as any);

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.visibility).toBe('public-full');
      expect(result.canViewDetails).toBe(true);
      expect(result.isOwner).toBe(false);
    }
  });

  it('should handle QuestionModel.countDocuments failure', async () => {
    jest.spyOn(UserModel, 'findOne').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUserDoc),
      }),
    } as unknown as Query<typeof mockUserDoc, typeof UserModel>);

    const error = new Error('Database query failed');
    jest.spyOn(QuestionModel, 'countDocuments').mockRejectedValueOnce(error);

    const result = await getUserActivityData(testUsername, viewerUsername);

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('Error occurred when retrieving user activity');
    }
  });

  it('should handle AnswerModel.countDocuments failure', async () => {
    jest.spyOn(UserModel, 'findOne').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUserDoc),
      }),
    } as unknown as Query<typeof mockUserDoc, typeof UserModel>);

    jest.spyOn(QuestionModel, 'countDocuments').mockResolvedValueOnce(2);
    const error = new Error('Database query failed');
    jest.spyOn(AnswerModel, 'countDocuments').mockRejectedValueOnce(error);

    const result = await getUserActivityData(testUsername, viewerUsername);

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('Error occurred when retrieving user activity');
    }
  });

  it('should handle QuestionModel.find failure when fetching questions', async () => {
    jest.spyOn(UserModel, 'findOne').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUserDoc),
      }),
    } as unknown as Query<typeof mockUserDoc, typeof UserModel>);

    jest.spyOn(QuestionModel, 'countDocuments').mockResolvedValueOnce(2);
    jest.spyOn(AnswerModel, 'countDocuments').mockResolvedValueOnce(1);

    const error = new Error('Database query failed');
    const questionFindMock = {
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockRejectedValue(error),
    };
    jest.spyOn(QuestionModel, 'find').mockReturnValueOnce(questionFindMock as any);

    const result = await getUserActivityData(testUsername, viewerUsername);

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('Error occurred when retrieving user activity');
    }
  });

  it('should handle AnswerModel.find failure when fetching answers', async () => {
    jest.spyOn(UserModel, 'findOne').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUserDoc),
      }),
    } as unknown as Query<typeof mockUserDoc, typeof UserModel>);

    jest.spyOn(QuestionModel, 'countDocuments').mockResolvedValueOnce(2);
    jest.spyOn(AnswerModel, 'countDocuments').mockResolvedValueOnce(1);

    const mockQuestions = [
      {
        ...QUESTIONS[0],
        tags: [tag1, tag2],
      },
    ];

    const questionFindMock = {
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockQuestions),
    };
    jest.spyOn(QuestionModel, 'find').mockReturnValueOnce(questionFindMock as any);

    const error = new Error('Database query failed');
    const answerFindMock = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockRejectedValue(error),
    };
    jest.spyOn(AnswerModel, 'find').mockReturnValueOnce(answerFindMock as any);

    const result = await getUserActivityData(testUsername, viewerUsername);

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('Error occurred when retrieving user activity');
    }
  });

  it('should handle QuestionModel.find failure when fetching questions for answers', async () => {
    jest.spyOn(UserModel, 'findOne').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUserDoc),
      }),
    } as unknown as Query<typeof mockUserDoc, typeof UserModel>);

    jest.spyOn(QuestionModel, 'countDocuments').mockResolvedValueOnce(2);
    jest.spyOn(AnswerModel, 'countDocuments').mockResolvedValueOnce(1);

    const mockQuestions = [
      {
        ...QUESTIONS[0],
        tags: [tag1, tag2],
      },
    ];

    const questionFindMock = {
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockQuestions),
    };
    jest.spyOn(QuestionModel, 'find').mockReturnValueOnce(questionFindMock as any);

    const mockAnswers = [ans1];
    const answerFindMock = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockAnswers),
    };
    jest.spyOn(AnswerModel, 'find').mockReturnValueOnce(answerFindMock as any);

    // Mock QuestionModel.find for answers' related questions - this one fails
    const error = new Error('Database query failed');
    const questionForAnswerFindMock = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockRejectedValue(error),
    };
    jest.spyOn(QuestionModel, 'find').mockReturnValueOnce(questionForAnswerFindMock as any);

    const result = await getUserActivityData(testUsername, viewerUsername);

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('Error occurred when retrieving user activity');
    }
  });

  it('should handle empty answers array', async () => {
    jest.spyOn(UserModel, 'findOne').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUserDoc),
      }),
    } as unknown as Query<typeof mockUserDoc, typeof UserModel>);

    jest.spyOn(QuestionModel, 'countDocuments').mockResolvedValueOnce(2);
    jest.spyOn(AnswerModel, 'countDocuments').mockResolvedValueOnce(0);

    const mockQuestions = [
      {
        ...QUESTIONS[0],
        tags: [tag1, tag2],
      },
    ];

    const questionFindMock = {
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockQuestions),
    };
    jest.spyOn(QuestionModel, 'find').mockReturnValueOnce(questionFindMock as any);

    // Empty answers array
    const answerFindMock = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    };
    jest.spyOn(AnswerModel, 'find').mockReturnValueOnce(answerFindMock as any);

    const result = await getUserActivityData(testUsername, viewerUsername);

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.answers).toEqual([]);
      expect(result.questions.length).toBeGreaterThan(0);
    }
  });

  it('should handle undefined username', async () => {
    jest.spyOn(UserModel, 'findOne').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    } as unknown as Query<null, typeof UserModel>);

    const result = await getUserActivityData(undefined as any, viewerUsername);

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('User not found');
      expect(result.statusCode).toBe(404);
    }
  });

  it('should handle QuestionModel.find populate failure for tags', async () => {
    jest.spyOn(UserModel, 'findOne').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUserDoc),
      }),
    } as unknown as Query<typeof mockUserDoc, typeof UserModel>);

    jest.spyOn(QuestionModel, 'countDocuments').mockResolvedValueOnce(2);
    jest.spyOn(AnswerModel, 'countDocuments').mockResolvedValueOnce(0);

    // Mock QuestionModel.find with populate that fails
    const error = new Error('Populate failed');
    const questionFindMock = {
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockRejectedValue(error),
    };
    jest.spyOn(QuestionModel, 'find').mockReturnValueOnce(questionFindMock as any);

    const result = await getUserActivityData(testUsername, viewerUsername);

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('Error occurred when retrieving user activity');
    }
  });
});
