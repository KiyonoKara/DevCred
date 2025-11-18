import { useState, useEffect } from 'react';
import './index.css';

interface EditQuestionModalProps {
  questionId: string;
  currentTitle: string;
  currentText: string;
  onSave: (questionId: string, title: string, text: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * Component that displays a modal that a user can use to edit an existing question.
 */
const EditQuestionModal = ({
  questionId,
  currentTitle,
  currentText,
  onSave,
  onCancel,
}: EditQuestionModalProps) => {
  const [title, setTitle] = useState(currentTitle);
  const [text, setText] = useState(currentText);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(currentTitle);
    setText(currentText);
  }, [currentTitle, currentText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !text.trim()) {
      setError('Title and text cannot be empty');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await onSave(questionId, title.trim(), text.trim());
    } catch (err) {
      setError((err as Error).message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className='modal-overlay' onClick={onCancel}>
      <div className='modal-content' onClick={e => e.stopPropagation()}>
        <div className='modal-header'>
          <h2>Edit Question</h2>
          <button className='modal-close-btn' onClick={onCancel} aria-label='Close'>
            ✕
          </button>
        </div>

        {error && <div className='modal-error'>{error}</div>}

        <form onSubmit={handleSubmit} className='edit-question-form'>
          <div className='form-group'>
            <label htmlFor='question-title'>Title</label>
            <input
              id='question-title'
              type='text'
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder='Enter question title'
              className='form-input'
              disabled={isSaving}
              maxLength={100}
            />
            <span className='char-count'>{title.length}/100</span>
          </div>

          <div className='form-group'>
            <label htmlFor='question-text'>Question Details</label>
            <textarea
              id='question-text'
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder='Enter question details'
              className='form-textarea'
              disabled={isSaving}
              rows={10}
            />
          </div>

          <div className='modal-actions'>
            <button type='button' className='btn btn-cancel' onClick={onCancel} disabled={isSaving}>
              Cancel
            </button>
            <button type='submit' className='btn btn-save' disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditQuestionModal;
