const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const {
  createWorkspace,
  getMyWorkspaces,
  getWorkspaceDetails,
  inviteMember,
  removeMember,
  updateCustomRules,
  getWorkspaceLeaderboard
} = require('../controllers/workspaceController');

const router = express.Router();

router.use(protect);

router.post('/', createWorkspace);
router.get('/', getMyWorkspaces);
router.get('/:id', getWorkspaceDetails);
router.get('/:id/leaderboard', getWorkspaceLeaderboard);

// Protect workspace administration routes with role verification
router.post('/:id/invite', checkRole(['admin']), inviteMember);
router.delete('/:id/members/:userId', checkRole(['admin']), removeMember);
router.put('/:id/rules', checkRole(['admin']), updateCustomRules);

module.exports = router;
