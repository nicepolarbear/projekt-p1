import {
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  varchar,
} from 'drizzle-orm/pg-core';

export const roles = pgTable('roles', {
  id: integer('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
  created_at: varchar('created_at', { length: 50 }).notNull(),
});

export const organizations = pgTable(
  'organizations',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    industry: varchar('industry', { length: 100 }),
    size: varchar('size', { length: 50 }),
    created_by_user_id: integer('created_by_user_id'),
    created_at: varchar('created_at', { length: 50 }).notNull(),
  },
  (table) => [index('idx_organizations_slug').on(table.slug)]
);

export const positions = pgTable('positions', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  priority: integer('priority').notNull().default(3),
  is_delegatable: integer('is_delegatable').notNull().default(1),
  is_admin: integer('is_admin').notNull().default(0),
  can_manage_members: integer('can_manage_members').notNull().default(0),
  can_generate_invites: integer('can_generate_invites').notNull().default(0),
  can_approve_join_requests: integer('can_approve_join_requests').notNull().default(0),
  can_create_tasks: integer('can_create_tasks').notNull().default(1),
  can_assign_tasks: integer('can_assign_tasks').notNull().default(1),
  can_manage_all_tasks: integer('can_manage_all_tasks').notNull().default(0),
  can_delete_tasks: integer('can_delete_tasks').notNull().default(0),
  can_triage_bugs: integer('can_triage_bugs').notNull().default(0),
  can_convert_bugs_to_tasks: integer('can_convert_bugs_to_tasks').notNull().default(0),
  can_manage_applications: integer('can_manage_applications').notNull().default(0),
  can_view_analytics: integer('can_view_analytics').notNull().default(0),
  can_view_audit_logs: integer('can_view_audit_logs').notNull().default(0),
  can_manage_permissions: integer('can_manage_permissions').notNull().default(0),
  created_at: varchar('created_at', { length: 50 }).notNull(),
});

export const departments = pgTable('departments', {
  id: integer('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  created_at: varchar('created_at', { length: 50 }).notNull(),
});

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    first_name: varchar('first_name', { length: 100 }).notNull(),
    last_name: varchar('last_name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password_hash: text('password_hash').notNull(),
    role_id: integer('role_id').references(() => roles.id),
    position_id: integer('position_id').references(() => positions.id),
    department_id: integer('department_id').references(() => departments.id),
    organization_id: integer('organization_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    account_type: varchar('account_type', { length: 50 }).notNull().default('business_user'),
    avatar_color: varchar('avatar_color', { length: 30 }).notNull().default('#6366f1'),
    bio: text('bio'),
    phone: varchar('phone', { length: 50 }),
    preferences_json: text('preferences_json').notNull().default('{}'),
    token_version: integer('token_version').notNull().default(1),
    is_active: integer('is_active').notNull().default(1),
    last_login_at: varchar('last_login_at', { length: 50 }),
    created_at: varchar('created_at', { length: 50 }).notNull(),
    updated_at: varchar('updated_at', { length: 50 }).notNull(),
  },
  (table) => [
    index('idx_users_role_id').on(table.role_id),
    index('idx_users_position_id').on(table.position_id),
    index('idx_users_department_id').on(table.department_id),
    index('idx_users_organization_id').on(table.organization_id),
    index('idx_users_account_type').on(table.account_type),
  ]
);

export const organizationMembers = pgTable(
  'organization_members',
  {
    organization_id: integer('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    user_id: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role_id: integer('role_id').references(() => roles.id),
    position_id: integer('position_id').references(() => positions.id),
    department_id: integer('department_id').references(() => departments.id),
    status: varchar('status', { length: 50 }).notNull().default('active'),
    joined_at: varchar('joined_at', { length: 50 }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.organization_id, table.user_id] }),
    index('idx_organization_members_user').on(table.user_id),
  ]
);

