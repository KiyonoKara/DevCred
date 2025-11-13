import { useRef, useEffect } from 'react';
import useJobFairChatPage from '../../../../hooks/useJobFairChatPage';
import './index.css';

/**
 * Interface for using the job fair chat page props
 */
interface JobFairChatPageProps {
  jobFairId: string;
}

// JobFairChatPage component for live chat for all job fair participants
const JobFairChatPage = ({ jobFairId }: JobFairChatPageProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, inputMessage, setInputMessage, error, handleSendMessage } =
    useJobFairChatPage(jobFairId);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      handleSendMessage();
    }
  };

  return (
    <div className='job-fair-chat-page'>
      {error && <div className='chat-error'>{error}</div>}

      <div className='chat-messages'>
        {messages.length === 0 ? (
          <div className='chat-empty'>No messages yet. Start the conversation!</div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className='chat-message'>
              <div className='message-header'>
                <span className='message-author'>{msg.msgFrom}</span>
                <span className='message-time'>
                  {new Date(msg.msgDateTime).toLocaleTimeString()}
                </span>
              </div>
              <div className='message-content'>{msg.msg}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className='chat-input-form'>
        <div className='message-input-group'>
          <input
            type='text'
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            placeholder='Type a message...'
            className='message-input'
          />
          <button type='submit' className='send-btn' disabled={!inputMessage.trim()}>
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default JobFairChatPage;
