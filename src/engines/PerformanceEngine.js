// ============================================================
// ROSS AI — Performance & Device Detection Engine
// ============================================================

class PerformanceEngine {
  constructor() {
    this.profile = null;
    this.metrics = { responseTimes: [], totalTokens: 0, totalRequests: 0 };
  }

  async detect() {
    const profile = {
      hasWebGPU: false,
      hasWebGL2: false,
      gpuInfo: 'Unknown',
      cpuCores: navigator.hardwareConcurrency || 4,
      memoryGB: navigator.deviceMemory || 4,
      connection: navigator.connection?.effectiveType || '4g',
      isMobile: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent),
      isOnline: navigator.onLine,
      platform: navigator.platform || 'Unknown',
      userAgent: navigator.userAgent.slice(0, 80),
      tier: 'medium',
      recommendations: [],
    };

    // WebGPU check
    try {
      if (navigator.gpu) {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          profile.hasWebGPU = true;
          const info = await adapter.requestAdapterInfo?.();
          profile.gpuInfo = info?.description || info?.device || 'WebGPU capable';
        }
      }
    } catch {}

    // WebGL2 check
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      if (gl) {
        profile.hasWebGL2 = true;
        profile.gpuRenderer = gl.getParameter(gl.RENDERER);
        profile.gpuVendor = gl.getParameter(gl.VENDOR);
        if (!profile.gpuInfo || profile.gpuInfo === 'Unknown') {
          profile.gpuInfo = `${profile.gpuVendor} — ${profile.gpuRenderer}`.slice(0, 80);
        }
      }
    } catch {}

    // Determine tier
    const score = (profile.hasWebGPU ? 3 : 0) + (profile.memoryGB >= 8 ? 2 : profile.memoryGB >= 4 ? 1 : 0) + (profile.cpuCores >= 8 ? 2 : profile.cpuCores >= 4 ? 1 : 0);

    if (score >= 5) profile.tier = 'high';
    else if (score >= 2) profile.tier = 'medium';
    else profile.tier = 'low';

    // Recommendations
    if (!profile.hasWebGPU) profile.recommendations.push('Enable WebGPU in browser flags for better performance');
    if (profile.isMobile) profile.recommendations.push('Mobile device — optimized for battery efficiency');
    if (profile.memoryGB < 4) profile.recommendations.push('Limited RAM — using lightweight models');
    if (profile.tier === 'high') profile.recommendations.push('High-performance device — all features at full capacity');

    this.profile = profile;
    return profile;
  }

  recordResponse(ms, tokens) {
    this.metrics.responseTimes.push(ms);
    if (this.metrics.responseTimes.length > 50) this.metrics.responseTimes.shift();
    this.metrics.totalTokens += tokens;
    this.metrics.totalRequests++;
  }

  getAvgResponseTime() {
    const { responseTimes } = this.metrics;
    if (!responseTimes.length) return 0;
    return Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
  }

  getStats() {
    return {
      ...this.profile,
      avgResponseMs: this.getAvgResponseTime(),
      totalTokens: this.metrics.totalTokens,
      totalRequests: this.metrics.totalRequests,
    };
  }
}

export const performanceEngine = new PerformanceEngine();
export default PerformanceEngine;
