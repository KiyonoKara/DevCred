import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { validateHyperlink } from '../tool';
import { addQuestion } from '../services/questionService';
import useUserContext from './useUserContext';
import { CommunityEngagementSummary, DatabaseCommunity, Question } from '../types/types';
import { getCommunities, getUserCommunityEngagement } from '../services/communityService';

/**
 * Custom hook to handle question submission and form validation
 *
 * @returns title - The current value of the title input.
 * @returns text - The current value of the text input.
 * @returns tagNames - The current value of the tags input.
 * @returns titleErr - Error message for the title field, if any.
 * @returns textErr - Error message for the text field, if any.
 * @returns tagErr - Error message for the tag field, if any.
 * @returns postQuestion - Function to validate the form and submit a new question.
 */
const useNewQuestion = () => {
  const navigate = useNavigate();
  const { user } = useUserContext();
  const [title, setTitle] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [tagNames, setTagNames] = useState<string>('');
  const [community, setCommunity] = useState<DatabaseCommunity | null>(null);

  const [titleErr, setTitleErr] = useState<string>('');
  const [textErr, setTextErr] = useState<string>('');
  const [tagErr, setTagErr] = useState<string>('');

  const [communityList, setCommunityList] = useState<DatabaseCommunity[]>([]);
  const [topJoinedCommunities, setTopJoinedCommunities] = useState<DatabaseCommunity[]>([]);
  const [communitySearch, setCommunitySearch] = useState<string>('');
  const [searchResults, setSearchResults] = useState<DatabaseCommunity[]>([]);
  const [searchPerformed, setSearchPerformed] = useState<boolean>(false);
  const [engagedCommunities, setEngagedCommunities] = useState<CommunityEngagementSummary[]>([]);

  /**
   * Function to validate the form before submitting the question.
   *
   * @returns boolean - True if the form is valid, false otherwise.
   */
  const validateForm = (): boolean => {
    let isValid = true;

    if (!title) {
      setTitleErr('Title cannot be empty');
      isValid = false;
    } else if (title.length > 100) {
      setTitleErr('Title cannot be more than 100 characters');
      isValid = false;
    } else {
      setTitleErr('');
    }

    if (!text) {
      setTextErr('Question text cannot be empty');
      isValid = false;
    } else if (!validateHyperlink(text)) {
      setTextErr('Invalid hyperlink format.');
      isValid = false;
    } else {
      setTextErr('');
    }

    const tagnames = tagNames.split(' ').filter(tagName => tagName.trim() !== '');
    if (tagnames.length === 0) {
      setTagErr('Should have at least 1 tag');
      isValid = false;
    } else if (tagnames.length > 5) {
      setTagErr('Cannot have more than 5 tags');
      isValid = false;
    } else {
      setTagErr('');
    }

    for (const tagName of tagnames) {
      if (tagName.length > 20) {
        setTagErr('New tag length cannot be more than 20');
        isValid = false;
        break;
      }
    }

    return isValid;
  };

  /**
   * Function to post a question to the server.
   *
   * @returns title - The current value of the title input.
   */
  const postQuestion = async () => {
    if (!validateForm()) return;

    const tagnames = tagNames.split(' ').filter(tagName => tagName.trim() !== '');
    const tags = tagnames.map(tagName => ({
      name: tagName,
      description: 'user added tag',
    }));

    const question: Question = {
      title,
      text,
      tags,
      askedBy: user.username,
      askDateTime: new Date(),
      answers: [],
      upVotes: [],
      downVotes: [],
      views: [],
      comments: [],
      community: community ? community._id : null,
    };

    const res = await addQuestion(question);

    if (res && res._id) {
      navigate('/home');
    }
  };

  const handleCommunitySearch = () => {
    const term = communitySearch.trim().toLowerCase();

    if (!term) {
      setSearchResults(engagedCommunities.map(item => item.community));
      setSearchPerformed(true);
      return;
    }

    const matches = communityList.filter(com => com.name.toLowerCase().includes(term));

    setSearchResults(matches);
    setSearchPerformed(true);
  };

  const handleSelectCommunity = (selected: DatabaseCommunity | null) => {
    setCommunity(selected);
  };

  const handleClearCommunity = () => {
    setCommunity(null);
  };

  useEffect(() => {
    const fetchCommunities = async () => {
      const [allCommunities, engagement] = await Promise.all([
        getCommunities(),
        getUserCommunityEngagement(user.username, 10),
      ]);

      setCommunityList(allCommunities);
      setEngagedCommunities(engagement);

      const joined = allCommunities.filter(com => com.participants.includes(user.username));

      const engagementScores = new Map(
        engagement.map(item => [item.community._id.toString(), item.score]),
      );

      const sortedJoined = [...joined].sort((a, b) => {
        const scoreA = engagementScores.get(a._id.toString()) ?? 0;
        const scoreB = engagementScores.get(b._id.toString()) ?? 0;
        return scoreB - scoreA;
      });

      const preview = sortedJoined.slice(0, 5);

      if (preview.length > 0) {
        setTopJoinedCommunities(preview);
      } else {
        setTopJoinedCommunities(joined.slice(0, 5));
      }
    };

    fetchCommunities();
  }, [user.username]);

  return {
    title,
    setTitle,
    text,
    setText,
    tagNames,
    setTagNames,
    community,
    setCommunity,
    titleErr,
    textErr,
    tagErr,
    postQuestion,
    communitySearch,
    setCommunitySearch,
    handleCommunitySearch,
    searchResults,
    handleSelectCommunity,
    handleClearCommunity,
    searchPerformed,
    selectedCommunity: community,
    topJoinedCommunities,
  };
};

export default useNewQuestion;
