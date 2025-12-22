Communities like Stack Overflow provide valuable spaces to share knowledge, solve technical problems, and allow programmers to demonstrate their expertise across different topics. This take on Stack Overflow is job-oriented with online job boards and fairs. This would allow community members to optionally make their profiles, contributions, and metrics visible so recruiters on the platform can gain a better understanding of applicants’ skills. Users can choose to participate in the Q&A community, the job board, or both. A virtual job fair feature was incorporated, where recruiters and job seekers could interact in real time through live chat sessions, Q&A panels, and coding tournaments. The platform also lets users take more control of direct messages like deleting them, uploading files, and turning DMs on/off. 

## Getting Started

Run `npm install` in the root directory to install all dependencies for the `client`, `server`, and `shared` folders.

## Codebase Folder Structure

- `client`: Contains the frontend application code, responsible for the user interface and interacting with the backend. This directory includes all React components and related assets.
- `server`: Contains the backend application code, handling the logic, APIs, and database interactions. It serves requests from the client and processes data accordingly.
- `shared`: Contains all shared type definitions that are used by both the client and server. This helps maintain consistency and reduces duplication of code between the two folders. The type definitions are imported and shared within each folder's `types/types.ts` file.

## Database Architecture

The schemas for the database are documented in the directory `server/models/schema`.
A class diagram for the schema definition is shown below:

![Class Diagram](class-diagram.png)

## API Routes

### `/answer`

| Endpoint   | Method | Description      |
| ---------- | ------ | ---------------- |
| `/addAnswer` | POST   | Add a new answer |

### `/comment`

| Endpoint    | Method | Description       |
| ----------- | ------ | ----------------- |
| `/addComment` | POST   | Add a new comment |

### `/messaging`

| Endpoint     | Method | Description           |
| ------------ | ------ | --------------------- |
| `/addMessage`  | POST   | Add a new message     |
| `/getMessages` | GET    | Retrieve all messages |

### `/question`

| Endpoint          | Method | Description                     |
| ----------------- | ------ | ------------------------------- |
| `/getQuestion`      | GET    | Fetch questions by filter       |
| `/getQuestionById/` | GET    | Fetch a specific question by ID |
| `/addQuestion`      | POST   | Add a new question              |
| `/upvoteQuestion`   | POST   | Upvote a question               |
| `/downvoteQuestion` | POST   | Downvote a question             |

### `/tag`

| Endpoint                   | Method | Description                                   |
| -------------------------- | ------ | --------------------------------------------- |
| `/getTagsWithQuestionNumber` | GET    | Fetch tags along with the number of questions |
| `/getTagByName/`             | GET    | Fetch a specific tag by name                  |

### `/user`

| Endpoint         | Method | Description                    |
| ---------------- | ------ | ------------------------------ |
| `/signup`          | POST   | Create a new user account      |
| `/login`           | POST   | Log in as a user               |
| `/resetPassword`   | PATCH  | Reset user password            |
| `/getUser/`        | GET    | Fetch user details by username |
| `/getUsers`        | GET    | Fetch all users                |
| `/deleteUser/`     | DELETE | Delete a user by username      |
| `/updateBiography` | PATCH  | Update user biography          |

### `/chat`

| Endpoint                    | Method | Description                                                                 |
| --------------------------- | ------ | --------------------------------------------------------------------------- |
| `/createChat`               | POST   | Create a new chat.                                                          |
| `/:chatId/addMessage`       | POST   | Add a new message to an existing chat.                                      |
| `/:chatId`                  | GET    | Retrieve a chat by its ID, optionally populating participants and messages. |
| `/:chatId/addParticipant`   | POST   | Add a new participant to an existing chat.                                  |
| `/getChatsByUser/:username` | GET    | Retrieve all chats for a specific user based on their username.             |

### `/games`

| Endpoint | Method | Description           |
| -------- | ------ | --------------------- |
| `/create`  | POST   | Create a new game     |
| `/join`    | POST   | Join an existing game |
| `/leave`   | POST   | Leave a game          |
| `/games`   | GET    | Retrieve all games    |

### `/api/collection`

| Endpoint                            | Method | Description                         |
| ----------------------------------- | ------ | ----------------------------------- |
| `/create`                             | POST   | Create a new collection             |
| `/delete/:collectionId`               | DELETE | Delete a collection                 |
| `/toggleSaveQuestion`                 | PATCH  | Add/remove question from collection |
| `/getCollectionsByUsername/:username` | GET    | Get collections by username         |
| `/getCollectionById/:collectionId`    | GET    | Get collection by ID                |

### `/api/community`

| Endpoint                    | Method | Description                      |
| --------------------------- | ------ | -------------------------------- |
| `/getCommunity/:communityId`  | GET    | Get a specific community         |
| `/getAllCommunities`          | GET    | Get all communities              |
| `/toggleMembership`           | POST   | Join/leave a community           |
| `/create`                     | POST   | Create a new community           |
| `/delete/:communityId`        | DELETE | Delete a community          |

## OpenAPI specification

OpenAPI specifications as given in the [`server/openapi.yaml`](./server/openapi.yaml) file should give you an idea about the overall structure of the API endpoints, the request format and the various path/query parameters required as well as the expected response formats. To see a detailed explanation of the schemas and to test the endpoint in a sandboxed environment, you can use the Swagger UI page as follows:

- Start the server as specified earlier (`cd server && npm run dev`).
- Visit `http://localhost:8000/api/docs` to see the complete API specification in a user friendly manner.
- You should be able to see and test out individual endpoints using the *Try it out* button associated with each endpoint.

The specification itself is coupled with an OpenAPI validator (present as a middleware) that validates every request and response against the provided spec document.

## Cypress Tests

Cypress tests are end-to-end tests that can help verify your implementation.

### Setup Instructions

1. Navigate to the `testing` directory:
   ```sh
   cd testing
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Create a `.env` file in the `testing/` directory with the following content:
   ```
   MONGODB_URI=mongodb://127.0.0.1:27017
   ```

4. Make sure that both the server and client are already running

5. Run Cypress tests:
   ```sh
   npx cypress open
   ```

6. In the Cypress UI that opens:
   - Select *E2E Testing*
   - Choose your browser (Chrome is preferred)
   - Click on any of the test files to run it
   - If any of the tests fail, you should be able to see the exact sequence of steps that led to the failure.

> [!NOTE]
> Running Cypress tests is optional. Cypress tests require significant system resources, and without them, the tests may be flaky. We will use these tests for grading.
