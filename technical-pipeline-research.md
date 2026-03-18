# Technical Research: mRNA Vaccine & Neoantigen Prediction Pipeline

## 1. AlphaFold for Neoantigen Prediction

### How It Works
AlphaFold does NOT directly take DNA sequences. The workflow is:
1. Mutated DNA -> translate to mutated **amino acid sequence** (via variant annotation tools)
2. Feed the mutant peptide + MHC molecule sequences into AlphaFold to predict the 3D structure of the peptide-MHC complex

### AlphaFold 3 Input Format
- **Format:** JSON file with 5 mandatory fields: `name`, `sequences`, `modelSeeds`, `dialect`, `version`
- **Two dialects:** `alphafold3` (full control over MSAs, templates, bonds, custom ligands) and `alphafoldserver` (simplified, auto-converted)
- **Protein sequences:** specified as strings using 1-letter amino acid codes
- **Supports:** proteins, DNA, RNA, ligands, ions, modified residues, post-translational modifications (via CCD codes)
- **Run command:** `run_alphafold.py --json_path input.json` or `--input_dir` for batch

**Example JSON structure:**
```json
{
  "name": "peptide_mhc_complex",
  "sequences": [
    {"protein": {"id": "A", "sequence": "MFVFLVLL..."}},
    {"protein": {"id": "B", "sequence": "GSHSMRYF..."}}
  ],
  "modelSeeds": [42],
  "dialect": "alphafold3",
  "version": 1
}
```

### Output
- **mmCIF format** (.cif) - 3D atomic coordinates of predicted structure
- **Predicted Aligned Error (PAE)** JSON - confidence of relative domain positions
- **pLDDT scores** - per-residue confidence (0-100)

### Access Options
| Platform | URL | Notes |
|----------|-----|-------|
| AlphaFold Server (web) | https://alphafoldserver.com/ | Free, AlphaFold 3 powered, web UI |
| AlphaFold 3 (source) | https://github.com/google-deepmind/alphafold3 | Self-hosted, requires GPU, full control |
| AlphaFold DB | https://alphafold.ebi.ac.uk/ | Pre-computed structures for known proteins |

