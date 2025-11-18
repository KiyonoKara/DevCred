import { useState, useEffect } from 'react';
import '../editQuestionModal/index.css';

interface EditAnswerModalProps {
  answerId: string;
  currentText: string;
  onSave: (answerId: string, text: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * Component that displays a model that a user can use to edit an existing answer.
 */
const EditAnswerModal = ({ answerId, currentText, onSave, onCancel }: EditAnswerModalProps) => {
  const [text, setText] = useState(currentText);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(currentText);
  }, [currentText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!text.trim()) {
      setError('Answer text cannot be empty');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await onSave(answerId, text.trim());
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
          <h2>Edit Answer</h2>
          <button className='modal-close-btn' onClick={onCancel} aria-label='Close'>
            ✕
          </button>
        </div>

        {error && <div className='modal-error'>{error}</div>}

        <form onSubmit={handleSubmit} className='edit-question-form'>
          <div className='form-group'>
            <label htmlFor='answer-text'>Answer</label>
            <textarea
              id='answer-text'
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder='Enter your answer'
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

export default EditAnswerModal;
