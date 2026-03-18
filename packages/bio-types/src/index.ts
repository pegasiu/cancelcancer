// ── Genomic Data Types ─────────────────────────────────

/** Somatic mutation from variant calling */
export interface SomaticMutation {
  chromosome: string;
  position: number;
  referenceAllele: string;
  alternateAllele: string;
  gene: string;
  variantType: "SNV" | "INS" | "DEL";
  variantAlleleFrequency: number;
  callers: ("mutect2" | "strelka2" | "varscan2")[];
  effect: string;
  aminoAcidChange?: string;
}

/** Neoantigen candidate */
export interface NeoantigenCandidate {
  peptide: string;
  gene: string;
  mutation: SomaticMutation;
  hlaAllele: string;
  bindingAffinityNm: number;
  percentileRank: number;
  expressionLevel?: number;
  agretopicity?: number;
}

/** Protein structure prediction result */
export interface StructurePrediction {
  peptideSequence: string;
  method: "alphafold3" | "boltz2" | "esmfold";
  plddt: number;
  paeJson?: string;
  pdbData?: string;
  mmcifData?: string;
  confidenceScore: number;
}

/** mRNA sequence design result */
export interface MrnaDesign {
  targetPeptide: string;
  mrnaSequence: string;
  method: "lineardesign" | "mrnaid";
  stabilityMfe: number;
  codonAdaptationIndex: number;
  gcContent: number;
  uridineContent: number;
  secondaryStructure?: string;
}

/** Molecular docking result */
export interface DockingResult {
  targetProtein: string;
  ligand: string;
  method: "diffdock" | "rfdiffusion";
  rmsd: number;
  bindingAffinityNm: number;
  poseData?: string;
}

// ── TCGA Types ─────────────────────────────────────────

export type TcgaCancerType =
  | "BRCA" // Breast
  | "LUAD" // Lung Adenocarcinoma
  | "LUSC" // Lung Squamous Cell
  | "COAD" // Colon Adenocarcinoma
  | "PRAD" // Prostate
  | "SKCM" // Melanoma
  | "GBM"  // Glioblastoma
  | "OV"   // Ovarian
  | "PAAD" // Pancreatic
  | "LIHC"; // Liver

export interface TcgaSample {
  barcode: string;
  cancerType: TcgaCancerType;
  cancerTypeDetail: string;
  bamUrl?: string;
  vcfUrl?: string;
  clinicalData?: Record<string, unknown>;
}

// ── VAST.ai Types ──────────────────────────────────────

export interface VastaiOffer {
  id: number;
  gpuName: string;
  numGpus: number;
  gpuRam: number;
  cpuCores: number;
  ramGb: number;
  diskGb: number;
  pricePerHour: number;
  reliability: number;
}

export interface VastaiInstance {
  id: number;
  status: "running" | "loading" | "exited";
  sshHost?: string;
  sshPort?: number;
}
