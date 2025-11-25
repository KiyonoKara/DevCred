import {
  goToMyJobPostings,
  loginUser,
  setupTest,
  teardownTest,
} from "../support/helpers";

describe("Job Posting Creation", () => {
  beforeEach(() => {
    setupTest();
  });

  afterEach(() => {
    teardownTest();
  });

  // This is multiple tests and they are separated by comments explaining them
  it("Job Posting and Application Tests from perspectives of both recruiter and applicant", () => {
    loginUser("recruiterJohnDoe", "secUr3Pass");
    goToMyJobPostings();

    cy.get(".job_postings-create-btn").click();

    cy.get(".new-job_posting-input").eq(0).type("Senior Frontend Engineer");
    cy.get(".new-job_posting-input").eq(1).type("Amazon");
    cy.get(".new-job_posting-input").eq(2).type("$120k - $150k");
    cy.get(".new-job_posting-input")
      .eq(3)
      .type("Build and maintain React applications.");
    cy.get(".new-job_posting-input").eq(4).type("Seattle, US");
    cy.get(".new-job_posting-input").eq(5).type("12/31/2025");
    cy.get(".new-job_posting-input").eq(6).type("frontend react javascript");

    cy.contains("button.new-job_posting-type-btn", "Full-Time").click();
    cy.contains("button.new-job_posting-type-btn", "Full-Time")
      .should("have.class", "active")
      .and("not.have.class", "disabled");

    cy.get('.new-job_posting-checkbox input[type="checkbox"]')
      .as("activeCheckbox")
      .check({ force: true });

    cy.get("@activeCheckbox").should("be.checked");

    cy.get(".new-job_posting-btn").click().wait(2000);

    // See Job posting in my job postings
    cy.contains("My Job Postings").click().wait(1000);
    cy.contains(".job_posting-name", "Senior Frontend Engineer")
      .click()
      .wait(1000);

    // Change Active Status of Job
    cy.contains("Current Status: Active").should("be.visible");
    cy.contains("Change Active Status").click().wait(1000);
    cy.contains("Current Status: Inactive").should("be.visible");
    cy.contains("Change Active Status").click().wait(1000);
    cy.contains("Current Status: Active").should("be.visible");

    // View Job From Job Board
    cy.contains("Job Board").click().wait(1000);
    cy.contains(".job_posting-name", "Senior Frontend Engineer")
      .click()
      .wait(1000);
    cy.contains("Senior Frontend Engineer").should("be.visible");
    cy.contains("Amazon").should("be.visible");
    cy.contains("$120k - $150k").should("be.visible");
    cy.contains("Recruiters cannot apply to postings").should("be.visible");
    cy.contains("Seattle, US").should("be.visible");
    cy.contains("FULL-TIME").should("be.visible");

    // Apply to job posting
    cy.contains("Log out").click();
    loginUser("user123");
    cy.contains("View Profile").click().wait(1000);
    cy.contains("Go to Settings").click().wait(1000);

    cy.get('input[type="file"][accept="application/pdf"]')
      .should("exist")
      .selectFile("cypress/fixtures/fake-resume.pdf");

    cy.get('.resume-active-toggle input[type="checkbox"]').check({
      force: true,
    });

    cy.contains("button.button-primary", "Upload Resume").click().wait(1000);

    cy.contains("Job Board").click().wait(1000);
    cy.contains(".job_posting-name", "Senior Frontend Engineer")
      .click()
      .wait(1000);

    cy.on("window:alert", () => {});

    cy.contains("Apply to Position").click();
    cy.contains("You have applied to this position").should("be.visible");

    // Applicant views their application in application tab and click into job postings
    cy.contains("My Job Applications").click().wait(1000);
    cy.contains("View Job Posting").click().wait(1000);
    cy.contains("You have applied to this position").should("be.visible");
    cy.contains("Senior Frontend Engineer").should("be.visible");
    cy.contains("Amazon").should("be.visible");
    cy.contains("$120k - $150k").should("be.visible");
    cy.contains("Seattle, US").should("be.visible");
    cy.contains("FULL-TIME").should("be.visible");

    //Recruiter should be able to see applications for a job in their view
    cy.contains("Log out").click();
    loginUser("recruiterJohnDoe", "secUr3Pass");

    cy.contains("My Job Postings").click().wait(1000);
    cy.contains(".job_posting-name", "Senior Frontend Engineer").click();

    cy.contains(".job_application-name", "Applicant: user123")
      .scrollIntoView()
      .should("be.visible");

    // When recruiter deletes posting, it should return them to the empty 'My Job Postings' page
    cy.contains("Delete").click();
  });
});
