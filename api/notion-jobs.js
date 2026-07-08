const { getNotionJobs, methodNotAllowed, requireNoaAuth, sendJson } = require('../lib/noa');

const DISPLAY_COLUMNS = ['Not Started', 'In Progress', 'Ready for Revision', 'Final Draft/Notes'];

function normalizeNotionStatusName(status) {
  return /^done$/i.test(String(status || '').trim()) ? 'Posted / Done' : String(status || '').trim();
}

function isCompleteNotionStatus(status) {
  const normalized = normalizeNotionStatusName(status);
  return normalized === 'Posted / Done' || normalized === 'Ready To Post' || normalized === 'Archived';
}

function isCompleteTask(task) {
  return Boolean(task.complete) || isCompleteNotionStatus(task.status);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
  if (req.query?.display === 'pipeline' || req.query?.display === 'widget') {
    const report = await getNotionJobs();
    const pipelineTasks = Array.isArray(report.pipelineTasks) && report.pipelineTasks.length ? report.pipelineTasks : report.taskList || [];
    if (req.query?.display === 'widget') {
      const activeTasks = pipelineTasks.filter((task) => DISPLAY_COLUMNS.includes(task.column || '') && !isCompleteTask(task));
      const counts = DISPLAY_COLUMNS.map((column) => ({
        id: column.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        label: column,
        count: activeTasks.filter((task) => task.column === column).length
      }));
      const total = counts.reduce((sum, item) => sum + item.count, 0);
      return sendJson(res, 200, {
        ok: !report.tasksError && !report.mainJobsError,
        type: 'noa-pipeline-widget',
        fetchedAt: report.fetchedAt || new Date().toISOString(),
        total,
        counts,
        message: total ? 'Pipeline widget synced.' : 'No active pipeline tasks returned.',
        error: report.tasksError || report.mainJobsError || ''
      });
    }
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
