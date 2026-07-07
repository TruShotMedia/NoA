const { getNotionJobs, methodNotAllowed, requireNoaAuth, sendJson } = require('../lib/noa');

const DISPLAY_COLUMNS = ['Not Started', 'In Progress', 'Ready for Revision', 'Final Draft/Notes'];

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
  if (req.query?.display === 'pipeline') {
    const report = await getNotionJobs();
    const pipelineTasks = Array.isArray(report.pipelineTasks) && report.pipelineTasks.length ? report.pipelineTasks : report.taskList || [];
    const tasks = pipelineTasks
      .filter((task) => DISPLAY_COLUMNS.includes(task.column || ''))
      .map((task) => ({
        id: task.id,
        title: task.title,
        jobTitle: task.jobTitle || '',
        client: task.client || '',
        status: task.status || '',
        priority: task.priority || '',
        dueDate: task.dueDate || '',
        dueState: task.dueState || '',
        shootDate: task.shootDate || '',
        shootState: task.shootState || '',
        effortLevel: task.effortLevel || '',
        effortSize: task.effortSize || '',
        taskTypes: task.taskTypes || [],
        assignedTo: task.assignedTo || '',
        complete: Boolean(task.complete),
        column: task.column || '',
        attachmentCount: Array.isArray(task.attachments) ? task.attachments.length : 0
      }));

    return sendJson(res, 200, {
      ok: !report.tasksError && !report.mainJobsError,
      fetchedAt: report.fetchedAt || new Date().toISOString(),
      columns: DISPLAY_COLUMNS,
      tasks,
      message: tasks.length ? 'Pipeline display synced.' : 'No active pipeline tasks returned.',
      error: report.tasksError || report.mainJobsError || ''
    });
  }
  if (!requireNoaAuth(req, res)) return;
  return sendJson(res, 200, await getNotionJobs());
};
