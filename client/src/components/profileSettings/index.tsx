/** @jsxRuntime classic */
import * as React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './index.css';
import useProfileSettings from '../../hooks/useProfileSettings';

const ProfileSettings: React.FC = () => {
  const {
    userData,
    loading,
    editBioMode,
    newBio,
    newPassword,
    confirmNewPassword,
    successMessage,
    errorMessage,
    showConfirmation,
    pendingAction,
    canEditProfile,
    showPassword,
    togglePasswordVisibility,
    setEditBioMode,
    setNewBio,
    setNewPassword,
    setConfirmNewPassword,
    setShowConfirmation,
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
  } = useProfileSettings();

  const [selectedResumeFile, setSelectedResumeFile] = React.useState<File | null>(null);
  const [makeActiveOnUpload, setMakeActiveOnUpload] = React.useState(true);

  const maxResumeSizeMB = React.useMemo(
    () => (maxResumeSizeBytes ? (maxResumeSizeBytes / (1024 * 1024)).toFixed(0) : '8'),
    [maxResumeSizeBytes],
  );

  const onResumeFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedResumeFile(file);
  };

  const onResumeUploadClick = async () => {
    if (!selectedResumeFile) {
      return;
    }

    const didUpload = await handleResumeUpload(selectedResumeFile, makeActiveOnUpload);
    if (didUpload) {
      setSelectedResumeFile(null);
      setMakeActiveOnUpload(true);
    }
  };

  if (loading) {
    return (
      <div className='profile-settings'>
        <div className='profile-card'>
          <h2>Loading user data...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className='profile-settings'>
      <div className='profile-card'>
        <h2>Profile</h2>

        {successMessage && <p className='success-message'>{successMessage}</p>}
        {errorMessage && <p className='error-message'>{errorMessage}</p>}

        {userData ? (
          <>
            <h4>General Information</h4>
            <p>
              <strong>Username:</strong> {userData.username}
            </p>

            {/* ---- Biography Section ---- */}
            <p>
              <strong>Biography:</strong>
            </p>
            <div className='bio-section'>
              {!editBioMode && (
                <>
                  <Markdown remarkPlugins={[remarkGfm]}>
                    {userData.biography || 'No biography yet.'}
                  </Markdown>
                  {canEditProfile && (
                    <button
                      className='button button-primary'
                      onClick={() => {
                        setEditBioMode(true);
                        setNewBio(userData.biography || '');
                      }}>
                      Edit
                    </button>
                  )}
                </>
              )}

              {editBioMode && canEditProfile && (
                <div className='bio-edit'>
                  <input
                    className='input-text'
                    type='text'
                    value={newBio}
                    onChange={e => setNewBio(e.target.value)}
                  />
                  <button className='button button-primary' onClick={handleUpdateBiography}>
                    Save
                  </button>
                  <button className='button button-danger' onClick={() => setEditBioMode(false)}>
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <p>
              <strong>Date Joined:</strong>{' '}
              {userData.dateJoined ? new Date(userData.dateJoined).toLocaleDateString() : 'N/A'}
            </p>

            <button className='button button-primary' onClick={handleViewCollectionsPage}>
              View Collections
            </button>

            {canEditProfile && (
              <>
                <h4>Privacy Settings</h4>
                <div className='privacy-section'>
                  <div className='privacy-options'>
                    <label className='privacy-option'>
                      <input
                        type='radio'
                        name='profileVisibility'
                        value='private'
                        checked={privacySettings.profileVisibility === 'private'}
                        onChange={() => handlePrivacySettingChange('profileVisibility', 'private')}
                      />
                      <div>
                        <span className='option-title'>Private</span>
                        <span className='option-description'>
                          Only you can view your profile details and activity.
                        </span>
                      </div>
                    </label>
                    <label className='privacy-option'>
                      <input
                        type='radio'
                        name='profileVisibility'
                        value='public-metrics-only'
                        checked={privacySettings.profileVisibility === 'public-metrics-only'}
                        onChange={() =>
                          handlePrivacySettingChange('profileVisibility', 'public-metrics-only')
                        }
                      />
                      <div>
                        <span className='option-title'>Public (Metrics Only)</span>
                        <span className='option-description'>
                          Others can view your overall stats and resume status, but not post
                          history.
                        </span>
                      </div>
                    </label>
                    <label className='privacy-option'>
                      <input
                        type='radio'
                        name='profileVisibility'
                        value='public-full'
                        checked={privacySettings.profileVisibility === 'public-full'}
                        onChange={() =>
                          handlePrivacySettingChange('profileVisibility', 'public-full')
                        }
                      />
                      <div>
                        <span className='option-title'>Public (Full)</span>
                        <span className='option-description'>
                          Share both your metrics and activity history with the community.
                        </span>
                      </div>
                    </label>
                  </div>
                  <label className='dm-toggle'>
                    <input
                      type='checkbox'
                      checked={privacySettings.dmEnabled}
                      onChange={event =>
                        handlePrivacySettingChange('dmEnabled', event.target.checked)
                      }
                    />
                    <span>Allow direct messages from other users</span>
                  </label>
                  <button
                    className='button button-primary'
                    onClick={handleSavePrivacySettings}
                    disabled={privacySaving}>
                    {privacySaving ? 'Saving...' : 'Save Privacy Preferences'}
                  </button>
                </div>
              </>
            )}

            {canEditProfile && (
              <>
                <h4>Resume Management</h4>
                <div className='resume-upload'>
                  <div className='file-input-wrapper'>
                    <input type='file' accept='application/pdf' onChange={onResumeFileChange} />
                    <span className='file-input-label'>
                      {selectedResumeFile
                        ? selectedResumeFile.name
                        : `Choose a PDF (max ${maxResumeSizeMB} MB)`}
                    </span>
                  </div>
                  <label className='resume-active-toggle'>
                    <input
                      type='checkbox'
                      checked={makeActiveOnUpload}
                      onChange={event => setMakeActiveOnUpload(event.target.checked)}
                    />
                    <span>Mark this upload as my active resume</span>
                  </label>
                  <button
                    className='button button-primary'
                    onClick={onResumeUploadClick}
                    disabled={!selectedResumeFile || resumeActionLoading}>
                    {resumeActionLoading ? 'Uploading...' : 'Upload Resume'}
                  </button>
                </div>

                <div className='resume-list'>
                  <h5>Your Resumes</h5>
                  {resumesLoading ? (
                    <p>Loading resumes...</p>
                  ) : resumes.length === 0 ? (
                    <p className='resume-empty'>You have not uploaded any resumes yet.</p>
                  ) : (
                    <table className='resume-table'>
                      <thead>
                        <tr>
                          <th>File Name</th>
                          <th>Uploaded</th>
                          <th>Size</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumes.map(resume => {
                          const resumeId = String(resume._id);
                          const uploadDate = resume.uploadDate
                            ? new Date(resume.uploadDate).toLocaleString()
                            : 'N/A';
                          const sizeInMB =
                            typeof resume.fileSize === 'number'
                              ? `${(resume.fileSize / (1024 * 1024)).toFixed(2)} MB`
                              : 'N/A';
                          return (
                            <tr key={resumeId}>
                              <td>{resume.fileName}</td>
                              <td>{uploadDate}</td>
                              <td>{sizeInMB}</td>
                              <td>
                                {resume.isActive ? (
                                  <span className='resume-status active'>Active</span>
                                ) : (
                                  <span className='resume-status inactive'>Inactive</span>
                                )}
                              </td>
                              <td className='resume-actions'>
                                <button
                                  className='button button-secondary'
                                  onClick={() => handleResumeDownload(resumeId, resume.fileName)}
                                  disabled={resumeActionLoading}>
                                  Download
                                </button>
                                <button
                                  className='button button-secondary'
                                  onClick={() => handleSetActiveResume(resumeId)}
                                  disabled={resume.isActive || resumeActionLoading}>
                                  {resume.isActive ? 'Currently Active' : 'Set Active'}
                                </button>
                                <button
                                  className='button button-danger'
                                  onClick={() => handleResumeDelete(resumeId)}
                                  disabled={resumeActionLoading}>
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {/* ---- Reset Password Section ---- */}
            {canEditProfile && (
              <>
                <h4>Reset Password</h4>
                <input
                  className='input-text'
                  type={showPassword ? 'text' : 'password'}
                  placeholder='New Password'
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
                <input
                  className='input-text'
                  type={showPassword ? 'text' : 'password'}
                  placeholder='Confirm New Password'
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                />
                <div className='password-actions'>
                  <button className='button button-secondary' onClick={togglePasswordVisibility}>
                    {showPassword ? 'Hide Passwords' : 'Show Passwords'}
                  </button>
                  <button className='button button-primary' onClick={handleResetPassword}>
                    Reset
                  </button>
                </div>
              </>
            )}

            {/* ---- Danger Zone (Delete User) ---- */}
            {canEditProfile && (
              <>
                <h4>Danger Zone</h4>
                <button className='button button-danger' onClick={handleDeleteUser}>
                  Delete This User
                </button>
              </>
            )}
          </>
        ) : (
          <p>No user data found. Make sure the username parameter is correct.</p>
        )}

        {/* ---- Confirmation Modal for Delete ---- */}
        {showConfirmation && (
          <div className='modal'>
            <div className='modal-content'>
              <p>
                Are you sure you want to delete user <strong>{userData?.username}</strong>? This
                action cannot be undone.
              </p>
              <div className='modal-actions'>
                <button className='button button-danger' onClick={() => pendingAction?.()}>
                  Confirm
                </button>
                <button
                  className='button button-secondary'
                  onClick={() => setShowConfirmation(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSettings;
