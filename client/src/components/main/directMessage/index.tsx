import { ObjectId } from 'mongodb';
import useDirectMessage from '../../../hooks/useDirectMessage';
import MessageCard from '../messageCard';
import UsersListPage from '../usersListPage';
import ChatsListCard from './chatsListCard';
import './index.css';

/**
 * DirectMessage component renders a page for direct messaging between users.
 * It includes a list of users, a chat window to send and receive messages,
 * and DM management features like deletion and visibility controls.
 * Implements stories 2.3 (DM preferences), 2.5 (start DM from profile), 2.7 (DM deletion).
 */
const DirectMessage = () => {
  const {
    selectedChat,
    chatToCreate,
    chats,
    newMessage,
    setNewMessage,
    showCreatePanel,
    setShowCreatePanel,
    handleSendMessage,
    handleChatSelect,
    handleUserSelect,
    handleCreateChat,
    handleDeleteDM,
    canSendDMToUser,
    handleDownloadResume,
    error,
    isLoading,
    targetUserDMEnabled,
  } = useDirectMessage();

  const handleCreateChatWithCheck = async () => {
    if (chatToCreate) {
      // Check if user can receive DMs before creating
      await canSendDMToUser(chatToCreate);
      handleCreateChat();
    }
  };

  const handleDeleteWithConfirm = (chatId: ObjectId) => {
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      handleDeleteDM(chatId);
    }
  };

  return (
    <>
      <div className='create-panel'>
        <button
          className='custom-button'
          onClick={() => setShowCreatePanel(prevState => !prevState)}
          disabled={isLoading}>
          {showCreatePanel ? 'Hide Create Chat Panel' : 'Start a Chat'}
        </button>

        {error && <div className='direct-message-error'>{error}</div>}

        {showCreatePanel && (
          <>
            <p>Selected user: {chatToCreate || 'None'}</p>

            {/* Show DM enabled status when user is selected */}
            {chatToCreate && targetUserDMEnabled === false && (
              <div className='dm-disabled-warning'>{chatToCreate} has disabled direct messages</div>
            )}
            {chatToCreate && targetUserDMEnabled === true && (
              <div className='dm-enabled-status'>Accepts direct messages</div>
            )}

            {isLoading && <div className='loading-indicator'>Checking user...</div>}

            <button
              className='custom-button'
              onClick={handleCreateChatWithCheck}
              disabled={!chatToCreate || isLoading || targetUserDMEnabled === false}>
              Create New Chat
            </button>
            <UsersListPage handleUserSelect={handleUserSelect} />
          </>
        )}
      </div>

      <div
        className='direct-message-container'
        data-active-chat-id={selectedChat ? String(selectedChat._id) : ''}>
        <div className='chats-list'>
          <h3>Your Conversations ({chats.length})</h3>
          {chats.length === 0 ? (
            <p className='no-chats'>No conversations yet. Start a chat!</p>
          ) : (
            chats.map(chat => (
              <ChatsListCard
                key={String(chat._id)}
                chat={chat}
                handleChatSelect={handleChatSelect}
                handleDeleteDM={handleDeleteWithConfirm}
                isSelected={selectedChat?._id === chat._id}
              />
            ))
          )}
        </div>

        <div className='chat-container'>
          {selectedChat ? (
            <>
              <div className='chat-header'>
                <h2>Chat with: {selectedChat.participants.join(', ')}</h2>
                <button
                  className='delete-chat-button'
                  onClick={() => handleDeleteWithConfirm(selectedChat._id)}
                  title='Delete this conversation'>
                  Delete
                </button>
              </div>

              <div className='chat-messages'>
                {selectedChat.messages.length === 0 ? (
                  <p className='no-messages'>No messages yet. Start the conversation!</p>
                ) : (
                  selectedChat.messages.map(message =>
                    message.type === 'resume' ? (
                      <button
                        type='button'
                        className='unstyled-button'
                        onClick={() => handleDownloadResume(message)}>
                        <MessageCard key={String(message._id)} message={message} />{' '}
                      </button>
                    ) : (
                      <MessageCard key={String(message._id)} message={message} />
                    ),
                  )
                )}
              </div>

              <div className='message-input'>
                <input
                  className='custom-input'
                  type='text'
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder='Type a message... (Press Enter to send)'
                  disabled={isLoading}
                />
                <button
                  className='custom-button'
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isLoading}>
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className='no-chat-selected'>
              <h2>Select a conversation to start chatting</h2>
              <p>or create a new chat using the panel above</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DirectMessage;
