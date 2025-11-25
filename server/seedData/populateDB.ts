/* eslint-disable no-console */
import 'dotenv/config';
import mongoose from 'mongoose';

import AnswerModel from '../models/answers.model';
import CommentModel from '../models/comments.model';
import MessageModel from '../models/messages.model';
import QuestionModel from '../models/questions.model';
import TagModel from '../models/tags.model';
import UserModel from '../models/users.model';

import answersResolver from './resolvers/answer';
import identityResolver from './resolvers/identity';
import questionsResolver from './resolvers/question';

import { type InsertedDocs } from '../types/populate';

import CollectionModel from '../models/collection.model';
import CommunityModel from '../models/community.model';
import { collectionDependencies } from './collectionDependencies';
import collectionsResolver from './resolvers/collection';
import { computeImportOrder, loadJSON, processCollection } from './utils';

// Compute the import order based on dependencies
const IMPORT_ORDER = computeImportOrder(collectionDependencies);

const collectionMapping = {
  user: {
    model: UserModel,
    resolver: identityResolver,
  },
  comment: {
    model: CommentModel,
    resolver: identityResolver,
  },
  answer: {
    model: AnswerModel,
    resolver: answersResolver,
  },
  question: {
    model: QuestionModel,
    resolver: questionsResolver,
  },
  tag: {
    model: TagModel,
    resolver: identityResolver,
  },
  message: {
    model: MessageModel,
    resolver: identityResolver,
  },
  community: {
    model: CommunityModel,
    resolver: identityResolver,
  },
  collection: {
    model: CollectionModel,
    resolver: collectionsResolver,
  },
};

console.log('Using computed import order:', IMPORT_ORDER);

/**
 * Main function to populate the database with sample data.
 * Connects to MongoDB, processes collections in a specific order,
 * resolves references between documents, and inserts them.
 * @returns {Promise<void>} - A promise that resolves when database population is complete.
 * @throws {Error} - If MongoDB URI is not set or if there's an error during processing.
 */
async function main(args: string[]) {
  const mongoURL = process.env.MONGODB_URI || args[0];
  if (!mongoURL) {
    throw new Error('MONGODB_URI not set in environment variables');
  }

  if (!mongoURL.startsWith('mongodb')) {
    throw new Error('ERROR: You need to specify a valid MongoDB URL as the first argument');
  }

  await mongoose.connect(`${mongoURL}/fake_so`);

  console.log('Connected to MongoDB');

  const insertedDocs: InsertedDocs = {};

  // Load all collections' JSON
  const loadPromises = IMPORT_ORDER.map(async collectionName => {
    const docs = await loadJSON(collectionName);
    return { collectionName, docs };
  });

  const loadedData = await Promise.all(loadPromises);
  const docsMap = new Map();
  loadedData.forEach(({ collectionName, docs }) => {
    docsMap.set(collectionName, docs);
  });

  // Loop through collections and handle each with command design pattern
  for (const collectionName of IMPORT_ORDER) {
    console.log(`Processing ${collectionName}...`);

    insertedDocs[collectionName] = new Map();
    const docs = docsMap.get(collectionName) || {};

    const { model, resolver } = collectionMapping[collectionName];

    /* eslint-disable @typescript-eslint/no-explicit-any */
    await processCollection<any, any, any>(model, resolver, docs, insertedDocs, collectionName);
  }

  await mongoose.disconnect();
  console.log('\nPopulation complete. Disconnected from MongoDB.');
}

main(process.argv.slice(2)).catch(err => {
  console.error('Error populating database:', err);
  process.exit(1);
});