### Specialized Models for Neoantigens
- **MHC-Fine**: Fine-tuned AlphaFold for class I MHC-peptide complex prediction (optimized parameters)
- **NeoaPred**: Deep learning framework predicting immunogenic neoantigens from surface/structural features of peptide-HLA complexes (https://academic.oup.com/bioinformatics/article/40/9/btae547/7758065)

---

## 2. Complete mRNA Vaccine Design Pipeline

### End-to-End Workflow

```
Tumor DNA + Normal DNA (WES/WGS)
        |
        v
  [Step 1] Read Alignment (BWA-MEM2 / HISAT2)
        |
        v
  [Step 2] Somatic Variant Calling (Mutect2 + Strelka2 + VarScan2)
        |
        v
  [Step 3] Variant Annotation (VEP - Ensembl Variant Effect Predictor)
        |
        v
  [Step 4] HLA Typing (OptiType for class I, HLA-HD for class II)
        |
        v
  [Step 5] Neoantigen Prediction (pVACseq with NetMHCpan/MHCflurry)
        |
        v
  [Step 6] Neoantigen Prioritization (binding affinity, expression, stability)
        |
        v
  [Step 7] Structure Validation (AlphaFold 3 for peptide-MHC modeling)
        |
        v
  [Step 8] mRNA Sequence Design (LinearDesign / mRNAid)
        |
        v
  [Step 9] mRNA Optimization (codon optimization, UTR design, cap/poly-A)
```

### Key Tools Per Step

#### Step 5: pVACseq (Neoantigen Prediction)
- **Repository:** https://github.com/griffithlab/pVACtools
- **Docs:** https://pvactools.readthedocs.io/
- **Install:** `pip install pvactools` or Docker: `mgibio/pvactools`
- **Input:** Annotated somatic VCF (from VEP) + HLA alleles
- **Output:** Ranked TSV of candidate neoantigens with binding affinities
- **Supported MHC algorithms:** NetMHCpan, NetMHC, NetMHCcons, PickPocket, SMM, SMMPMBEC, MHCflurry, MHCnuggets
- **Filtering criteria:** gene expression, sequence read coverage, binding affinity, agretopicity

#### Step 5 Alternative: nextNEOpi (All-in-one Pipeline)
- **Repository:** https://github.com/icbi-lab/nextNEOpi
- **Integrates:** VEP annotation + OptiType HLA typing + pVACseq neoantigen prediction
- **Input:** Tumor DNA FASTQ + Normal DNA FASTQ + (optional) Tumor RNA FASTQ
- **Output:** Somatic variants, HLA types, neoantigens with affinity scores

#### Neoantigen Selection Tool: NeoDesign
- **Purpose:** Optimal selection of polyvalent neoantigen combinations for vaccine design
- **Reference:** https://academic.oup.com/bioinformatics/article/40/10/btae585/7781681

---

## 3. Genomic Sequencing Analysis Tools (Somatic Mutation Calling)

### Variant Callers (Ranked by Performance)

| Tool | Type | Best For | URL |
|------|------|----------|-----|
| **Mutect2** (GATK4) | SNVs + Indels | Low-frequency mutations (<10% VAF) | https://gatk.broadinstitute.org/hc/en-us/articles/360037593851-Mutect2 |
| **Strelka2** | SNVs + Indels | Speed (17-22x faster than Mutect2), high-frequency mutations (>20%) | https://github.com/Illumina/strelka |
| **VarScan2** | SNVs + Indels | Indel detection (best combined with Mutect2+Strelka) | http://varscan.sourceforge.net/ |
| **MuSE** | SNVs | SNV detection, complements Mutect2 | https://bioinformatics.mdanderson.org/public-software/muse/ |

### Recommended Ensemble Strategy
Best practice from benchmarking studies:
- **SNVs:** MuSE + Mutect2 + Strelka2 (minimum 2 agreeing votes)
- **Indels:** Mutect2 + Strelka2 + VarScan2 (minimum 2 agreeing votes)

### Supporting Tools

| Tool | Purpose | URL |
|------|---------|-----|
| **BWA-MEM2** | Read alignment to reference genome | https://github.com/bwa-mem2/bwa-mem2 |
| **SAMtools** | BAM/SAM file manipulation | https://www.htslib.org/ |
| **VEP** | Variant annotation & effect prediction | https://www.ensembl.org/vep |
| **OptiType** | HLA class I typing from sequencing data | https://github.com/FRED-2/OptiType |
| **HLA-HD** | HLA class I + II typing | https://www.genome.med.kyoto-u.ac.jp/HLA-HD/ |
| **Picard** | Duplicate marking, QC metrics | https://broadinstitute.github.io/picard/ |
| **GATK BaseRecalibrator** | Base quality score recalibration | Part of GATK toolkit |

### GDC (Genomic Data Commons) Reference Pipeline
The NCI GDC implements four parallel variant calling pipelines for harmonization:
- Mutect2, VarScan2, MuSE, and SomaticSniper
- Docs: https://docs.gdc.cancer.gov/Data/Bioinformatics_Pipelines/DNA_Seq_Variant_Calling_Pipeline/

---

## 4. AI Models for Drug Discovery & Molecular Simulation

### Protein Structure Prediction

| Model | Developer | Key Feature | Open Source | URL |
|-------|-----------|-------------|-------------|-----|
| **AlphaFold 3** | DeepMind | Gold standard; proteins + DNA/RNA/ligands | Yes (inference) | https://github.com/google-deepmind/alphafold3 |
| **ESMFold** | Meta | No MSA needed; single-sequence input; faster | Yes | https://github.com/facebookresearch/esm |
| **Chai-1** | Chai Discovery | Proteins + nucleic acids + small molecules | Yes | https://github.com/chaidiscovery/chai-lab |
| **Boltz-2** | MIT/Recursion | Structure + binding affinity in ~20s/GPU | Yes | https://github.com/jwohlwend/boltz |
| **OpenFold** | Community | Open reimplementation of AlphaFold2 | Yes | https://github.com/aqlaboratory/openfold |

### Protein Design (De Novo)

| Model | Purpose | Key Results | URL |
|-------|---------|-------------|-----|
| **RFdiffusion** | De novo protein design from specifications | Influenza binder: Kd ~25nM; PD-L1 binder: Kd ~12nM | https://github.com/RosettaCommons/RFdiffusion |
| **RFdiffusion3** (Nov 2025) | Next-gen: atom-level precision, 10x faster | Handles protein-DNA, small molecules, enzyme design | Same repo |
| **ProteinMPNN** | Sequence design for given backbone structures | Pairs with RFdiffusion for design-then-sequence | https://github.com/dauparas/ProteinMPNN |

### Molecular Docking

| Tool | Approach | Performance | URL |
|------|----------|-------------|-----|
| **DiffDock** | Diffusion generative model for docking | Median RMSD 1.5A, >75% success at <2.0A RMSD | https://github.com/gcorso/DiffDock |
| **AutoDock Vina** | Classical scoring function | Industry standard, widely validated | https://vina.scripps.edu/ |
| **GNINA** | CNN-based scoring for docking | Improved over Vina for flexible targets | https://github.com/gnina/gnina |

### Molecular Dynamics Simulators

| Tool | Strengths | Best For | URL |
|------|-----------|----------|-----|
| **GROMACS** | Fastest single-node MD, GPU-accelerated | General biomolecular MD, speed | https://www.gromacs.org/ |
| **OpenMM** | Python API, GPU-accelerated, customizable force fields | Programmable workflows, ML integration | https://openmm.org/ |
| **NAMD** | Multi-node scaling, petascale simulations | Very large systems (>10M atoms) | https://www.ks.uiuc.edu/Research/namd/ |
| **AMBER** | Best force fields, free energy methods | Free energy perturbation, drug binding | https://ambermd.org/ |
| **OpenMMDL** | OpenMM extension for protein-ligand prep + analysis | Drug discovery protein-ligand simulations | https://github.com/wolberlab/OpenMMDL |

### AI-Accelerated Platforms

| Platform | Description | URL |
|----------|-------------|-----|
| **NVIDIA BioNeMo** | Cloud platform for generative AI in drug discovery (includes ESM, DiffDock, MolMIM) | https://www.nvidia.com/en-us/clara/bionemo/ |
| **Recursion OS** | AI-driven drug discovery platform | https://www.recursion.com/ |

---

## 5. Open-Source mRNA Design Tools

### Sequence Design & Optimization

| Tool | Developer | Key Feature | URL |
|------|-----------|-------------|-----|
| **LinearDesign** | Baidu Research | Simultaneous codon + structure optimization; O(n^3) dynamic programming | https://github.com/LinearDesignSoftware/LinearDesign |
| **mRNAid** | Open source | Integrated platform: codon usage, GC content, MFE, uridine depletion | https://github.com/mRNAid (Docs: https://academic.oup.com/nargab/article/6/1/lqae028/7626522) |

### LinearDesign Details
- **Algorithm:** Lattice parsing from computational linguistics applied to mRNA design
- **Optimizes simultaneously:** codon usage + minimum free energy (MFE) of secondary structure
- **Performance:** Designs optimal mRNA for spike protein in ~11 minutes
- **Results:** Up to 128x higher antibody titers vs. standard codon optimization (mice, COVID-19 + varicella-zoster)
- **Web server:** Available at Baidu Research (https://research.baidu.com/Blog/index-view?id=136)

### mRNAid Details
- **Optimizes:** codon usage, GC content, MFE, uridine depletion, motif exclusion, rare codon exclusion
- **Integrates:** ViennaRNA for MFE optimization + correlated stem-loop prediction
- **Interface:** Web-based UI for interactive design

### Supporting RNA Tools

| Tool | Purpose | URL |
|------|---------|-----|
| **ViennaRNA** | RNA secondary structure prediction (MFE), folding | https://www.tbi.univie.ac.at/RNA/ |
| **RNAfold** | Part of ViennaRNA; predicts MFE structure | Same as above |
| **Codon Optimization Tools** | Various: JCat, OPTIMIZER, CodonW | Multiple |
| **UTR design** | 5' and 3' UTR optimization for translation efficiency | Often custom / proprietary |
| **Cap analogs** | CleanCap (TriLink) for co-transcriptional capping | Commercial |

---

## Integration Map: Full Pipeline Tool Chain

```
TUMOR + NORMAL SEQUENCING DATA (FASTQ)
    |
    |-- BWA-MEM2 (alignment) --> BAM files
    |-- Picard (dedup/QC)
    |-- GATK BaseRecalibrator (BQSR)
    |
    v
SOMATIC VARIANT CALLING
    |-- Mutect2 + Strelka2 + VarScan2 (ensemble, 2/3 vote)
    |
    v
VARIANT ANNOTATION
    |-- VEP (Ensembl Variant Effect Predictor)
    |-- Annotated VCF with protein consequences
    |
    v
HLA TYPING
    |-- OptiType (class I from DNA/RNA)
    |-- HLA-HD (class I + II)
    |
    v
NEOANTIGEN PREDICTION
    |-- pVACseq (uses NetMHCpan, MHCflurry internally)
    |-- Input: annotated VCF + HLA alleles
    |-- Output: ranked neoantigen candidates (TSV)
    |
    v
STRUCTURAL VALIDATION (optional but valuable)
    |-- AlphaFold 3 / MHC-Fine (peptide-MHC 3D structure)
    |-- DiffDock (if small-molecule context needed)
    |
    v
NEOANTIGEN SELECTION
    |-- NeoDesign (optimal polyvalent combination)
    |-- Manual curation / immunologist review
    |
    v
mRNA VACCINE DESIGN
    |-- LinearDesign (codon + structure co-optimization)
    |-- mRNAid (alternative, web-based)
    |-- ViennaRNA (secondary structure verification)
    |
    v
mRNA CONSTRUCT ASSEMBLY
    |-- 5' Cap (CleanCap or ARCA)
    |-- 5' UTR (optimized for translation)
    |-- Signal peptide + neoantigen coding sequences
    |-- 3' UTR (stability elements)
    |-- Poly-A tail (100-150 nt)
    |-- N1-methylpseudouridine substitution (reduced immunogenicity)
```

---

## Key References & Sources

- AlphaFold 3: https://github.com/google-deepmind/alphafold3
- AlphaFold Server: https://alphafoldserver.com/
- pVACtools: https://pvactools.readthedocs.io/
- nextNEOpi: https://github.com/icbi-lab/nextNEOpi
- GATK/Mutect2: https://gatk.broadinstitute.org/
- LinearDesign: https://arxiv.org/abs/2004.10177
- mRNAid: https://academic.oup.com/nargab/article/6/1/lqae028/7626522
- DiffDock: https://github.com/gcorso/DiffDock
- RFdiffusion: https://github.com/RosettaCommons/RFdiffusion
- Boltz-2: https://github.com/jwohlwend/boltz
- GROMACS: https://www.gromacs.org/
- OpenMM: https://openmm.org/
