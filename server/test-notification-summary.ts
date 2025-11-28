/**
 * Test script to manually trigger notification summary
 * Usage: ts-node test-notification-summary.ts <username>
 */

import mongoose from 'mongoose';
import generateSummaryNotification from './services/notificationSummary.service';

const MONGO_URL = `${process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017'}/fake_so`;

async function testSummary(username: string) {
  try {
    console.log(`Connecting to database...`);
    await mongoose.connect(MONGO_URL);
    console.log(`Connected to database`);

    console.log(`\nGenerating summary notification for user: ${username}`);
    const result = await generateSummaryNotification(username);

    if ('error' in result) {
      console.log(`\n❌ Error: ${result.error}`);
    } else {
      console.log(`\n✅ Summary notification generated successfully!`);
      console.log(`Title: ${result.title}`);
      console.log(`Message: ${result.message}`);
      console.log(`Recipient: ${result.recipient}`);
      console.log(`Type: ${result.type}`);
      console.log(`Created at: ${result.createdAt}`);
    }

    await mongoose.disconnect();
    console.log(`\nDisconnected from database`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

const username = process.argv[2];
if (!username) {
  console.error('Usage: ts-node test-notification-summary.ts <username>');
  process.exit(1);
}

testSummary(username);
