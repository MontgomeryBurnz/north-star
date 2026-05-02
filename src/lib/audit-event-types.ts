export type AuditEventType =
  | "artifact.copy"
  | "artifact.export"
  | "artifact.generate"
  | "flag.create"
  | "flag.review"
  | "guidance.refresh"
  | "leadership.feedback"
  | "program.create_or_update"
  | "program.role.add"
  | "program.update"
  | "user.access.remove"
  | "user.access.update"
  | "user.invite.link"
  | "user.invite.send";

export type AuditActor = {
  email?: string;
  name?: string;
  userId?: string;
  userType?: string;
};

export type AuditEventRecord = {
  id: string;
  actor?: AuditActor;
  createdAt: string;
  entityId?: string;
  entityLabel?: string;
  entityType: string;
  eventType: AuditEventType;
  metadata?: Record<string, unknown>;
  programId?: string;
  programName?: string;
  summary: string;
  surface: string;
};

export type AuditEventInput = Omit<AuditEventRecord, "createdAt" | "id">;
