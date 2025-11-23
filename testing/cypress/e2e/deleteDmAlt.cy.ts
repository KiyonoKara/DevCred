import { 
  loginUser, 
  setupTest, 
  teardownTest, 
  goToDirectMessages,
  createDMChat,
  sendDMMessage,
  deleteActiveDMChat,
  verifyDMConversationCount,
  selectDMChatByUsername
} from '../support/helpers';

/**
 * Cypress E2E tests for Direct Message Deletion System via helper functions
 * Tests the DM privacy features
 */
describe('Direct Message Deletion System (Clean Tests)', () => {
  beforeEach(() => {
    setupTest();
  });

  afterEach(() => {
    teardownTest();
  });

  it('14.1 | Create, send, and delete a DM using helper functions', () => {
    // Login and navigate to DMs
    loginUser('user123');
    goToDirectMessages();

    // Create chat and send message
    createDMChat('user234');
    sendDMMessage('Hello from user123!');

    // Verify message sent
    cy.contains('Hello from user123!').should('be.visible');

    // Verify chat exists in list
    verifyDMConversationCount(1);

    // Delete the chat
    deleteActiveDMChat();
    cy.wait(500);

    // Verify deletion
    verifyDMConversationCount(0);
  });

  it('14.2 | Multi-user deletion flow - both users delete DM', () => {
    // User123 creates and sends message
    loginUser('user123');
    goToDirectMessages();
    createDMChat('user345');
    sendDMMessage('Test message for deletion flow');
    cy.contains('Test message for deletion flow').should('be.visible');

    // User123 deletes
    deleteActiveDMChat();
    cy.wait(500);
    verifyDMConversationCount(0);

    // Switch to user345
    cy.contains('Log out').click();
    loginUser('user345', 'P@ssw0rd345');
    goToDirectMessages();

    // User345 should still see the chat
    verifyDMConversationCount(1);
    selectDMChatByUsername('user123');
    cy.contains('Test message for deletion flow').should('be.visible');

    // User345 deletes (triggers complete removal)
    deleteActiveDMChat();
    cy.wait(500);
    verifyDMConversationCount(0);

    // Verify complete deletion by checking user123 again
    cy.contains('Log out').click();
    loginUser('user123');
    goToDirectMessages();
    verifyDMConversationCount(0);
  });
});