export const invitationCodes = pgTable(
  'invitation_codes',
  {
    id: serial('id').primaryKey(),
    organization_id: integer('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 50 }).notNull().unique(),
    created_by_user_id: integer('created_by_user_id')
      .notNull()
      .references(() => users.id),
    suggested_position_id: integer('suggested_position_id').references(() => positions.id),
    max_uses: integer('max_uses').notNull().default(1),
    uses_count: integer('uses_count').notNull().default(0),
    is_active: integer('is_active').notNull().default(1),
    created_at: varchar('created_at', { length: 50 }).notNull(),
  },
  (table) => [
    index('idx_invitation_codes_code').on(table.code),
    index('idx_invitation_codes_org').on(table.organization_id),
  ]
);

export const joinRequests = pgTable(
  'join_requests',
  {
    id: serial('id').primaryKey(),
    organization_id: integer('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    user_id: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    invitation_code_id: integer('invitation_code_id').references(() => invitationCodes.id, {
      onDelete: 'set null',
    }),
    status: varchar('status', { length: 50 }).notNull().default('pending'),
    reviewed_by_user_id: integer('reviewed_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    assigned_position_id: integer('assigned_position_id').references(() => positions.id),
    created_at: varchar('created_at', { length: 50 }).notNull(),
    reviewed_at: varchar('reviewed_at', { length: 50 }),
  },
  (table) => [
    index('idx_join_requests_org').on(table.organization_id),
    index('idx_join_requests_user').on(table.user_id),
  ]
);

export const applications = pgTable(
  'applications',
  {
    id: serial('id').primaryKey(),
    organization_id: integer('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    url: varchar('url', { length: 500 }),
    description: text('description'),
    is_active: integer('is_active').notNull().default(1),
    created_at: varchar('created_at', { length: 50 }).notNull(),
  },
  (table) => [index('idx_applications_org').on(table.organization_id)]
);

export const sessions = pgTable(
  'sessions',
  {
    id: varchar('id', { length: 128 }).primaryKey(),
    user_id: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token_hash: varchar('token_hash', { length: 255 }).notNull(),
    ip_address: varchar('ip_address', { length: 100 }),
    user_agent: text('user_agent'),
    created_at: varchar('created_at', { length: 50 }).notNull(),
    expires_at: varchar('expires_at', { length: 50 }).notNull(),
    revoked_at: varchar('revoked_at', { length: 50 }),
    last_seen_at: varchar('last_seen_at', { length: 50 }),
  },
  (table) => [
    index('idx_sessions_user_id').on(table.user_id),
    index('idx_sessions_expires_at').on(table.expires_at),
  ]
);

export const taskStatuses = pgTable('task_statuses', {
  id: integer('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
});

export const priorities = pgTable('priorities', {
  id: integer('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  level: integer('level').notNull().unique(),
});

export const tasks = pgTable(
  'tasks',
  {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    short_desc: text('short_desc'),
    full_desc: text('full_desc'),
    creator_id: integer('creator_id')
      .notNull()
      .references(() => users.id),
    status_id: integer('status_id')
      .notNull()
      .references(() => taskStatuses.id),
    due_date: varchar('due_date', { length: 50 }),
    completed_at: varchar('completed_at', { length: 50 }),
    deleted_at: varchar('deleted_at', { length: 50 }),
    created_at: varchar('created_at', { length: 50 }).notNull(),
    updated_at: varchar('updated_at', { length: 50 }).notNull(),
  },
  (table) => [
    index('idx_tasks_creator_id').on(table.creator_id),
    index('idx_tasks_status_id').on(table.status_id),
    index('idx_tasks_deleted_at').on(table.deleted_at),
  ]
);

export const taskAssignments = pgTable(
  'task_assignments',
  {
    task_id: integer('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    employee_id: integer('employee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    assigned_by: integer('assigned_by').references(() => users.id, { onDelete: 'set null' }),
    priority_id: integer('priority_id')
      .notNull()
      .references(() => priorities.id),
    assignment_status: varchar('assignment_status', { length: 50 }).notNull().default('pending'),
    rejection_reason: text('rejection_reason'),
    assigned_at: varchar('assigned_at', { length: 50 }).notNull(),
    responded_at: varchar('responded_at', { length: 50 }),
  },
  (table) => [
    primaryKey({ columns: [table.task_id, table.employee_id] }),
    index('idx_task_assignments_employee_id').on(table.employee_id),
    index('idx_task_assignments_status').on(table.assignment_status),
  ]
);

export const bugReports = pgTable(
  'bug_reports',
  {
    id: serial('id').primaryKey(),
    organization_id: integer('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    application_id: integer('application_id').references(() => applications.id, {
      onDelete: 'set null',
    }),
    custom_url: varchar('custom_url', { length: 500 }),
    reporter_user_id: integer('reporter_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    guest_email: varchar('guest_email', { length: 255 }),
    guest_name: varchar('guest_name', { length: 100 }),
    is_anonymous: integer('is_anonymous').notNull().default(0),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    attachment_url: text('attachment_url'),
    severity: varchar('severity', { length: 50 }).notNull().default('normal'),
    status: varchar('status', { length: 50 }).notNull().default('new'),
    rejection_reason: text('rejection_reason'),
    tracking_code: varchar('tracking_code', { length: 50 }).notNull().unique(),
    created_at: varchar('created_at', { length: 50 }).notNull(),
    updated_at: varchar('updated_at', { length: 50 }).notNull(),
  },
  (table) => [
    index('idx_bug_reports_org').on(table.organization_id),
    index('idx_bug_reports_app').on(table.application_id),
    index('idx_bug_reports_reporter').on(table.reporter_user_id),
    index('idx_bug_reports_tracking').on(table.tracking_code),
    index('idx_bug_reports_status').on(table.status),
  ]
);

export const bugComments = pgTable(
  'bug_comments',
  {
    id: serial('id').primaryKey(),
    bug_report_id: integer('bug_report_id')
      .notNull()
      .references(() => bugReports.id, { onDelete: 'cascade' }),
    user_id: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    author_name: varchar('author_name', { length: 100 }).notNull(),
    is_staff: integer('is_staff').notNull().default(0),
    content: text('content').notNull(),
    created_at: varchar('created_at', { length: 50 }).notNull(),
  },
  (table) => [index('idx_bug_comments_bug').on(table.bug_report_id)]
);

export const bugTaskLinks = pgTable(
  'bug_task_links',
  {
    bug_report_id: integer('bug_report_id')
      .notNull()
      .references(() => bugReports.id, { onDelete: 'cascade' }),
    task_id: integer('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    created_at: varchar('created_at', { length: 50 }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.bug_report_id, table.task_id] })]
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    actor_user_id: integer('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(),
    entity_type: varchar('entity_type', { length: 100 }).notNull(),
    entity_id: varchar('entity_id', { length: 100 }),
    details_json: text('details_json').notNull().default('{}'),
    ip_address: varchar('ip_address', { length: 100 }),
    user_agent: text('user_agent'),
    created_at: varchar('created_at', { length: 50 }).notNull(),
  },
  (table) => [
    index('idx_audit_logs_actor_created').on(table.actor_user_id, table.created_at),
    index('idx_audit_logs_entity').on(table.entity_type, table.entity_id),
  ]
);
