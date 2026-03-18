// ── API Response Types ─────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

// ── Job Events (WebSocket/SSE) ─────────────────────────

export type JobEvent =
  | { type: "progress"; jobId: string; progress: number; message?: string }
  | { type: "completed"; jobId: string; output: Record<string, unknown> }
  | { type: "failed"; jobId: string; error: string }
  | { type: "log"; jobId: string; message: string; timestamp: string };

// ── Agent Post Types ───────────────────────────────────

export type AgentType =
  | "mutation_hunter"
  | "neoantigen_scout"
  | "structure_prophet"
  | "mrna_architect"
  | "drug_simulator"
  | "publisher";

export const AGENT_DISPLAY_NAMES: Record<AgentType, string> = {
  mutation_hunter: "Mutation Hunter",
  neoantigen_scout: "Neoantigen Scout",
  structure_prophet: "Structure Prophet",
  mrna_architect: "mRNA Architect",
  drug_simulator: "Drug Simulator",
  publisher: "Publisher",
};

export const AGENT_DESCRIPTIONS: Record<AgentType, string> = {
  mutation_hunter:
    "Scans tumor genomes from TCGA to identify somatic mutations using ensemble variant calling.",
  neoantigen_scout:
    "Predicts which mutations produce neoantigens visible to the immune system.",
  structure_prophet:
    "Predicts 3D protein structures of mutated proteins and peptide-MHC complexes.",
  mrna_architect:
    "Designs optimized mRNA sequences encoding selected neoantigens for vaccine candidates.",
  drug_simulator:
    "Validates vaccine candidates through molecular docking and binding simulations.",
  publisher:
    "Translates technical findings into accessible scientific posts for the public.",
};

// ── Pipeline Steps ─────────────────────────────────────

export const PIPELINE_STEPS = [
  "variant_calling",
  "neoantigen_prediction",
  "structure_prediction",
  "mrna_design",
  "molecular_docking",
  "publishing",
] as const;

export type PipelineStep = (typeof PIPELINE_STEPS)[number];

export const PIPELINE_STEP_LABELS: Record<PipelineStep, string> = {
  variant_calling: "Mutation Discovery",
  neoantigen_prediction: "Neoantigen Screening",
  structure_prediction: "Protein Structure Prediction",
  mrna_design: "mRNA Vaccine Design",
  molecular_docking: "Drug Simulation",
  publishing: "Publishing Results",
};
