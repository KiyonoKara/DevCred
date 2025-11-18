import { getMetaData } from '../../../tool';
import { useState } from 'react';
import AnswerView from './answer';
import AnswerHeader from './header';
import { Comment } from '../../../types/types';
import './index.css';
import QuestionBody from './questionBody';
import VoteComponent from '../voteComponent';
import CommentSection from '../commentSection';
import EditQuestionModal from '../editQuestionModal';
import useAnswerPage from '../../../hooks/useAnswerPage';

/**
 * AnswerPage component that displays the full content of a question along with its answers.
 * It also includes the functionality to vote, ask a new question, and post a new answer.
 */
const AnswerPage = () => {
  const {
    questionID,
    question,
    handleNewComment,
    handleNewAnswer,
    handleEditQuestion,
    handleDeleteQuestion,
    handleEditAnswer,
    handleDeleteAnswer,
    isOriginalPoster,
  } = useAnswerPage();

  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleQuestionEdit = async (qid: string, title: string, text: string) => {
    await handleEditQuestion(qid, title, text);
    setIsEditingQuestion(false);
  };

  const handleQuestionDelete = async () => {
    if (window.confirm('Are you sure you want to delete this question? This cannot be undone.')) {
      setIsDeleting(true);
      try {
        await handleDeleteQuestion(questionID);
      } catch (error) {
        setIsDeleting(false);
      }
    }
  };

  if (!question) {
    return <div className='right_padding'>Loading question…</div>;
  }

  // eslint-disable-next-line no-console
  console.log('Rendering question', question.title);

  return (
    <>
      <VoteComponent question={question} />
      <AnswerHeader ansCount={question.answers.length} title={question.title} />

      {isOriginalPoster && (
        <div className='question-actions'>
          <button
            className='edit-btn'
            onClick={() => setIsEditingQuestion(true)}
            disabled={isDeleting}>
            Edit
          </button>
          <button className='delete-btn' onClick={handleQuestionDelete} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      )}

      <QuestionBody
        views={question.views.length}
        text={question.text}
        askby={question.askedBy}
        meta={getMetaData(new Date(question.askDateTime))}
      />
      <CommentSection
        comments={question.comments}
        handleAddComment={(comment: Comment) => handleNewComment(comment, 'question', questionID)}
      />
      {question.answers.map(a => (
        <AnswerView
          key={String(a._id)}
          text={a.text}
          ansBy={a.ansBy}
          meta={getMetaData(new Date(a.ansDateTime))}
          comments={a.comments}
          answerId={String(a._id)}
          handleAddComment={(comment: Comment) =>
            handleNewComment(comment, 'answer', String(a._id))
          }
          handleEditAnswer={handleEditAnswer}
          handleDeleteAnswer={handleDeleteAnswer}
        />
      ))}
      <button
        className='bluebtn ansButton'
        onClick={() => {
          handleNewAnswer();
        }}>
        Answer Question
      </button>

      {isEditingQuestion && (
        <EditQuestionModal
          questionId={questionID}
          currentTitle={question.title}
          currentText={question.text}
          onSave={handleQuestionEdit}
          onCancel={() => setIsEditingQuestion(false)}
        />
      )}
    </>
  );
};

export default AnswerPage;
