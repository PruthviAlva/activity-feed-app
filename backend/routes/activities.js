import express from 'express';
import {
  createActivity,
  getActivities,
  debugQuery,
} from '../controllers/activityController.js';

const router = express.Router();

// Activity routes
router.post('/activities', createActivity);
router.get('/activities', getActivities);
router.get('/debug/query', debugQuery);

export default router;
