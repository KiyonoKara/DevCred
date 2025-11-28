/* eslint no-console: "off" */

// The server should run on localhost port 8000.
// This is where you should start writing server-side code for this application.
// startServer() is a function that starts the server
import cors from 'cors';
import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
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
import notificationController from './controllers/notification.controller';
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
  connectDatabase().then(() => {
    // Start notification summary scheduler after database is connected
    startNotificationScheduler();
  });
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

socket.on('connection', conn => {
  console.log('A user connected ->', conn.id);

  // Handle user room joining for notifications
  conn.on('joinUserRoom', (username: string) => {
    conn.join(`user_${username}`);
    console.log(`User ${username} joined their notification room`);
  });

  conn.on('leaveUserRoom', (username: string) => {
    conn.leave(`user_${username}`);
    console.log(`User ${username} left their notification room`);
  });

  // Handle chat room joining/leaving for real-time messages
  conn.on('joinChat', (chatID: string) => {
    conn.join(chatID);
    console.log(`User ${conn.id} joined chat room: ${chatID}`);
  });

  conn.on('leaveChat', (chatID: string | undefined) => {
    if (chatID) {
      conn.leave(chatID);
      console.log(`User ${conn.id} left chat room: ${chatID}`);
    }
  });

  conn.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Schedule summarized notifications
// Check every minute if it's time to send summaries
// Only run in non-test environments
let notificationSummaryInterval: NodeJS.Timeout | null = null;

/**
 * Processes summary notifications for users whose summary time matches the current time.
 * This function is extracted to be reusable and testable.
 * @internal - Exported for testing purposes only
 */
export async function processSummaryNotifications(io?: FakeSOSocket) {
  try {
    // Check if database connection exists and is connected
    if (!mongoose.connection) {
      console.error('[Notification Scheduler] Mongoose connection object is undefined');
      return;
    }

    // Check connection state: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const connectedState = 1;
    const isConnected = Number(mongoose.connection.readyState) === connectedState;
    if (!isConnected) {
      // Database not connected, skip this run
      return;
    }

    // Use provided socket or fall back to module-level socket
    const socketInstance = io || socket;

    const UserModel = (await import('./models/users.model')).default;
    const generateSummaryNotification = (await import('./services/notificationSummary.service'))
      .default;
    const { checkPendingSummaryContents } = await import('./services/notificationSummary.service');

    const now = new Date();
    // Use server local time for comparison (assumes stored summaryTime is in server local timezone)
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Find all users with summarized notifications enabled
    const users = await UserModel.find({
      'notificationPreferences.enabled': true,
      'notificationPreferences.summarized': true,
    }).select('username notificationPreferences');

    // Check pending summary contents for each user (no logging)
    for (const user of users) {
      await checkPendingSummaryContents(user.username).catch(err => {
        console.error(
          `[Notification Scheduler] Error checking pending summary for ${user.username}:`,
          err,
        );
      });
    }

    for (const user of users) {
      const summaryTime = user.notificationPreferences?.summaryTime || '09:00';

      // Parse summary time (format: "HH:MM")
      const timeParts = summaryTime.split(':');
      if (timeParts.length !== 2) {
        console.error(
          `[Notification Scheduler] Invalid summaryTime format for user ${user.username}: ${summaryTime}`,
        );
        continue;
      }

      const summaryHour = parseInt(timeParts[0], 10);
      const summaryMinute = parseInt(timeParts[1], 10);

      if (
        isNaN(summaryHour) ||
        isNaN(summaryMinute) ||
        summaryHour < 0 ||
        summaryHour > 23 ||
        summaryMinute < 0 ||
        summaryMinute > 59
      ) {
        console.error(
          `[Notification Scheduler] Invalid summaryTime values for user ${user.username}: ${summaryTime}`,
        );
        continue;
      }

      // Check if current time matches user's summary time (exact minute match)
      // Since scheduler runs every minute, we check if we're in the right minute
      const timeMatches = currentHour === summaryHour && currentMinute === summaryMinute;

      if (timeMatches) {
        try {
          const summary = await generateSummaryNotification(user.username);
          if (!('error' in summary)) {
            // Verify socket is available before emitting
            if (socketInstance && typeof socketInstance.to === 'function') {
              // Emit notification via socket to user's room
              socketInstance.to(`user_${user.username}`).emit('notification', summary);
            } else {
              console.error(
                `[Notification Scheduler] Socket instance not available, cannot emit notification for ${user.username}`,
              );
            }
          } else {
            // Only log errors (not "No new notifications" which is expected)
            if (!summary.error.includes('No new notifications')) {
              console.error(
                `[Notification Scheduler] Summary generation error for ${user.username}:`,
                summary.error,
              );
            }
          }
        } catch (error) {
          console.error(
            `[Notification Scheduler] Error generating summary for ${user.username}:`,
            error,
          );
          if (error instanceof Error) {
            console.error(`[Notification Scheduler] Error stack:`, error.stack);
          }
        }
      }
    }
  } catch (error) {
    console.error('[Notification Scheduler] ✗ Error in notification summary scheduler:', error);
    if (error instanceof Error) {
      console.error('[Notification Scheduler] Error stack:', error.stack);
    }
  }
}

function startNotificationScheduler() {
  if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
    // Run immediately on startup, then schedule to run every minute
    // Pass socket instance to ensure it's available
    processSummaryNotifications(socket).catch(err => {
      console.error('[Notification Scheduler] Error in initial run:', err);
    });

    notificationSummaryInterval = setInterval(() => {
      // Pass socket instance to ensure it's available
      processSummaryNotifications(socket).catch(err => {
        console.error('[Notification Scheduler] Error in scheduled run:', err);
      });
    }, 60000); // Check every minute
  }
}

// Export cleanup function for tests
export const cleanupNotificationScheduler = () => {
  if (notificationSummaryInterval) {
    clearInterval(notificationSummaryInterval);
    notificationSummaryInterval = null;
  }
};

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
      validateResponses: process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID,
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
app.use('/api/notification', notificationController(socket));

// Setup Swagger UI docs if not in test environment
try {
  const openApiPath = './openapi.yaml';
  if (fs.existsSync(openApiPath)) {
    const openApiDocument = yaml.parse(fs.readFileSync(openApiPath, 'utf8'));
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
    console.log('Swagger UI is available at /api/docs');
  }
} catch (e) {
  console.error('Failed to load OpenAPI documentation:', e);
}

// Export the app instance
export { app, server, startServer };
