const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const TeamKnowledgeBase = require('../models/TeamKnowledgeBase');
const Workspace = require('../models/Workspace');

const router = express.Router();

router.use(protect);

// Helper middleware to check if user is admin in workspace
const checkWorkspaceAdmin = async (req, res, next) => {
  try {
    const { id } = req.params; // workspace ID
    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    const isOwner = workspace.ownerId.toString() === req.user._id.toString();
    const member = workspace.members.find(m => m.userId.toString() === req.user._id.toString());
    const isAdmin = isOwner || (member && member.role === 'admin');

    if (!isAdmin) {
      return res.status(403).json({ message: 'Access denied: Administrator role required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Authorization check failed' });
  }
};

// GET /api/workspaces/:id/knowledge-base - Get wiki entries for a workspace
router.get('/:id/knowledge-base', async (req, res) => {
  try {
    const { id } = req.params;
    const { category, search } = req.query;

    const kb = await TeamKnowledgeBase.findOne({ workspaceId: id });
    if (!kb) {
      return res.json([]);
    }

    let entries = kb.entries || [];

    // Filter by category
    if (category) {
      entries = entries.filter(e => e.category === category);
    }

    // Filter by search string (fuzzy title/description match)
    if (search) {
      const q = search.toLowerCase();
      entries = entries.filter(e => 
        e.title.toLowerCase().includes(q) || 
        e.description.toLowerCase().includes(q)
      );
    }

    // Sort: Pinned first, then by occurrence count desc, then by date desc
    entries.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (b.occurrenceCount !== a.occurrenceCount) {
        return b.occurrenceCount - a.occurrenceCount;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(entries);
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    res.status(500).json({ message: 'Error retrieving knowledge base wiki' });
  }
});

// PUT /api/workspaces/:id/knowledge-base/:entryId/pin - Pin/unpin a wiki entry (Admin only)
router.put('/:id/knowledge-base/:entryId/pin', checkWorkspaceAdmin, async (req, res) => {
  try {
    const { id, entryId } = req.params;

    const kb = await TeamKnowledgeBase.findOne({ workspaceId: id });
    if (!kb) {
      return res.status(404).json({ message: 'Knowledge base not found' });
    }

    const entry = kb.entries.id(entryId);
    if (!entry) {
      return res.status(404).json({ message: 'Wiki entry not found' });
    }

    // Toggle pin status
    entry.isPinned = !entry.isPinned;
    await kb.save();

    res.json({ message: `Wiki entry ${entry.isPinned ? 'pinned' : 'unpinned'} successfully`, entry });
  } catch (error) {
    console.error('Error pinning wiki entry:', error);
    res.status(500).json({ message: 'Error updating pin status' });
  }
});

module.exports = router;
