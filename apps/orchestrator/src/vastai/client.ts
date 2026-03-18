/**
 * VAST.ai API client for on-demand GPU compute.
 *
 * Flow: search offers → create instance → wait for ready → run job → copy results → destroy
 */

const VASTAI_BASE = "https://cloud.vast.ai/api/v0";

interface SearchParams {
  gpuName: string;
  minGpuRam?: number;
  minDisk?: number;
  minReliability?: number;
  maxPrice?: number;
}

interface CreateInstanceParams {
  offerId: number;
  image: string;
  disk: number;
  onStartCmd?: string;
  env?: Record<string, string>;
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.VASTAI_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export const vastai = {
  /** Search for available GPU offers */
  async searchOffers(params: SearchParams) {
    const query: Record<string, unknown> = {
      gpu_name: { eq: params.gpuName },
      reliability: { gte: params.minReliability ?? 0.95 },
      gpu_ram: { gte: params.minGpuRam ?? 24 },
      disk_space: { gte: params.minDisk ?? 50 },
    };

    if (params.maxPrice) {
      query.dph_total = { lte: params.maxPrice };
    }

    const res = await fetch(
      `${VASTAI_BASE}/bundles/?q=${encodeURIComponent(JSON.stringify(query))}&order=dph_total&type=ask`,
      { headers: headers() }
    );

    if (!res.ok) throw new Error(`VAST.ai search failed: ${res.status}`);
    const data = (await res.json()) as { offers: any[] };
    return data.offers;
  },

  /** Create a GPU instance from an offer */
  async createInstance(params: CreateInstanceParams) {
    const body = {
      client_id: "me",
      image: params.image,
      disk: params.disk,
      onstart: params.onStartCmd,
      env: params.env,
    };

    const res = await fetch(`${VASTAI_BASE}/asks/${params.offerId}/`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`VAST.ai create instance failed: ${res.status}`);
    return (await res.json()) as { new_contract: number };
  },

  /** Get instance status */
  async getInstance(instanceId: number) {
    const res = await fetch(`${VASTAI_BASE}/instances/${instanceId}/`, {
      headers: headers(),
    });

    if (!res.ok) throw new Error(`VAST.ai get instance failed: ${res.status}`);
    return (await res.json()) as { instances: any[] };
  },

  /** Destroy instance (stop billing) */
  async destroyInstance(instanceId: number) {
    const res = await fetch(`${VASTAI_BASE}/instances/${instanceId}/`, {
      method: "DELETE",
      headers: headers(),
    });

    if (!res.ok) throw new Error(`VAST.ai destroy failed: ${res.status}`);
  },

  /** Wait for instance to be running, with timeout */
  async waitUntilReady(instanceId: number, timeoutMs = 300_000) {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const data = await vastai.getInstance(instanceId);
      const instance = data.instances?.[0];

      if (instance?.actual_status === "running") return instance;
      if (instance?.actual_status === "exited") {
        throw new Error("Instance exited before becoming ready");
      }

      await new Promise((r) => setTimeout(r, 10_000));
    }

    throw new Error(`Instance ${instanceId} did not become ready within ${timeoutMs}ms`);
  },
};

// ── Preset configs for bioinformatics jobs ─────────────

export const GPU_PRESETS = {
  alphafold3: {
    gpuName: "A100_SXM",
    minGpuRam: 80,
    minDisk: 200,
    image: "jurgjn/alphafold3",
    maxPrice: 1.5,
  },
  boltz2: {
    gpuName: "L40S",
    minGpuRam: 48,
    minDisk: 50,
    image: "nvcr.io/nvidia/nim/boltz2",
    maxPrice: 0.5,
  },
  parabricks: {
    gpuName: "A100_SXM",
    minGpuRam: 40,
    minDisk: 200,
    image: "nvcr.io/nvidia/clara/clara-parabricks:latest",
    maxPrice: 1.0,
  },
  diffdock: {
    gpuName: "L40S",
    minGpuRam: 24,
    minDisk: 30,
    image: "nvcr.io/nvidia/nim/diffdock:latest",
    maxPrice: 0.5,
  },
} as const;
