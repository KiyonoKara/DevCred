import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getUserByUsername,
  deleteUser,
  resetPassword,
  updateBiography,
  updatePrivacySettings,
} from '../services/userService';
import { SafeDatabaseUser } from '../types/types';
import useUserContext from './useUserContext';
import useResumeManager from './useResumeManager';

/**
 * A custom hook to encapsulate all logic/state for the ProfileSettings component.
 */
const useProfileSettings = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useUserContext();

  // Local state
  const [userData, setUserData] = useState<SafeDatabaseUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [editBioMode, setEditBioMode] = useState(false);
  const [newBio, setNewBio] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [privacySettings, setPrivacySettings] = useState<{
    profileVisibility: 'private' | 'public-metrics-only' | 'public-full';
    dmEnabled: boolean;
  }>({
    profileVisibility: 'public-full',
    dmEnabled: true,
  });
  const [privacySaving, setPrivacySaving] = useState(false);

  // For delete-user confirmation modal
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const [showPassword, setShowPassword] = useState(false);

  const canEditProfile =
    currentUser.username && userData?.username ? currentUser.username === userData.username : false;

  const {
    resumes,
    resumesLoading,
    resumeActionLoading,
    uploadResume,
    downloadResume,
    deleteResume,
    setActiveResume,
    maxResumeSizeBytes,
  } = useResumeManager(userData?.username);

  useEffect(() => {
    if (!username) return;

    const fetchUserData = async () => {
      try {
        setLoading(true);
        const data = await getUserByUsername(username);
        setUserData(data);
        setPrivacySettings({
          profileVisibility: data.profileVisibility || 'public-full',
          dmEnabled: data.dmEnabled ?? true,
        });
      } catch (error) {
        setErrorMessage('Error fetching user profile');
        setUserData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [username]);

  /**
   * Updates the privacy settings state when inputs change.
   */
  const handlePrivacySettingChange = <K extends 'profileVisibility' | 'dmEnabled'>(
    key: K,
    value: typeof privacySettings[K],
  ) => {
    setPrivacySettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  /**
   * Persists the privacy settings for the user.
   */
  const handleSavePrivacySettings = async () => {
    if (!username) return;
    try {
      setPrivacySaving(true);
      const updatedUser = await updatePrivacySettings(username, {
        profileVisibility: privacySettings.profileVisibility,
        dmEnabled: privacySettings.dmEnabled,
      });

      setUserData(updatedUser);
      setSuccessMessage('Privacy settings updated.');
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage('Failed to update privacy settings.');
      setSuccessMessage(null);
    } finally {
      setPrivacySaving(false);
    }
  };

  /**
   * Uploads a resume for the current user.
   * @param file The resume file to upload.
   * @param makeActive Whether to mark the uploaded resume as active.
   */
  const handleResumeUpload = async (file: File, makeActive: boolean): Promise<boolean> => {
    if (!userData?.username) return false;

    const result = await uploadResume(file, { makeActive });
    if (result.success) {
      setSuccessMessage('Resume uploaded successfully.');
      setErrorMessage(null);
    } else {
      setErrorMessage(result.error ?? 'Failed to upload resume.');
      setSuccessMessage(null);
    }

    return result.success;
  };

  /**
   * Downloads a resume by id.
   */
  const handleResumeDownload = async (resumeId: string, fileName: string) => {
    const result = await downloadResume(resumeId, fileName);
    if (!result.success) {
      setErrorMessage(result.error ?? 'Failed to download resume.');
      setSuccessMessage(null);
    }
  };

  /**
   * Deletes a resume.
   */
  const handleResumeDelete = async (resumeId: string) => {
    const result = await deleteResume(resumeId);
    if (result.success) {
      setSuccessMessage('Resume deleted.');
      setErrorMessage(null);
    } else {
      setErrorMessage(result.error ?? 'Failed to delete resume.');
      setSuccessMessage(null);
    }
  };

  /**
   * Sets an existing resume as active.
   */
  const handleSetActiveResume = async (resumeId: string) => {
    const result = await setActiveResume(resumeId);
    if (result.success) {
      setSuccessMessage('Active resume updated.');
      setErrorMessage(null);
    } else {
      setErrorMessage(result.error ?? 'Failed to update active resume.');
      setSuccessMessage(null);
    }
  };

  /**
   * Toggles the visibility of the password fields.
   */
  const togglePasswordVisibility = () => {
    setShowPassword(prevState => !prevState);
  };

  /**
   * Validate the password fields before attempting to reset.
   */
  const validatePasswords = () => {
    if (newPassword.trim() === '' || confirmNewPassword.trim() === '') {
      setErrorMessage('Please enter and confirm your new password.');
      return false;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Passwords do not match.');
      return false;
    }
    return true;
  };

  /**
   * Handler for resetting the password
   */
  const handleResetPassword = async () => {
    if (!username) return;
    if (!validatePasswords()) {
      return;
    }
    try {
      await resetPassword(username, newPassword);
      setSuccessMessage('Password reset successful!');
      setErrorMessage(null);
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      setErrorMessage('Failed to reset password.');
      setSuccessMessage(null);
    }
  };

  const handleUpdateBiography = async () => {
    if (!username) return;
    try {
      // Await the async call to update the biography
      const updatedUser = await updateBiography(username, newBio);

      // Ensure state updates occur sequentially after the API call completes
      await new Promise(resolve => {
        setUserData(updatedUser); // Update the user data
        setEditBioMode(false); // Exit edit mode
        resolve(null); // Resolve the promise
      });

      setSuccessMessage('Biography updated!');
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage('Failed to update biography.');
      setSuccessMessage(null);
    }
  };

  /**
   * Handler for deleting the user (triggers confirmation modal)
   */
  const handleDeleteUser = () => {
    if (!username) return;
    setShowConfirmation(true);
    setPendingAction(() => async () => {
      try {
        await deleteUser(username);
        setSuccessMessage(`User "${username}" deleted successfully.`);
        setErrorMessage(null);
        navigate('/');
      } catch (error) {
        setErrorMessage('Failed to delete user.');
        setSuccessMessage(null);
      } finally {
        setShowConfirmation(false);
      }
    });
  };

  const handleViewCollectionsPage = () => {
    navigate(`/collections/${username}`);
    return;
  };

  return {
    userData,
    newPassword,
    confirmNewPassword,
    setNewPassword,
    setConfirmNewPassword,
    loading,
    editBioMode,
    setEditBioMode,
    newBio,
    setNewBio,
    successMessage,
    errorMessage,
    showConfirmation,
    setShowConfirmation,
    pendingAction,
    setPendingAction,
    canEditProfile,
    showPassword,
    togglePasswordVisibility,
    handleResetPassword,
    handleUpdateBiography,
    handleDeleteUser,
    handleViewCollectionsPage,
    privacySettings,
    privacySaving,
    handlePrivacySettingChange,
    handleSavePrivacySettings,
    resumes,
    resumesLoading,
    resumeActionLoading,
    handleResumeUpload,
    handleResumeDownload,
    handleResumeDelete,
    handleSetActiveResume,
    maxResumeSizeBytes,
  };
};

export default useProfileSettings;
