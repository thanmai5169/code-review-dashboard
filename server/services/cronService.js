const cron = require('node-cron');
const User = require('../models/User');
const SkillProgress = require('../models/SkillProgress');
const { sendEmailAlert } = require('./notificationService');
const { getStartOfWeek } = require('./skillService');

/**
 * Initializes and schedules background cron jobs
 */
const initCronJobs = () => {
  // Cron schedule: every Monday at 9:00 AM ('0 9 * * 1')
  cron.schedule('0 9 * * 1', async () => {
    console.log('[Cron Job] Executing Monday 9AM Weekly Developer Skill growth reports...');
    try {
      const users = await User.find({});
      
      for (const user of users) {
        // Fetch skill progress
        const progress = await SkillProgress.findOne({ userId: user._id });
        if (!progress || !progress.weeklyStats || progress.weeklyStats.length === 0) {
          continue; // skip if no stats
        }

        // Get stats for the week that just ended (i.e. start of last week)
        const lastWeekDate = new Date();
        lastWeekDate.setDate(lastWeekDate.getDate() - 7);
        const lastWeekMonday = getStartOfWeek(lastWeekDate);

        const weekStats = progress.weeklyStats.find(
          (s) => s.week.getTime() === lastWeekMonday.getTime()
        ) || progress.weeklyStats[progress.weeklyStats.length - 1]; // Fallback to latest entry

        if (!weekStats) continue;

        const score = weekStats.averageScore;
        const total = weekStats.totalReviews;
        const cb = weekStats.categoryBreakdown || { bugs: 0, security: 0, performance: 0, style: 0 };
        const weakness = weekStats.topWeakness || 'none';
        const improvementText = weekStats.improvement >= 0 
          ? `increased by +${weekStats.improvement} points` 
          : `decreased by ${weekStats.improvement} points`;

        const emailText = `Hello ${user.name},\n\n` +
          `Here is your CodeLens Weekly Developer Skill Growth report for the week starting ${new Date(weekStats.week).toLocaleDateString()}:\n\n` +
          `- Average Code Quality Score: ${score}/100 (which ${improvementText} compared to last week)\n` +
          `- Total Audits Run: ${total}\n` +
          `- Issue Breakdown:\n` +
          `  * Bugs: ${cb.bugs}\n` +
          `  * Security: ${cb.security}\n` +
          `  * Performance: ${cb.performance}\n` +
          `  * Style Issues: ${cb.style}\n\n` +
          `Your primary focus area for next week: ${weakness.toUpperCase()} issues.\n\n` +
          `Keep up the consistent work to extend your active streak of ${progress.streakDays} days! Unlocked Badges: ${progress.badges?.join(', ') || 'None yet'}.\n\n` +
          `Best regards,\nThe CodeLens Team`;

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #30363d; border-radius: 8px; background-color: #0d1117; color: #e6edf3;">
            <h2 style="color: #58a6ff; border-bottom: 1px solid #30363d; padding-bottom: 10px; margin-top: 0;">CodeLens Weekly Quality Report</h2>
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>Here is your personalized weekly code quality and skill growth breakdown:</p>
            
            <div style="background-color: #161b22; border: 1px solid #30363d; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #58a6ff;">Week Summary</h3>
              <ul style="padding-left: 20px; margin-bottom: 0; line-height: 1.6;">
                <li><strong>Average Code Score:</strong> ${score}/100 (<span style="color: ${weekStats.improvement >= 0 ? '#3fb950' : '#f85149'}">${improvementText}</span>)</li>
                <li><strong>Total Audits Run:</strong> ${total}</li>
                <li><strong>Active Streak:</strong> ${progress.streakDays} days</li>
              </ul>
            </div>

            <div style="background-color: #161b22; border: 1px solid #30363d; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #bc8cff;">Issues Found By Category</h3>
              <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
                <tr><td style="padding: 4px 0;">🐛 Bugs</td><td style="font-weight: bold; text-align: right;">${cb.bugs}</td></tr>
                <tr><td style="padding: 4px 0;">🛡️ Security</td><td style="font-weight: bold; text-align: right;">${cb.security}</td></tr>
                <tr><td style="padding: 4px 0;">⚡ Performance</td><td style="font-weight: bold; text-align: right;">${cb.performance}</td></tr>
                <tr><td style="padding: 4px 0;">🎨 Style Guide</td><td style="font-weight: bold; text-align: right;">${cb.style}</td></tr>
              </table>
            </div>

            <p>💡 <strong>Weekly Focus:</strong> We suggest focusing on resolving <strong>${weakness.toUpperCase()}</strong> code patterns in your upcoming reviews.</p>
            <p>🏅 <strong>Badges Achieved:</strong> ${progress.badges?.map(b => `<span style="display: inline-block; background-color: #21262d; border: 1px solid #30363d; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-right: 4px;">${b}</span>`).join(' ') || 'None yet'}</p>
            <hr style="border: none; border-top: 1px solid #30363d; margin: 20px 0;" />
            <p style="font-size: 11px; color: #8b949e; text-align: center;">You receive this summary because weekly email notifications are enabled in your preferences settings.</p>
          </div>
        `;

        if (user.preferences?.notifications !== false) {
          await sendEmailAlert(
            user.email,
            `CodeLens Weekly Skill Progress: Quality Score ${score}/100`,
            emailText,
            emailHtml
          );
        }
      }
    } catch (error) {
      console.error('Error during weekly report cron execution:', error);
    }
  });
  console.log('[Cron Service] node-cron scheduler successfully registered (Runs Monday 9AM).');
};

module.exports = initCronJobs;
