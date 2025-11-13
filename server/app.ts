/* eslint no-console: "off" */

// The server should run on localhost port 8000.
// This is where you should start writing server-side code for this application.
// startServer() is a function that starts the server
import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import * as OpenApiValidator from 'express-openapi-validator';
import * as fs from 'fs';
import * as http from 'http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yaml';

import answerController from './controllers/answer.controller';
import chatController from './controllers/chat.controller';
import collectionController from './controllers/collection.controller';
import commentController from './controllers/comment.controller';
import communityController from './controllers/community.controller';
import gameController from './controllers/game.controller';
import jobApplicationController from './controllers/jobApplication.controller';
import jobFairController from './controllers/jobFair.controller';
import jobPostingController from './controllers/jobPosting.controller';
import messageController from './controllers/message.controller';
import questionController from './controllers/question.controller';
import resumeController from './controllers/resume.controller';
import tagController from './controllers/tag.controller';
import userController from './controllers/user.controller';
import userMetricsController from './controllers/userMetrics.controller';
import { FakeSOSocket } from './types/types';

const MONGO_URL = `${process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017'}/fake_so`;
const PORT = parseInt(process.env.PORT || '8000');

const app = express();
const server = http.createServer(app);
// allow requests from the local dev client or the production client only
const CLIENT_ORIGIN = process.env.CLIENT_URL || 'http://localhost:4530';

const socket: FakeSOSocket = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: CLIENT_ORIGIN,
    credentials: true,
  },
});

function connectDatabase() {
  return mongoose.connect(MONGO_URL).catch(err => console.log('MongoDB connection error: ', err));
}

function startServer() {
  connectDatabase();
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

socket.on('connection', socket => {
  console.log('A user connected ->', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

process.on('SIGINT', async () => {
  await mongoose.disconnect();
  socket.close();

  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());
// needs to be registered before the middleware
app.use('/api/resume', resumeController(socket));

try {
  app.use(
    OpenApiValidator.middleware({
      apiSpec: './openapi.yaml',
      validateRequests: true,
      validateResponses: true,
      ignoreUndocumented: true, // Only validate paths defined in the spec
      formats: {
        'object-id': (v: string) => /^[0-9a-fA-F]{24}$/.test(v),
      },
    }),
  );

  // Custom Error Handler for express-openapi-validator errors
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    // Format error response for validation errors
    if (err.status && err.errors) {
      res.status(err.status).json({
        message: 'Request Validation Failed',
        errors: err.errors,
      });
    } else {
      next(err); // Pass through other errors
    }
  });
} catch (e) {
  console.error('Failed to load or initialize OpenAPI Validator:', e);
}

app.use('/api/question', questionController(socket));
app.use('/api/tags', tagController());
app.use('/api/answer', answerController(socket));
app.use('/api/comment', commentController(socket));
app.use('/api/message', messageController(socket));
app.use('/api/user', userController(socket));
app.use('/api/chat', chatController(socket));
app.use('/api/games', gameController(socket));
app.use('/api/collection', collectionController(socket));
app.use('/api/community', communityController(socket));
app.use('/api/jobfair', jobFairController(socket));
app.use('/api/jobposting', jobPostingController(socket));
app.use('/api/jobapplication', jobApplicationController(socket));
app.use('/api/metrics', userMetricsController(socket));

const openApiDocument = yaml.parse(fs.readFileSync('./openapi.yaml', 'utf8'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
console.log('Swagger UI is available at /api/docs');

// Export the app instance
export { app, server, startServer };
