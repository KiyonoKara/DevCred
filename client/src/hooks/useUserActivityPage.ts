import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useUserContext from './useUserContext';
import {
  getUserActivity,
  UserActivityAnswerSummary,
  UserActivityQuestionSummary,
  UserActivityResponse,
} from '../services/userService';
import { deleteQuestion } from '../services/questionService';
import { deleteAnswer } from '../services/answerService';

type QuestionSortOption = 'newest' | 'oldest' | 'mostViewed';
type AnswerSortOption = 'newest' | 'oldest';

const PREVIEW_COUNT = 3;
const PAGE_SIZE = 8;
const MAX_VISIBLE_PAGES = 8;

const parseDateValue = (value?: string) => (value ? new Date(value).getTime() : 0);

const sortByDateDesc = <T extends { askDateTime?: string; ansDateTime?: string }>(a: T, b: T) => {
  const aDate = a.askDateTime ?? a.ansDateTime;
  const bDate = b.askDateTime ?? b.ansDateTime;
  return parseDateValue(bDate) - parseDateValue(aDate);
};

const sortByDateAsc = <T extends { askDateTime?: string; ansDateTime?: string }>(a: T, b: T) => {
  const aDate = a.askDateTime ?? a.ansDateTime;
  const bDate = b.askDateTime ?? b.ansDateTime;
  return parseDateValue(aDate) - parseDateValue(bDate);
};

const useUserActivityPage = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useUserContext();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<UserActivityResponse | null>(null);

  const [questionSort, setQuestionSort] = useState<QuestionSortOption>('newest');
  const [answerSort, setAnswerSort] = useState<AnswerSortOption>('newest');

  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [showAllAnswers, setShowAllAnswers] = useState(false);
  const [questionPage, setQuestionPage] = useState(1);
  const [answerPage, setAnswerPage] = useState(1);

  useEffect(() => {
    if (!username) {
      setError('No username provided');
      setLoading(false);
      return;
    }

    const fetchActivity = async () => {
      try {
        setLoading(true);
        const data = await getUserActivity(username, currentUser.username);
        setActivity(data);
        setError(null);
      } catch (err) {
        setError('Unable to load user activity at this time.');
        setActivity(null);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [username, currentUser.username]);

  const sortedQuestions: UserActivityQuestionSummary[] = useMemo(() => {
    if (!activity?.questions) {
      return [];
    }

    const list = [...activity.questions];

    switch (questionSort) {
      case 'oldest':
        return list.sort((a, b) => sortByDateAsc(a, b));
      case 'mostViewed':
        return list.sort((a, b) => b.viewsCount - a.viewsCount);
      case 'newest':
      default:
        return list.sort((a, b) => sortByDateDesc(a, b));
    }
  }, [activity?.questions, questionSort]);

  const sortedAnswers: UserActivityAnswerSummary[] = useMemo(() => {
    if (!activity?.answers) {
      return [];
    }

    const list = [...activity.answers];

    switch (answerSort) {
      case 'oldest':
        return list.sort((a, b) => sortByDateAsc(a, b));
      case 'newest':
      default:
        return list.sort((a, b) => sortByDateDesc(a, b));
    }
  }, [activity?.answers, answerSort]);

  useEffect(() => {
    setQuestionPage(1);
  }, [activity?.questions?.length, showAllQuestions]);

  useEffect(() => {
    setAnswerPage(1);
  }, [activity?.answers?.length, showAllAnswers]);

  const paginatedQuestions = useMemo(() => {
    if (!sortedQuestions) {
      return [];
    }
    if (!showAllQuestions) {
      return sortedQuestions.slice(0, PREVIEW_COUNT);
    }
    const start = (questionPage - 1) * PAGE_SIZE;
    return sortedQuestions.slice(start, start + PAGE_SIZE);
  }, [sortedQuestions, showAllQuestions, questionPage]);

  const paginatedAnswers = useMemo(() => {
    if (!sortedAnswers) {
      return [];
    }
    if (!showAllAnswers) {
      return sortedAnswers.slice(0, PREVIEW_COUNT);
    }
    const start = (answerPage - 1) * PAGE_SIZE;
    return sortedAnswers.slice(start, start + PAGE_SIZE);
  }, [sortedAnswers, showAllAnswers, answerPage]);

  const questionTotalPages = useMemo(() => {
    if (!sortedQuestions.length) {
      return 1;
    }
    return Math.max(1, Math.ceil(sortedQuestions.length / PAGE_SIZE));
  }, [sortedQuestions.length]);

  const answerTotalPages = useMemo(() => {
    if (!sortedAnswers.length) {
      return 1;
    }
    return Math.max(1, Math.ceil(sortedAnswers.length / PAGE_SIZE));
  }, [sortedAnswers.length]);

  const handleGoToSettings = () => {
    if (!activity?.profile.username) {
      return;
    }
    navigate(`/user/${activity.profile.username}/settings`);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!activity?.isOwner) {
      setError('You are not allowed to delete this question.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      await deleteQuestion(questionId, currentUser.username);
      setActivity(prev => {
        if (!prev) {
          return prev;
        }
        const updatedQuestions = prev.questions.filter(question => question.id !== questionId);
        return {
          ...prev,
          questions: updatedQuestions,
          summary: {
            ...prev.summary,
            totalQuestions: Math.max(prev.summary.totalQuestions - 1, 0),
          },
        };
      });
      setError(null);
    } catch {
      setError('Failed to delete question. Please try again.');
    }
  };
  const handleDeleteAnswer = async (answerId: string) => {
    if (!activity?.isOwner) {
      setError('You are not allowed to delete this answer.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this answer?')) {
      return;
    }

    try {
      await deleteAnswer(answerId, currentUser.username);
      setActivity(prev => {
        if (!prev) {
          return prev;
        }
        const updatedAnswers = prev.answers.filter(answer => answer.id !== answerId);
        return {
          ...prev,
          answers: updatedAnswers,
          summary: {
            ...prev.summary,
            totalAnswers: Math.max(prev.summary.totalAnswers - 1, 0),
          },
        };
      });
      setError(null);
    } catch {
      setError('Failed to delete answer. Please try again.');
    }
  };

  return {
    loading,
    error,
    activity,
    questionSort,
    answerSort,
    setQuestionSort,
    setAnswerSort,
    sortedQuestions: paginatedQuestions,
    sortedAnswers: paginatedAnswers,
    handleGoToSettings,
    canEditProfile: activity?.isOwner ?? false,
    canViewDetails: activity?.canViewDetails ?? false,
    showAllQuestions,
    setShowAllQuestions,
    showAllAnswers,
    setShowAllAnswers,
    questionMeta: {
      totalItems: sortedQuestions.length,
      totalPages: questionTotalPages,
      currentPage: questionPage,
      onPageChange: setQuestionPage,
      showDirectInput: questionTotalPages > MAX_VISIBLE_PAGES,
    },
    answerMeta: {
      totalItems: sortedAnswers.length,
      totalPages: answerTotalPages,
      currentPage: answerPage,
      onPageChange: setAnswerPage,
      showDirectInput: answerTotalPages > MAX_VISIBLE_PAGES,
    },
    handleDeleteQuestion,
    handleDeleteAnswer,
  };
};

export default useUserActivityPage;

