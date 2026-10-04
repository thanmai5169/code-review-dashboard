const Workspace = require('../models/Workspace');

/**
 * Middleware to check user's role in a workspace.
 * Assumes req.user is set (from authMiddleware).
 * Looks for workspaceId in req.params.workspaceId, req.params.id, or req.body.workspaceId.
 * @param {Array<string>} allowedRoles - Roles allowed to perform the action. e.g. ['admin', 'reviewer']
 */
const checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const workspaceId = req.params.workspaceId || req.params.id || req.body.workspaceId;

      if (!workspaceId) {
        return res.status(400).json({ message: 'Workspace ID is required for this action' });
      }

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(444).json({ message: 'Workspace not found' });
      }

      // Check if user is owner of the workspace (owner is implicitly an admin)
      if (workspace.ownerId.toString() === req.user._id.toString()) {
        req.workspace = workspace;
        req.userWorkspaceRole = 'admin';
        return next();
      }

      // Check if user is a member
      const member = workspace.members.find(
        (m) => m.userId.toString() === req.user._id.toString()
      );

      if (!member) {
        return res.status(403).json({ message: 'Access denied: You are not a member of this workspace' });
      }

      // Check role authorization
      if (!allowedRoles.includes(member.role)) {
        return res.status(403).json({ message: `Access denied: Requires one of [${allowedRoles.join(', ')}] permissions` });
      }

      req.workspace = workspace;
      req.userWorkspaceRole = member.role;
      next();
    } catch (error) {
      console.error('Role check middleware error:', error);
      return res.status(500).json({ message: 'Server authorization check failed' });
    }
  };
};

module.exports = { checkRole };
