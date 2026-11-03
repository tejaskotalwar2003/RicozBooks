import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Timesheets general routes
router.get('/timesheets', ProjectController.listTimesheets);
router.post('/timesheets', ProjectController.logTimesheet);

// Project specific routes
router.get('/:projectId/profitability', ProjectController.getProfitability);
router.get('/:projectId/tasks', ProjectController.listTasks);
router.post('/:projectId/tasks', ProjectController.createTask);
router.get('/:projectId/timesheets', ProjectController.listTimesheets);
router.post('/:projectId/timesheets', ProjectController.logTimesheet);

// Project CRUD
router.get('/:id', ProjectController.getProject);
router.put('/:id', ProjectController.updateProject);
router.delete('/:id', ProjectController.deleteProject);
router.get('/', ProjectController.listProjects);
router.post('/', ProjectController.createProject);

export default router;
