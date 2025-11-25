import { ObjectId } from 'mongodb';
import { PopulatedDatabaseChat } from '../../../../types/types';
import './index.css';

/**
 * ChatsListCard component displays information about a chat and allows the user to select it.
 *
 * @param chat - The chat object containing details like participants and chat ID.
 * @param handleChatSelect - A function to handle the selection of a chat.
 * @param handleDeleteDM - A function to handle deletion of the DM.
 * @param isSelected - Whether this chat is currently selected.
 */
const ChatsListCard = ({
  chat,
  handleChatSelect,
  handleDeleteDM,
  isSelected,
}: {
  chat: PopulatedDatabaseChat;
  handleChatSelect: (chatID: ObjectId) => void;
  handleDeleteDM: (chatID: ObjectId) => void;
  isSelected: boolean;
}) => (
  <div
    className={`chats-list-card ${isSelected ? 'selected' : ''}`}
    onClick={() => handleChatSelect(chat._id)}>
    <div className='chat-info'>
      <p>
        <strong>Chat with:</strong> {chat.participants.join(', ')}
      </p>
    </div>
    <button
      className='delete-btn'
      onClick={e => {
        e.stopPropagation();
        handleDeleteDM(chat._id);
      }}
      title='Delete this conversation'>
      Delete
    </button>
  </div>
);

export default ChatsListCard;
