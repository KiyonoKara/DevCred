import { ObjectId } from 'mongodb';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Comment,
  VoteUpdatePayload,
  PopulatedDatabaseQuestion,
  PopulatedDatabaseAnswer,
} from '../types/types';
import useUserContext from './useUserContext';
import addComment from '../services/commentService';
import { getQuestionById, deleteQuestion, updateQuestion } from '../services/questionService';
import { deleteAnswer, updateAnswer } from '../services/answerService';
import { AxiosError } from 'axios';

/**
 * Custom hook for managing the answer page's state, navigation, and real-time updates.
 *
 * @returns questionID - The current question ID retrieved from the URL parameters.
 * @returns question - The current question object with its answers, comments, and votes.
 * @returns handleNewComment - Function to handle the submission of a new comment to a question or answer.
 * @returns handleNewAnswer - Function to navigate to the "New Answer" page
 */
const useAnswerPage = () => {
  const { qid } = useParams();
  const navigate = useNavigate();

  const { user, socket } = useUserContext();
  const [questionID, setQuestionID] = useState<string>(qid || '');
  const [question, setQuestion] = useState<PopulatedDatabaseQuestion | null>(null);
  const [isOriginalPoster, setIsOriginalPoster] = useState<boolean>(false);

  /**
   * Function to handle navigation to the "New Answer" page.
   */
  const handleNewAnswer = () => {
    navigate(`/new/answer/${questionID}`);
  };

  /**
   * Function to handle editing a question.
   */
  const handleEditQuestion = async (qid: string, title: string, text: string) => {
    try {
      const updatedQuestion = await updateQuestion(qid, title, text, user.username);
      setQuestion(updatedQuestion);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error updating question:', error);
      throw error;
    }
  };

  /**
   * Function to handle deleting a question.
   */
  const handleDeleteQuestion = async (qid: string) => {
    try {
      await deleteQuestion(qid, user.username);
      navigate('/home');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error deleting question:', error);
      throw error;
    }
  };

  /**
   * Function to handle editing an answer.
   */
  const handleEditAnswer = async (aid: string, text: string) => {
    try {
      const updatedAnswer = await updateAnswer(aid, text, user.username);
      setQuestion(prevQuestion =>
        prevQuestion
          ? {
              ...prevQuestion,
              answers: prevQuestion.answers.map(a => (String(a._id) === aid ? updatedAnswer : a)),
            }
          : prevQuestion,
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error updating answer:', error);
      throw error;
    }
  };

  /**
   * Function to handle deleting an answer.
   */
  const handleDeleteAnswer = async (aid: string) => {
    try {
      await deleteAnswer(aid, user.username);
      setQuestion(prevQuestion =>
        prevQuestion
          ? {
              ...prevQuestion,
              answers: prevQuestion.answers.filter(a => String(a._id) !== aid),
            }
          : prevQuestion,
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error deleting answer:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (!qid) {
      navigate('/home');
      return;
    }

    setQuestionID(qid);
  }, [qid, navigate]);

  /**
   * Function to handle the submission of a new comment to a question or answer.
   *
   * @param comment - The comment object to be added.
   * @param targetType - The type of target being commented on, either 'question' or 'answer'.
   * @param targetId - The ID of the target being commented on.
   */
  const handleNewComment = async (
    comment: Comment,
    targetType: 'question' | 'answer',
    targetId: string | undefined,
  ) => {
    try {
      if (targetId === undefined) {
        throw new Error('No target ID provided.');
      }

      await addComment(targetId, targetType, comment);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error adding comment:', error);
    }
  };

  useEffect(() => {
    /**
     * Function to fetch the question data based on the question ID.
     */
    const fetchData = async () => {
      try {
        const res = await getQuestionById(questionID, user.username);
        // eslint-disable-next-line no-console
        console.log('Fetched question', res);
        setQuestion(res || null);
        // check if user is original poster so they can edit/delete the question
        setIsOriginalPoster(res?.askedBy === user.username);
      } catch (error) {
        const axiosError = error as AxiosError;
        // eslint-disable-next-line no-console
        console.error(
          'Error fetching question:',
          axiosError.response?.data ?? axiosError.message ?? error,
        );
      }
    };

    // eslint-disable-next-line no-console
    fetchData().catch(e => console.log(e));
  }, [questionID, user.username]);

  useEffect(() => {
    /**
     * Function to handle updates to the answers of a question.
     *
     * @param answer - The updated answer object.
     */
    const handleAnswerUpdate = ({
      qid: id,
      answer,
    }: {
      qid: ObjectId;
      answer: PopulatedDatabaseAnswer;
    }) => {
      if (String(id) === questionID) {
        setQuestion(prevQuestion =>
          prevQuestion
            ? // Creates a new Question object with the new answer appended to the end
              { ...prevQuestion, answers: [...prevQuestion.answers, answer] }
            : prevQuestion,
        );
      }
    };

    /**
     * Function to handle updates to the comments of a question or answer.
     *
     * @param result - The updated question or answer object.
     * @param type - The type of the object being updated, either 'question' or 'answer'.
     */
    const handleCommentUpdate = ({
      result,
      type,
    }: {
      result: PopulatedDatabaseQuestion | PopulatedDatabaseAnswer;
      type: 'question' | 'answer';
    }) => {
      if (type === 'question') {
        const questionResult = result as PopulatedDatabaseQuestion;

        if (String(questionResult._id) === questionID) {
          setQuestion(questionResult);
        }
      } else if (type === 'answer') {
        setQuestion(prevQuestion =>
          prevQuestion
            ? // Updates answers with a matching object ID, and creates a new Question object
              {
                ...prevQuestion,
                answers: prevQuestion.answers.map(a =>
                  a._id === result._id ? (result as PopulatedDatabaseAnswer) : a,
                ),
              }
            : prevQuestion,
        );
      }
    };

    /**
     * Function to handle updates to the views of a question.
     *
     * @param q The updated question object.
     */
    const handleViewsUpdate = (q: PopulatedDatabaseQuestion) => {
      if (String(q._id) === questionID) {
        setQuestion(q);
      }
    };

    /**
     * Function to handle vote updates for a question.
     *
     * @param voteData - The updated vote data for a question
     */
    const handleVoteUpdate = (voteData: VoteUpdatePayload) => {
      if (voteData.qid === questionID) {
        setQuestion(prevQuestion =>
          prevQuestion
            ? {
                ...prevQuestion,
                upVotes: [...voteData.upVotes],
                downVotes: [...voteData.downVotes],
              }
            : prevQuestion,
        );
      }
    };

    socket.on('answerUpdate', handleAnswerUpdate);
    socket.on('viewsUpdate', handleViewsUpdate);
    socket.on('commentUpdate', handleCommentUpdate);
    socket.on('voteUpdate', handleVoteUpdate);

    return () => {
      socket.off('answerUpdate', handleAnswerUpdate);
      socket.off('viewsUpdate', handleViewsUpdate);
      socket.off('commentUpdate', handleCommentUpdate);
      socket.off('voteUpdate', handleVoteUpdate);
    };
  }, [questionID, socket]);

  return {
    questionID,
    question,
    handleNewComment,
    handleNewAnswer,
    handleEditQuestion,
    handleDeleteQuestion,
    handleEditAnswer,
    handleDeleteAnswer,
    isOriginalPoster,
  };
};

export default useAnswerPage;
