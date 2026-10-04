const Workspace = require('../models/Workspace');
const User = require('../models/User');
const { sendEmailAlert, sendInAppNotification } = require('../services/notificationService');

// @desc    Create a new workspace
// @route   POST /api/workspaces
// @access  Private
exports.createWorkspace = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user._id;

    if (!name) {
      return res.status(400).json({ message: 'Workspace name is required' });
    }

    const workspace = await Workspace.create({
      name,
      description,
      ownerId: userId,
      members: [{ userId, role: 'admin' }],
      customRules: []
    });

    // Add workspace to user's document
    await User.findByIdAndUpdate(userId, { $push: { workspaces: workspace._id } });

    res.status(201).json(workspace);
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({ message: 'Server error creating workspace' });
  }
};

// @desc    Get user's workspaces
// @route   GET /api/workspaces
// @access  Private
exports.getMyWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      $or: [
        { ownerId: req.user._id },
        { 'members.userId': req.user._id }
      ]
    }).populate('ownerId', 'name email avatar')
      .populate('members.userId', 'name email avatar');

    res.json(workspaces);
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({ message: 'Server error retrieving workspaces' });
  }
};

// @desc    Get single workspace details
// @route   GET /api/workspaces/:id
// @access  Private
exports.getWorkspaceDetails = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('ownerId', 'name email avatar')
      .populate('members.userId', 'name email avatar defaultLanguage preferences');

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    res.json(workspace);
  } catch (error) {
    console.error('Get workspace details error:', error);
    res.status(500).json({ message: 'Server error retrieving workspace details' });
  }
};

