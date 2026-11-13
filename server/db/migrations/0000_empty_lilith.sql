CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" varchar(500),
	"description" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_user_id" integer,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" varchar(100),
	"details_json" text DEFAULT '{}' NOT NULL,
	"ip_address" varchar(100),
	"user_agent" text,
	"created_at" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bug_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"bug_report_id" integer NOT NULL,
	"user_id" integer,
	"author_name" varchar(100) NOT NULL,
	"is_staff" integer DEFAULT 0 NOT NULL,
	"content" text NOT NULL,
	"created_at" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bug_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"application_id" integer,
	"custom_url" varchar(500),
	"reporter_user_id" integer,
	"guest_email" varchar(255),
	"guest_name" varchar(100),
	"is_anonymous" integer DEFAULT 0 NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"attachment_url" text,
	"severity" varchar(50) DEFAULT 'normal' NOT NULL,
	"status" varchar(50) DEFAULT 'new' NOT NULL,
	"rejection_reason" text,
	"tracking_code" varchar(50) NOT NULL,
	"created_at" varchar(50) NOT NULL,
	"updated_at" varchar(50) NOT NULL,
	CONSTRAINT "bug_reports_tracking_code_unique" UNIQUE("tracking_code")
);
--> statement-breakpoint
CREATE TABLE "bug_task_links" (
	"bug_report_id" integer NOT NULL,
	"task_id" integer NOT NULL,
	"created_at" varchar(50) NOT NULL,
	CONSTRAINT "bug_task_links_bug_report_id_task_id_pk" PRIMARY KEY("bug_report_id","task_id")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" integer PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" varchar(50) NOT NULL,
	CONSTRAINT "departments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "invitation_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"created_by_user_id" integer NOT NULL,
	"suggested_position_id" integer,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"uses_count" integer DEFAULT 0 NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" varchar(50) NOT NULL,
	CONSTRAINT "invitation_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "join_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"invitation_code_id" integer,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" integer,
	"assigned_position_id" integer,
	"created_at" varchar(50) NOT NULL,
	"reviewed_at" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"organization_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role_id" integer,
	"position_id" integer,
	"department_id" integer,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"joined_at" varchar(50) NOT NULL,
	CONSTRAINT "organization_members_organization_id_user_id_pk" PRIMARY KEY("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"industry" varchar(100),
	"size" varchar(50),
	"created_by_user_id" integer,
	"created_at" varchar(50) NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"priority" integer DEFAULT 3 NOT NULL,
	"is_delegatable" integer DEFAULT 1 NOT NULL,
	"is_admin" integer DEFAULT 0 NOT NULL,
	"can_manage_members" integer DEFAULT 0 NOT NULL,
	"can_generate_invites" integer DEFAULT 0 NOT NULL,
	"can_approve_join_requests" integer DEFAULT 0 NOT NULL,
	"can_create_tasks" integer DEFAULT 1 NOT NULL,
	"can_assign_tasks" integer DEFAULT 1 NOT NULL,
	"can_manage_all_tasks" integer DEFAULT 0 NOT NULL,
	"can_delete_tasks" integer DEFAULT 0 NOT NULL,
	"can_triage_bugs" integer DEFAULT 0 NOT NULL,
	"can_convert_bugs_to_tasks" integer DEFAULT 0 NOT NULL,
	"can_manage_applications" integer DEFAULT 0 NOT NULL,
	"can_view_analytics" integer DEFAULT 0 NOT NULL,
	"can_view_audit_logs" integer DEFAULT 0 NOT NULL,
	"can_manage_permissions" integer DEFAULT 0 NOT NULL,
	"created_at" varchar(50) NOT NULL,
	CONSTRAINT "positions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "priorities" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"level" integer NOT NULL,
	CONSTRAINT "priorities_name_unique" UNIQUE("name"),
	CONSTRAINT "priorities_level_unique" UNIQUE("level")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"created_at" varchar(50) NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"ip_address" varchar(100),
	"user_agent" text,
	"created_at" varchar(50) NOT NULL,
	"expires_at" varchar(50) NOT NULL,
	"revoked_at" varchar(50),
	"last_seen_at" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "task_assignments" (
	"task_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"assigned_by" integer,
	"priority_id" integer NOT NULL,
	"assignment_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"assigned_at" varchar(50) NOT NULL,
	"responded_at" varchar(50),
	CONSTRAINT "task_assignments_task_id_employee_id_pk" PRIMARY KEY("task_id","employee_id")
);
--> statement-breakpoint
CREATE TABLE "task_statuses" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	CONSTRAINT "task_statuses_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"short_desc" text,
	"full_desc" text,
	"creator_id" integer NOT NULL,
	"status_id" integer NOT NULL,
	"due_date" varchar(50),
	"completed_at" varchar(50),
	"deleted_at" varchar(50),
	"created_at" varchar(50) NOT NULL,
	"updated_at" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role_id" integer,
	"position_id" integer,
	"department_id" integer,
	"organization_id" integer,
	"account_type" varchar(50) DEFAULT 'business_user' NOT NULL,
	"avatar_color" varchar(30) DEFAULT '#6366f1' NOT NULL,
	"bio" text,
	"phone" varchar(50),
	"preferences_json" text DEFAULT '{}' NOT NULL,
	"token_version" integer DEFAULT 1 NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"last_login_at" varchar(50),
	"created_at" varchar(50) NOT NULL,
	"updated_at" varchar(50) NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_comments" ADD CONSTRAINT "bug_comments_bug_report_id_bug_reports_id_fk" FOREIGN KEY ("bug_report_id") REFERENCES "public"."bug_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_comments" ADD CONSTRAINT "bug_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_task_links" ADD CONSTRAINT "bug_task_links_bug_report_id_bug_reports_id_fk" FOREIGN KEY ("bug_report_id") REFERENCES "public"."bug_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_task_links" ADD CONSTRAINT "bug_task_links_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation_codes" ADD CONSTRAINT "invitation_codes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation_codes" ADD CONSTRAINT "invitation_codes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation_codes" ADD CONSTRAINT "invitation_codes_suggested_position_id_positions_id_fk" FOREIGN KEY ("suggested_position_id") REFERENCES "public"."positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_invitation_code_id_invitation_codes_id_fk" FOREIGN KEY ("invitation_code_id") REFERENCES "public"."invitation_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_assigned_position_id_positions_id_fk" FOREIGN KEY ("assigned_position_id") REFERENCES "public"."positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_priority_id_priorities_id_fk" FOREIGN KEY ("priority_id") REFERENCES "public"."priorities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_status_id_task_statuses_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."task_statuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_applications_org" ON "applications" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_actor_created" ON "audit_logs" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_bug_comments_bug" ON "bug_comments" USING btree ("bug_report_id");--> statement-breakpoint
CREATE INDEX "idx_bug_reports_org" ON "bug_reports" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_bug_reports_app" ON "bug_reports" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_bug_reports_reporter" ON "bug_reports" USING btree ("reporter_user_id");--> statement-breakpoint
CREATE INDEX "idx_bug_reports_tracking" ON "bug_reports" USING btree ("tracking_code");--> statement-breakpoint
CREATE INDEX "idx_bug_reports_status" ON "bug_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_invitation_codes_code" ON "invitation_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_invitation_codes_org" ON "invitation_codes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_join_requests_org" ON "join_requests" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_join_requests_user" ON "join_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_organization_members_user" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_organizations_slug" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_sessions_user_id" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_expires_at" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_task_assignments_employee_id" ON "task_assignments" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_task_assignments_status" ON "task_assignments" USING btree ("assignment_status");--> statement-breakpoint
CREATE INDEX "idx_tasks_creator_id" ON "tasks" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_status_id" ON "tasks" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_deleted_at" ON "tasks" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_users_role_id" ON "users" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "idx_users_position_id" ON "users" USING btree ("position_id");--> statement-breakpoint
CREATE INDEX "idx_users_department_id" ON "users" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_users_organization_id" ON "users" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_users_account_type" ON "users" USING btree ("account_type");