import { Router } from 'express';
import {
  createTicket,
  getTickets,
  getTicketById,
  reviewTriage,
  assignTicket,
  updateStatus,
  addMessage,
  setTyping,
  rerunTriage,
  getStats,
  aiSuggestReply,
  aiDraftResolution,
  aiSummarizeThread,
  findSimilarTickets,
  getActivityFeed,
} from '../controllers/ticketController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.route('/')
  .get(getTickets)
  .post(createTicket);

router.get('/stats', getStats);
router.get('/activity', getActivityFeed);

router.route('/:id')
  .get(getTicketById);

router.post('/:id/review-triage', authorize('agent', 'admin'), reviewTriage);
router.post('/:id/assign', authorize('agent', 'admin'), assignTicket);
router.patch('/:id/status', authorize('agent', 'admin'), updateStatus);
router.post('/:id/messages', addMessage);
router.post('/:id/typing', setTyping);
router.post('/:id/rerun-triage', authorize('agent', 'admin'), rerunTriage);

// AI Agent Helper routes
router.get('/:id/ai-suggest-reply', aiSuggestReply);
router.get('/:id/ai-resolution-draft', authorize('agent', 'admin'), aiDraftResolution);
router.get('/:id/ai-summarize', aiSummarizeThread);
router.get('/:id/similar', findSimilarTickets);

export default router;
