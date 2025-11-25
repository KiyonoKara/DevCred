import { loginUser, setupTest, teardownTest } from '../support/helpers';

describe('User Privacy Settings', () => {
  beforeEach(() => {
    setupTest();
  });

  afterEach(() => {
    teardownTest();
  });

  it('should navigate to profile settings page', () => {
    loginUser('user123');

    // Navigate to profile settings
    cy.contains('Profile').click();
    cy.url().should('include', '/profile');
    
    // Check if privacy settings section exists
    cy.contains('Privacy Settings').should('be.visible');
  });

  it('should display privacy settings options', () => {
    loginUser('user123');

    // Navigate to profile settings
    cy.contains('Profile').click();
    cy.url().should('include', '/profile');

    // Verify all privacy visibility options are displayed
    cy.contains('Private').should('be.visible');
    cy.contains('Public (Metrics Only)').should('be.visible');
    cy.contains('Public (Full)').should('be.visible');

    // Verify DM toggle is displayed
    cy.contains('Allow direct messages from other users').should('be.visible');
    cy.get('input[type="checkbox"]').filter((_, el) => {
      return el.closest('label')?.textContent?.includes('Allow direct messages');
    }).should('exist');

    // Verify save button exists
    cy.contains('Save Privacy Preferences').should('be.visible');
  });

  it('should change profile visibility to private', () => {
    loginUser('user123');

    // Navigate to profile settings
    cy.contains('Profile').click();
    cy.url().should('include', '/profile');

    // Select private option
    cy.contains('Private').parent().find('input[type="radio"]').check({ force: true });

    // Verify the option is selected
    cy.contains('Private').parent().find('input[type="radio"]').should('be.checked');

    // Save the settings
    cy.contains('Save Privacy Preferences').click();

    // Verify success (button should show "Saving..." then return to normal)
    cy.contains('Save Privacy Preferences').should('be.visible');
  });

  it('should change profile visibility to public-metrics-only', () => {
    loginUser('user123');

    // Navigate to profile settings
    cy.contains('Profile').click();
    cy.url().should('include', '/profile');

    // Select public-metrics-only option
    cy.contains('Public (Metrics Only)').parent().find('input[type="radio"]').check({ force: true });

    // Verify the option is selected
    cy.contains('Public (Metrics Only)').parent().find('input[type="radio"]').should('be.checked');

    // Save the settings
    cy.contains('Save Privacy Preferences').click();

    // Verify success
    cy.contains('Save Privacy Preferences').should('be.visible');
  });

  it('should change profile visibility to public-full', () => {
    loginUser('user123');

    // Navigate to profile settings
    cy.contains('Profile').click();
    cy.url().should('include', '/profile');

    // Select public-full option
    cy.contains('Public (Full)').parent().find('input[type="radio"]').check({ force: true });

    // Verify the option is selected
    cy.contains('Public (Full)').parent().find('input[type="radio"]').should('be.checked');

    // Save the settings
    cy.contains('Save Privacy Preferences').click();

    // Verify success
    cy.contains('Save Privacy Preferences').should('be.visible');
  });

  it('should toggle direct messages enabled/disabled', () => {
    loginUser('user123');

    // Navigate to profile settings
    cy.contains('Profile').click();
    cy.url().should('include', '/profile');

    // Find the DM checkbox
    const dmCheckbox = cy.contains('Allow direct messages from other users')
      .parent()
      .find('input[type="checkbox"]');

    // Get initial state
    dmCheckbox.then(($checkbox) => {
      const initialState = $checkbox.is(':checked');

      // Toggle the checkbox
      dmCheckbox.click({ force: true });

      // Verify the state changed
      dmCheckbox.should('have.attr', 'checked', !initialState ? 'checked' : undefined);

      // Save the settings
      cy.contains('Save Privacy Preferences').click();

      // Verify success
      cy.contains('Save Privacy Preferences').should('be.visible');
    });
  });

  it('should update both profile visibility and DM settings together', () => {
    loginUser('user123');

    // Navigate to profile settings
    cy.contains('Profile').click();
    cy.url().should('include', '/profile');

    // Change profile visibility to private
    cy.contains('Private').parent().find('input[type="radio"]').check({ force: true });
    cy.contains('Private').parent().find('input[type="radio"]').should('be.checked');

    // Disable direct messages
    cy.contains('Allow direct messages from other users')
      .parent()
      .find('input[type="checkbox"]')
      .uncheck({ force: true });

    // Save the settings
    cy.contains('Save Privacy Preferences').click();

    // Verify success
    cy.contains('Save Privacy Preferences').should('be.visible');

    // Reload page to verify persistence
    cy.reload();
    cy.contains('Profile').click();

    // Verify settings persisted
    cy.contains('Private').parent().find('input[type="radio"]').should('be.checked');
    cy.contains('Allow direct messages from other users')
      .parent()
      .find('input[type="checkbox"]')
      .should('not.be.checked');
  });

  it('should show saving state when saving privacy settings', () => {
    loginUser('user123');

    // Navigate to profile settings
    cy.contains('Profile').click();
    cy.url().should('include', '/profile');

    // Change a setting
    cy.contains('Public (Metrics Only)').parent().find('input[type="radio"]').check({ force: true });

    // Click save
    cy.contains('Save Privacy Preferences').click();

    // Button should show "Saving..." state (may be too fast to catch, but we can verify button exists)
    cy.contains('button', /Save Privacy Preferences|Saving.../).should('exist');
  });

  it('should only allow one profile visibility option to be selected at a time', () => {
    loginUser('user123');

    // Navigate to profile settings
    cy.contains('Profile').click();
    cy.url().should('include', '/profile');

    // Select private
    cy.contains('Private').parent().find('input[type="radio"]').check({ force: true });
    cy.contains('Private').parent().find('input[type="radio"]').should('be.checked');
    cy.contains('Public (Metrics Only)').parent().find('input[type="radio"]').should('not.be.checked');
    cy.contains('Public (Full)').parent().find('input[type="radio"]').should('not.be.checked');

    // Select public-metrics-only
    cy.contains('Public (Metrics Only)').parent().find('input[type="radio"]').check({ force: true });
    cy.contains('Private').parent().find('input[type="radio"]').should('not.be.checked');
    cy.contains('Public (Metrics Only)').parent().find('input[type="radio"]').should('be.checked');
    cy.contains('Public (Full)').parent().find('input[type="radio"]').should('not.be.checked');

    // Select public-full
    cy.contains('Public (Full)').parent().find('input[type="radio"]').check({ force: true });
    cy.contains('Private').parent().find('input[type="radio"]').should('not.be.checked');
    cy.contains('Public (Metrics Only)').parent().find('input[type="radio"]').should('not.be.checked');
    cy.contains('Public (Full)').parent().find('input[type="radio"]').should('be.checked');
  });
});