// @desc    Invite user to workspace by email
// @route   POST /api/workspaces/:id/invite
// @access  Private (Admin or Owner)
exports.inviteMember = async (req, res) => {
  try {
    const { email, role } = req.body;
    const workspaceId = req.params.id;

    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    // Check if user exists
    const invitee = await User.findOne({ email });
    if (!invitee) {
      return res.status(444).json({ message: `No user found with email ${email}` });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Check if already a member
    const alreadyMember = workspace.members.some(
      (m) => m.userId.toString() === invitee._id.toString()
    );

    if (alreadyMember) {
      return res.status(400).json({ message: 'User is already a member of this workspace' });
    }

    // Add member
    workspace.members.push({
      userId: invitee._id,
      role: role || 'developer'
    });

    await workspace.save();

    // Link workspace inside invitee doc
    await User.findByIdAndUpdate(invitee._id, { $addToSet: { workspaces: workspace._id } });

    // Send email alert to invitee
    await sendEmailAlert(
      invitee.email,
      `CodeLens: Invitation to join workspace "${workspace.name}"`,
      `Hi ${invitee.name},\n\nYou have been added to the workspace "${workspace.name}" as a ${role || 'developer'} by ${req.user.name}.\n\nLog in to CodeLens to start reviewing code together!`
    );

    // Send in-app notification to invitee
    await sendInAppNotification(
      invitee._id,
      'invite',
      `You have been added to workspace "${workspace.name}" as a ${role || 'developer'} by ${req.user.name}.`
    );

    // Populate and return updated workspace
    const updatedWorkspace = await Workspace.findById(workspaceId)
      .populate('members.userId', 'name email avatar');

    res.json(updatedWorkspace);
  } catch (error) {
    console.error('Invite member error:', error);
    res.status(500).json({ message: 'Server error inviting member' });
  }
};

// @desc    Remove member from workspace
// @route   DELETE /api/workspaces/:id/members/:userId
// @access  Private (Admin or Owner)
exports.removeMember = async (req, res) => {
  try {
    const { id, userId } = req.params;

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Check if removing owner
    if (workspace.ownerId.toString() === userId) {
      return res.status(400).json({ message: 'Cannot remove the owner of the workspace' });
    }

    // Filter member list
    workspace.members = workspace.members.filter(
      (m) => m.userId.toString() !== userId
    );

    await workspace.save();

    // Pull workspace from member user document
    await User.findByIdAndUpdate(userId, { $pull: { workspaces: workspace._id } });

    const updatedWorkspace = await Workspace.findById(id)
      .populate('members.userId', 'name email avatar');

    res.json(updatedWorkspace);
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error removing member' });
  }
};

// @desc    Update workspace custom review rules
// @route   PUT /api/workspaces/:id/rules
// @access  Private (Admin only)
exports.updateCustomRules = async (req, res) => {
  try {
    const { customRules } = req.body; // Array of strings
    const workspaceId = req.params.id;

    if (!Array.isArray(customRules)) {
      return res.status(400).json({ message: 'customRules must be an array of strings' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    workspace.customRules = customRules;
    await workspace.save();

    res.json(workspace);
  } catch (error) {
    console.error('Update custom rules error:', error);
    res.status(500).json({ message: 'Server error updating custom rules' });
  }
};

// @desc    Get workspace code health leaderboard
// @route   GET /api/workspaces/:id/leaderboard
// @access  Private
exports.getWorkspaceLeaderboard = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const period = req.query.period || 'week'; // 'week' | 'month'

    const now = new Date();
    let startDate = new Date();
    let prevStartDate = new Date();
    
    if (period === 'month') {
      startDate.setDate(now.getDate() - 30);
      prevStartDate.setDate(now.getDate() - 60);
    } else {
      startDate.setDate(now.getDate() - 7);
      prevStartDate.setDate(now.getDate() - 14);
    }

    const rankings = await Review.aggregate([
      { 
        $match: { 
          workspaceId: new mongoose.Types.ObjectId(workspaceId), 
          createdAt: { $gte: startDate } 
        } 
      },
      {
        $group: {
          _id: '$userId',
          averageScore: { $avg: '$metrics.overallScore' },
          totalReviews: { $sum: 1 },
          criticalCount: {
            $sum: {
              $size: {
                $filter: {
                  input: { $ifNull: ['$findings', []] },
                  as: 'f',
                  cond: { $eq: ['$$f.severity', 'critical'] }
                }
              }
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          averageScore: { $round: ['$averageScore', 0] },
          totalReviews: 1,
          criticalCount: 1,
          'user.name': 1,
          'user.avatar': 1,
          'user.email': 1
        }
      },
      { $sort: { averageScore: -1 } }
    ]);

    const prevRankings = await Review.aggregate([
      { 
        $match: { 
          workspaceId: new mongoose.Types.ObjectId(workspaceId), 
          createdAt: { $gte: prevStartDate, $lt: startDate } 
        } 
      },
      {
        $group: {
          _id: '$userId',
          averageScore: { $avg: '$metrics.overallScore' }
        }
      }
    ]);

    const prevScoresMap = {};
    prevRankings.forEach(pr => {
      prevScoresMap[pr._id.toString()] = pr.averageScore;
    });

    const allWorkspaceReviews = await Review.find({ 
      workspaceId,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: -1 });

    const processedRankings = rankings.map(rank => {
      const uId = rank._id.toString();
      let streak = 0;
      const userReviews = allWorkspaceReviews.filter(r => r.userId.toString() === uId);
      for (const r of userReviews) {
        const hasCritical = r.findings?.some(f => f.severity === 'critical');
        if (!hasCritical) {
          streak++;
        } else {
          break;
        }
      }

      const categoryCounts = {};
      userReviews.forEach(r => {
        r.findings?.forEach(f => {
          categoryCounts[f.category] = (categoryCounts[f.category] || 0) + 1;
        });
      });
      let topWeakness = 'none';
      let maxCount = 0;
      Object.keys(categoryCounts).forEach(cat => {
        if (categoryCounts[cat] > maxCount) {
          maxCount = categoryCounts[cat];
          topWeakness = cat;
        }
      });

      const currentAvg = rank.averageScore;
      const prevAvg = prevScoresMap[uId];
      const delta = prevAvg !== undefined ? Math.round(currentAvg - prevAvg) : 0;

      return {
        ...rank,
        cleanStreak: streak,
        mostCommonWeakness: topWeakness,
        delta
      };
    });

    let mostImprovedUser = null;
    let maxDelta = 0;
    processedRankings.forEach(pr => {
      if (pr.delta > maxDelta) {
        maxDelta = pr.delta;
        mostImprovedUser = pr.user.name;
      }
    });

    res.json({
      rankings: processedRankings,
      mostImproved: mostImprovedUser ? { name: mostImprovedUser, delta: maxDelta } : null
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: 'Error retrieving leaderboard details' });
  }
};
