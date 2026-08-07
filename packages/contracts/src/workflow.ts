export interface WorkflowNode {
  readonly id: string;
  readonly type: string;
  readonly label?: string;
  readonly config?: Record<string, unknown>;
}

export interface WorkflowEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly condition?: string;
}

export interface WorkflowContext {
  readonly executionId: string;
  readonly workflowId: string;
  readonly inputs: Record<string, unknown>;
  readonly state: Record<string, unknown>;
}

export interface WorkflowResult<T = unknown> {
  readonly success: boolean;
  readonly executionId: string;
  readonly outputs?: T;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly nodeId?: string;
  };
}

export interface Workflow {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly nodes: readonly WorkflowNode[];
  readonly edges: readonly WorkflowEdge[];
  execute<T = unknown>(context: WorkflowContext): Promise<WorkflowResult<T>>;
}
