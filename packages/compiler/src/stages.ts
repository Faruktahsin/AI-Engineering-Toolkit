export enum PipelineStage {
  INGEST = "INGEST",
  SANITIZE = "SANITIZE",
  VALIDATE = "VALIDATE",
  NORMALIZE = "NORMALIZE",
  FILTER = "FILTER",
  RANK = "RANK",
  FIT = "FIT",
  EMIT = "EMIT",
}

export const PIPELINE_STAGE_ORDER: readonly PipelineStage[] = [
  PipelineStage.INGEST,
  PipelineStage.SANITIZE,
  PipelineStage.VALIDATE,
  PipelineStage.NORMALIZE,
  PipelineStage.FILTER,
  PipelineStage.RANK,
  PipelineStage.FIT,
  PipelineStage.EMIT,
] as const;
