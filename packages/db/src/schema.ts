import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  integer,
  pgEnum,
  real,
  boolean,
} from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────

export const agentTypeEnum = pgEnum("agent_type", [
  "mutation_hunter",
  "neoantigen_scout",
  "structure_prophet",
  "mrna_architect",
  "drug_simulator",
  "publisher",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const jobTypeEnum = pgEnum("job_type", [
  "variant_calling",
  "neoantigen_prediction",
  "structure_prediction",
  "mrna_design",
  "molecular_docking",
  "publish_post",
]);

export const computeTargetEnum = pgEnum("compute_target", [
  "railway_cpu",
  "vastai_gpu",
]);

// ── Agent Posts (feed odkryć) ──────────────────────────

export const agentPosts = pgTable("agent_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentType: agentTypeEnum("agent_type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  contentHtml: text("content_html"),
  summary: text("summary"),
  imageUrls: jsonb("image_urls").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  pipelineRunId: uuid("pipeline_run_id").references(() => pipelineRuns.id),
  jobId: uuid("job_id").references(() => jobs.id),
  isPublished: boolean("is_published").default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Jobs (obliczenia) ──────────────────────────────────

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: jobTypeEnum("type").notNull(),
  status: jobStatusEnum("status").default("queued").notNull(),
  computeTarget: computeTargetEnum("compute_target").notNull(),
  input: jsonb("input").$type<Record<string, unknown>>().notNull(),
  output: jsonb("output").$type<Record<string, unknown>>(),
  progress: integer("progress").default(0),
  error: text("error"),
  vastaiInstanceId: text("vastai_instance_id"),
  costUsd: real("cost_usd"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  pipelineRunId: uuid("pipeline_run_id").references(() => pipelineRuns.id),
});

// ── Pipeline Runs (pełne analizy próbek) ───────────────

export const pipelineRuns = pgTable("pipeline_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sampleId: text("sample_id").notNull(),
  cancerType: text("cancer_type").notNull(),
  source: text("source").default("TCGA"),
  status: jobStatusEnum("status").default("queued").notNull(),
  currentStep: text("current_step"),
  results: jsonb("results").$type<PipelineResults>(),
  totalCostUsd: real("total_cost_usd").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

// ── TCGA Samples cache ─────────────────────────────────

export const tcgaSamples = pgTable("tcga_samples", {
  id: uuid("id").primaryKey().defaultRandom(),
  sampleBarcode: text("sample_barcode").notNull().unique(),
  cancerType: text("cancer_type").notNull(),
  cancerTypeDetail: text("cancer_type_detail"),
  dataAvailable: jsonb("data_available").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Types ──────────────────────────────────────────────

export interface PipelineResults {
  mutations?: {
    total: number;
    coding: number;
    topGenes: string[];
    vcfUrl?: string;
  };
  neoantigens?: {
    total: number;
    highAffinity: number;
    candidates: Array<{
      peptide: string;
      gene: string;
      hlaAllele: string;
      bindingAffinity: number;
      rank: number;
    }>;
  };
  structures?: Array<{
    peptide: string;
    pdbUrl?: string;
    plddt: number;
    method: "alphafold3" | "boltz2" | "esmfold";
  }>;
  mrnaDesign?: {
    sequence: string;
    stabilityScore: number;
    codonAdaptationIndex: number;
    method: "lineardesign" | "mrnaid";
  };
  docking?: Array<{
    target: string;
    ligand: string;
    rmsd: number;
    affinity: number;
    method: "diffdock" | "rfdiffusion";
  }>;
}
