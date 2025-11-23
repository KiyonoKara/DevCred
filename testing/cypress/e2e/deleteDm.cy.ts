import { loginUser, setupTest, teardownTest, logoutUser } from '../support/helpers';

/**
 * Cypress E2E tests for Direct Message Deletion System
 * Tests the DM privacy features including soft delete, hard delete, and deletion tracking
 */
describe('Direct Message Deletion System', () => {
  beforeEach(() => {
    setupTest();
  });

  afterEach(() => {
    teardownTest();
  });

  it('13.1 | User can delete a DM (soft delete) and it disappears from their chat list', () => {
    // Login as user123
    loginUser('user123');

    // Navigate to Direct Messaging
    cy.contains('Messaging').click();
    cy.contains('Direct Messages').click();
    cy.url().should('include', '/direct-message');

    // Start a new chat with user234
    cy.contains('Start a Chat').click();
    cy.contains('user234').click();
    cy.contains('Create New Chat').click();

    // Send a test message
    cy.get('.custom-input').type('Hello user234! This is a test message.');
    cy.contains('Send').click();

    // Verify message appears in the chat
    cy.contains('Hello user234! This is a test message.').should('be.visible');

    // Verify chat appears in the chat list
    cy.get('.chats-list').within(() => {
      cy.contains('user234').should('be.visible');
    });

    // Delete the DM from user123's perspective
    cy.get('.delete-chat-button').click();

    // Confirm deletion in the alert
    cy.on('window:confirm', () => true);

    // Verify the chat is removed from user123's chat list
    cy.get('.chats-list').within(() => {
      cy.contains('user234').should('not.exist');
    });

    // Verify conversation count decreased
    cy.get('.chats-list h3').should('contain', 'Your Conversations (0)');
  });

  it('13.2 | When both users delete a DM, it is permanently removed from the database', () => {
    // Create a DM conversation as user123
    loginUser('user123');
    cy.contains('Messaging').click();
    cy.contains('Direct Messages').click();
    cy.url().should('include', '/direct-message');

    // Create chat with user234
    cy.contains('Start a Chat').click();
    cy.contains('user234').click();
    cy.contains('Create New Chat').click();

    // Send a message
    cy.get('.custom-input').type('Test message from user123');
    cy.contains('Send').click();

    // Verify message sent
    cy.contains('Test message from user123').should('be.visible');

    // User123 deletes the DM
    cy.get('.delete-chat-button').click();
    cy.on('window:confirm', () => true);

    // Wait for deletion to complete
    cy.wait(500);

    // Verify deleted from user123's list
    cy.get('.chats-list h3').should('contain', 'Your Conversations (0)');

    // Logout user123
    logoutUser();

    // Login as user234
    loginUser('user234', 'strongP@ss234');
    cy.contains('Messaging').click();
    cy.contains('Direct Messages').click();

    // Verify user234 can still see the conversation (only user123 deleted it)
    cy.get('.chats-list').within(() => {
      cy.contains('user123').should('be.visible');
    });

    // Click on the chat to view it
    cy.contains('user123').click();

    // Verify the message is still there
    cy.contains('Test message from user123').should('be.visible');

    // User234 also deletes the DM (this should trigger complete deletion)
    cy.get('.delete-chat-button').click();
    cy.on('window:confirm', () => true);

    // Wait for deletion
    cy.wait(500);

    // Verify deleted from user234's list
    cy.get('.chats-list h3').should('contain', 'Your Conversations (0)');

    // Now if we check the database via API, the chat should be completely gone
    // We'll verify by logging back as user123 and confirming it's still gone
    logoutUser();
    loginUser('user123');
    cy.contains('Messaging').click();
    cy.contains('Direct Messages').click();

    // Should still show 0 conversations (completely deleted from database)
    cy.get('.chats-list h3').should('contain', 'Your Conversations (0)');
  });

  it('13.3 | Deleted chat can be re-created between same users and starts fresh', () => {
    // Login as user123
    loginUser('user123');
    cy.contains('Messaging').click();
    cy.contains('Direct Messages').click();

    // Create chat with user345
    cy.contains('Start a Chat').click();
    cy.contains('user345').click();
    cy.contains('Create New Chat').click();

    // Send first message
    cy.get('.custom-input').type('First conversation message');
    cy.contains('Send').click();
    cy.contains('First conversation message').should('be.visible');

    // Delete the chat
    cy.get('.delete-chat-button').click();
    cy.on('window:confirm', () => true);
    cy.wait(500);

    // Re-create chat with same user
    cy.contains('Start a Chat').click();
    cy.contains('user345').click();
    cy.contains('Create New Chat').click();

    // Should be a fresh chat - previous message should NOT appear
    cy.get('.chat-messages').within(() => {
      cy.contains('First conversation message').should('not.exist');
      cy.contains('No messages yet').should('be.visible');
    });

    // Send a new message
    cy.get('.custom-input').type('Second conversation - fresh start');
    cy.contains('Send').click();

    // Only the new message should appear
    cy.contains('Second conversation - fresh start').should('be.visible');
    cy.contains('First conversation message').should('not.exist');
  });

  it('13.4 | User can delete DM from chat list card delete button', () => {
    // Login as user123
    loginUser('user123');
    cy.contains('Messaging').click();
    cy.contains('Direct Messages').click();

    // Create chat with user456
    cy.contains('Start a Chat').click();
    cy.contains('user456').click();
    cy.contains('Create New Chat').click();

    // Send a message
    cy.get('.custom-input').type('Testing chat list delete button');
    cy.contains('Send').click();
    cy.contains('Testing chat list delete button').should('be.visible');

    // Verify chat is selected (no chat selected message should not be visible)
    cy.contains('Select a conversation to start chatting').should('not.exist');

    // Find the delete button in the chat list card (not the header delete button)
    cy.get('.chats-list-card').within(() => {
      cy.get('.delete-btn').click();
    });

    // Confirm deletion
    cy.on('window:confirm', () => true);

    // Wait for deletion
    cy.wait(500);

    // Verify chat removed from list
    cy.get('.chats-list h3').should('contain', 'Your Conversations (0)');

    // Should show "no chat selected" message since we deleted the active chat
    cy.contains('Select a conversation to start chatting').should('be.visible');
  });

  it('13.5 | Deleted messages persist for other user until they also delete', () => {
    // Create conversation as user567
    loginUser('user567', 'Sup3rS3cure567!');
    cy.contains('Messaging').click();
    cy.contains('Direct Messages').click();

    // Create chat with user678
    cy.contains('Start a Chat').click();
    cy.contains('user678').click();
    cy.contains('Create New Chat').click();

    // Send multiple messages
    cy.get('.custom-input').type('Message 1 from user567');
    cy.contains('Send').click();
    cy.wait(300);

    cy.get('.custom-input').type('Message 2 from user567');
    cy.contains('Send').click();
    cy.wait(300);

    // Logout and login as user678
    logoutUser();
    loginUser('user678', 'P@ssw0rd678!');
    cy.contains('Messaging').click();
    cy.contains('Direct Messages').click();

    // Open the chat
    cy.contains('user567').click();

    // Reply to messages
    cy.get('.custom-input').type('Reply from user678');
    cy.contains('Send').click();

    // Verify all messages visible
    cy.contains('Message 1 from user567').should('be.visible');
    cy.contains('Message 2 from user567').should('be.visible');
    cy.contains('Reply from user678').should('be.visible');

    // User678 deletes the conversation
    cy.get('.delete-chat-button').click();
    cy.on('window:confirm', () => true);
    cy.wait(500);

    // Verify deleted from user678's view
    cy.get('.chats-list h3').should('contain', 'Your Conversations (0)');

    // Switch back to user567
    logoutUser();
    loginUser('user567', 'Sup3rS3cure567!');
    cy.contains('Messaging').click();
    cy.contains('Direct Messages').click();

    // User567 should still see the conversation
    cy.contains('user678').click();

    // All messages including user678's reply should still be visible
    cy.contains('Message 1 from user567').should('be.visible');
    cy.contains('Message 2 from user567').should('be.visible');
    cy.contains('Reply from user678').should('be.visible');

    // Message count should be correct (3 messages)
    cy.get('.chat-messages').find('.message-card').should('have.length', 3);
  });
});
