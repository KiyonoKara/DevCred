import { JSX, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginContext from '../contexts/LoginContext';
import UserContext from '../contexts/UserContext';
import { FakeSOSocket, SafeDatabaseUser } from '../types/types';
import Login from './auth/login';
import Signup from './auth/signup';
import Layout from './layout';
import AnswerPage from './main/answerPage';
import UsersListPage from './main/usersListPage';
import ProfileSettings from './profileSettings';
import UserActivityPage from './main/userActivityPage';
import AllGamesPage from './main/games/allGamesPage';
import GamePage from './main/games/gamePage';
import AllCommunitiesPage from './main/communities/allCommunitiesPage';
import NewCommunityPage from './main/communities/newCommunityPage';
import CommunityPage from './main/communities/communityPage';
import AllCollectionsPage from './main/collections/allCollectionsPage';
import CollectionPage from './main/collections/collectionPage';
import NewCollectionPage from './main/collections/newCollectionPage';
import DirectMessage from './main/directMessage';
import TalentApplicationView from './main/jobs/jobApplicationsPage';
import JobBoard from './main/jobs/jobBoardPage';
import RecruiterJobPostings from './main/jobs/jobPostingsPage';
import NewJobPostingPage from './main/jobs/newJobPostingPage';
import RecruiterJobPostingsViewer from './main/jobs/recruiterJobPostingViewerPage';
import ApplicantJobPostingsViewer from './main/jobs/talentJobPostingViewerPage';
import JobFairListPage from './main/jobs/jobFairListPage';
import JobFairDetailPage from './main/jobs/jobFairDetailPage';
import RecruiterJobFairCreationPage from './main/jobs/recruiterJobFairCreationPage';
import MessagingPage from './main/messagingPage';
import NewAnswerPage from './main/newAnswer';
import NewQuestionPage from './main/newQuestion';
import QuestionPage from './main/questionPage';
import TagPage from './main/tagPage';

const ProtectedRoute = ({
  user,
  socket,
  children,
}: {
  user: SafeDatabaseUser | null;
  socket: FakeSOSocket | null;
  children: JSX.Element;
}) => {
  if (!user || !socket) {
    return <Navigate to='/' />;
  }

  return <UserContext.Provider value={{ user, socket }}>{children}</UserContext.Provider>;
};

/**
 * Represents the main component of the application.
 * It manages the state for search terms and the main title.
 */
const FakeStackOverflow = ({ socket }: { socket: FakeSOSocket | null }) => {
  const [user, setUser] = useState<SafeDatabaseUser | null>(null);

  return (
    <LoginContext.Provider value={{ setUser }}>
      <Routes>
        {/* Public Route */}
        <Route path='/' element={<Login />} />
        <Route path='/signup' element={<Signup />} />
        {/* Protected Routes */}
        {
          <Route
            element={
              <ProtectedRoute user={user} socket={socket}>
                <Layout />
              </ProtectedRoute>
            }>
            <Route path='/home' element={<QuestionPage />} />
            <Route path='tags' element={<TagPage />} />
            <Route path='/messaging' element={<MessagingPage />} />
            <Route path='/messaging/direct-message' element={<DirectMessage />} />
            <Route path='/question/:qid' element={<AnswerPage />} />
            <Route path='/new/question' element={<NewQuestionPage />} />
            <Route path='/new/answer/:qid' element={<NewAnswerPage />} />
            <Route path='/users' element={<UsersListPage />} />
            <Route path='/user/:username/settings' element={<ProfileSettings />} />
            <Route path='/user/:username' element={<UserActivityPage />} />
            <Route path='/new/collection' element={<NewCollectionPage />} />
            <Route path='/collections/:username' element={<AllCollectionsPage />} />
            <Route path='/collections/:username/:collectionId' element={<CollectionPage />} />
            <Route path='/games' element={<AllGamesPage />} />
            <Route path='/games/:gameID' element={<GamePage />} />
            <Route path='/communities' element={<AllCommunitiesPage />} />
            <Route path='/new/community' element={<NewCommunityPage />} />
            <Route path='/communities/:communityID' element={<CommunityPage />} />
            <Route path='/recruiters/jobposting/:username' element={<RecruiterJobPostings />} />
            <Route path='/recruiters/jobposting/new' element={<NewJobPostingPage />} />
            <Route
              path='/recruiters/jobposting/:jobId/applications'
              element={<RecruiterJobPostingsViewer />}
            />
            <Route path='/talent/jobposting/:jobId' element={<ApplicantJobPostingsViewer />} />
            <Route path='/jobBoard' element={<JobBoard />} />
            <Route path='/jobapplication/:username' element={<TalentApplicationView />} />
            <Route path='/jobfairs' element={<JobFairListPage />} />
            <Route path='/jobfairs/:jobFairId' element={<JobFairDetailPage />} />
            <Route path='/recruiters/jobfairs/new' element={<RecruiterJobFairCreationPage />} />
          </Route>
        }
      </Routes>
    </LoginContext.Provider>
  );
};

export default FakeStackOverflow;
