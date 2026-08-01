import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';

describe('WorkflowController', () => {
  let controller: WorkflowController;

  beforeEach(() => {
    const workflowService = {} as WorkflowService;
    controller = new WorkflowController(workflowService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
