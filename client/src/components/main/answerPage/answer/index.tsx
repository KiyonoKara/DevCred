import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState } from 'react';
import CommentSection from '../../commentSection';
import EditAnswerModal from '../../editAnswerModal';
import useUserContext from '../../../../hooks/useUserContext';
import './index.css';
import { Comment, DatabaseComment } from '../../../../types/types';

/**
 * Interface representing the props for the AnswerView component.
 *
 * - text The content of the answer.
 * - ansBy The username of the user who wrote the answer.
 * - meta Additional metadata related to the answer.
 * - comments An array of comments associated with the answer.
 * - answerId The ID of the answer.
 * - handleAddComment Callback function to handle adding a new comment.
 * - handleEditAnswer Callback function to handle editing the answer.
 * - handleDeleteAnswer Callback function to handle deleting the answer.
 */
interface AnswerProps {
  text: string;
  ansBy: string;
  meta: string;
  comments: DatabaseComment[];
  answerId: string;
  handleAddComment: (comment: Comment) => void;
  handleEditAnswer: (aid: string, text: string) => Promise<void>;
  handleDeleteAnswer: (aid: string) => Promise<void>;
}

/**
 * AnswerView component that displays the content of an answer with the author's name and metadata.
 * The answer text is processed to handle hyperlinks, and a comment section is included.
 *
 * @param text The content of the answer.
 * @param ansBy The username of the answer's author.
 * @param meta Additional metadata related to the answer.
 * @param comments An array of comments associated with the answer.
 * @param answerId The ID of the answer.
 * @param handleAddComment Function to handle adding a new comment.
 * @param handleEditAnswer Function to handle editing the answer.
 * @param handleDeleteAnswer Function to handle deleting the answer.
 */
const AnswerView = ({
  text,
  ansBy,
  meta,
  comments,
  answerId,
  handleAddComment,
  handleEditAnswer,
  handleDeleteAnswer,
}: AnswerProps) => {
  const { user } = useUserContext();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isAuthor = user.username === ansBy;

  const handleEdit = async (aid: string, newText: string) => {
    await handleEditAnswer(aid, newText);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this answer? This cannot be undone.')) {
      setIsDeleting(true);
      try {
        await handleDeleteAnswer(answerId);
      } catch (error) {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className='answer right_padding'>
      <div id='answerText' className='answerText'>
        {<Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>}
      </div>
      <div className='answerAuthor'>
        <div className='answer_author'>{ansBy}</div>
        <div className='answer_question_meta'>{meta}</div>
      </div>

      {isAuthor && (
        <div className='answer-actions'>
          <button
            className='edit-btn-small'
            onClick={() => setIsEditing(true)}
            disabled={isDeleting}>
            Edit
          </button>
          <button className='delete-btn-small' onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      )}

      <CommentSection comments={comments} handleAddComment={handleAddComment} />

      {isEditing && (
        <EditAnswerModal
          answerId={answerId}
          currentText={text}
          onSave={handleEdit}
          onCancel={() => setIsEditing(false)}
        />
      )}
    </div>
  );
};

export default AnswerView;
