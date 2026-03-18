CREATE TYPE "public"."agent_type" AS ENUM('mutation_hunter', 'neoantigen_scout', 'structure_prophet', 'mrna_architect', 'drug_simulator', 'publisher');--> statement-breakpoint
CREATE TYPE "public"."compute_target" AS ENUM('railway_cpu', 'vastai_gpu');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('variant_calling', 'neoantigen_prediction', 'structure_prediction', 'mrna_design', 'molecular_docking', 'publish_post');--> statement-breakpoint
CREATE TABLE "agent_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_type" "agent_type" NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"content_html" text,
	"summary" text,
	"image_urls" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"pipeline_run_id" uuid,
	"job_id" uuid,
	"is_published" boolean DEFAULT false,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "job_type" NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"compute_target" "compute_target" NOT NULL,
	"input" jsonb NOT NULL,
	"output" jsonb,
	"progress" integer DEFAULT 0,
	"error" text,
	"vastai_instance_id" text,
	"cost_usd" real,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"pipeline_run_id" uuid
);
--> statement-breakpoint
CREATE TABLE "pipeline_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sample_id" text NOT NULL,
	"cancer_type" text NOT NULL,
	"source" text DEFAULT 'TCGA',
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"current_step" text,
	"results" jsonb,
	"total_cost_usd" real DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tcga_samples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sample_barcode" text NOT NULL,
	"cancer_type" text NOT NULL,
	"cancer_type_detail" text,
	"data_available" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tcga_samples_sample_barcode_unique" UNIQUE("sample_barcode")
);
--> statement-breakpoint
ALTER TABLE "agent_posts" ADD CONSTRAINT "agent_posts_pipeline_run_id_pipeline_runs_id_fk" FOREIGN KEY ("pipeline_run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_posts" ADD CONSTRAINT "agent_posts_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_pipeline_run_id_pipeline_runs_id_fk" FOREIGN KEY ("pipeline_run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE no action ON UPDATE no action;