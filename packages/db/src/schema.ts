import { relations, sql } from "drizzle-orm";
import { boolean, customType, index, jsonb, pgEnum, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Uint8Array; driverData: Buffer }>({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value),
});

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// --- Better Auth core tables -------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// --- Workspaces & flows ------------------------------------------------------

export const memberRole = pgEnum("member_role", ["owner", "editor", "viewer"]);
export const flowMode = pgEnum("flow_mode", ["workflow", "diagram"]);

export const workspace = pgTable("workspace", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** Every user gets exactly one personal workspace on sign-up. */
  personalFor: text("personal_for")
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  ...timestamps,
});

export const workspaceMember = pgTable(
  "workspace_member",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.userId] }), index("workspace_member_user_idx").on(t.userId)],
);

/** Node/edge JSON kept alongside the Yjs state so lists and previews don't decode it. */
export interface FlowSnapshot {
  nodes: { id: string; type: string; position: { x: number; y: number }; width?: number; height?: number }[];
  edges: { source: string; target: string }[];
}

export const flow = pgTable(
  "flow",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    mode: flowMode("mode").notNull(),
    /** Encoded Yjs document: the source of truth for the graph. */
    doc: bytea("doc"),
    snapshot: jsonb("snapshot").$type<FlowSnapshot>().notNull().default({ nodes: [], edges: [] }),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    /** When set, anyone with `/share/<token>` can view the flow read-only. */
    publicToken: text("public_token").unique(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("flow_workspace_updated_idx").on(t.workspaceId, t.updatedAt.desc()).where(sql`${t.deletedAt} is null`)],
);

export const shareRole = pgEnum("share_role", ["editor", "viewer"]);

/**
 * Per-flow access granted by email. Keyed on email rather than user id so
 * people can be invited before they have an account.
 */
export const flowAccess = pgTable(
  "flow_access",
  {
    flowId: text("flow_id")
      .notNull()
      .references(() => flow.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: shareRole("role").notNull(),
    invitedBy: text("invited_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.flowId, t.email] }), index("flow_access_email_idx").on(t.email)],
);

export const flowVersion = pgTable(
  "flow_version",
  {
    id: text("id").primaryKey(),
    flowId: text("flow_id")
      .notNull()
      .references(() => flow.id, { onDelete: "cascade" }),
    doc: bytea("doc").notNull(),
    snapshot: jsonb("snapshot").$type<FlowSnapshot>().notNull(),
    /** Null for automatic snapshots. */
    label: text("label"),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("flow_version_flow_created_idx").on(t.flowId, t.createdAt.desc())],
);

export const userRelations = relations(user, ({ many }) => ({ memberships: many(workspaceMember) }));
export const workspaceRelations = relations(workspace, ({ many }) => ({ members: many(workspaceMember), flows: many(flow) }));
export const workspaceMemberRelations = relations(workspaceMember, ({ one }) => ({
  workspace: one(workspace, { fields: [workspaceMember.workspaceId], references: [workspace.id] }),
  user: one(user, { fields: [workspaceMember.userId], references: [user.id] }),
}));
export const flowRelations = relations(flow, ({ one, many }) => ({
  workspace: one(workspace, { fields: [flow.workspaceId], references: [workspace.id] }),
  access: many(flowAccess),
  versions: many(flowVersion),
}));
export const flowAccessRelations = relations(flowAccess, ({ one }) => ({
  flow: one(flow, { fields: [flowAccess.flowId], references: [flow.id] }),
}));
export const flowVersionRelations = relations(flowVersion, ({ one }) => ({
  flow: one(flow, { fields: [flowVersion.flowId], references: [flow.id] }),
  author: one(user, { fields: [flowVersion.createdBy], references: [user.id] }),
}));

// --- Activity & chat ---------------------------------------------------------

/** Payload stored with each kind of activity event. */
export interface FlowEventData {
  message: { text: string };
  "flow.created": { title: string };
  "flow.renamed": { from: string; to: string };
  "flow.deleted": Record<string, never>;
  "flow.restored": Record<string, never>;
  "node.added": { nodeId: string; type: string; label?: string };
  "node.removed": { nodeId: string; type: string; label?: string };
  "edge.added": { source: string; target: string };
  "edge.removed": { source: string; target: string };
  /** One large change (paste, import, version restore) summarised instead of listed. */
  "graph.bulk": { added: number; removed: number };
  "share.invited": { email: string; role: "editor" | "viewer" };
  "share.role_changed": { email: string; role: "editor" | "viewer" };
  "share.removed": { email: string };
  "link.enabled": Record<string, never>;
  "link.disabled": Record<string, never>;
  "version.saved": { label: string };
  "version.restored": { label: string };
}

export type FlowEventKind = keyof FlowEventData;

const eventKinds = [
  "message",
  "flow.created",
  "flow.renamed",
  "flow.deleted",
  "flow.restored",
  "node.added",
  "node.removed",
  "edge.added",
  "edge.removed",
  "graph.bulk",
  "share.invited",
  "share.role_changed",
  "share.removed",
  "link.enabled",
  "link.disabled",
  "version.saved",
  "version.restored",
] as const satisfies readonly FlowEventKind[];

export const flowEventKind = pgEnum("flow_event_kind", eventKinds);

/**
 * Append-only timeline for a flow: who changed what, plus chat messages, in
 * one ordered stream. The actor's name is copied in so history stays readable
 * after people rename themselves or delete their account.
 */
export const flowEvent = pgTable(
  "flow_event",
  {
    id: text("id").primaryKey(),
    flowId: text("flow_id")
      .notNull()
      .references(() => flow.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    actorName: text("actor_name").notNull(),
    kind: flowEventKind("kind").notNull(),
    data: jsonb("data").$type<FlowEventData[FlowEventKind]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("flow_event_flow_created_idx").on(t.flowId, t.createdAt.desc())],
);

/** An event row with `data` narrowed by `kind`. */
export type FlowEvent = {
  [K in FlowEventKind]: Omit<typeof flowEvent.$inferSelect, "kind" | "data"> & { kind: K; data: FlowEventData[K] };
}[FlowEventKind];
