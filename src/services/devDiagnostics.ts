/**
 * LUXION DEVELOPMENT DIAGNOSTICS
 * 
 * Verifies internal pipeline execution end-to-end:
 * Input received -> Intent detected -> Memory retrieved -> Provider selected ->
 * Provider generated response -> BrainResponse returned -> UI received response -> TTS triggered.
 * 
 * Strict development-only: hidden from normal users in production.
 */

export type PipelineStep =
  | 'input_received'
  | 'intent_detected'
  | 'language_resolved'
  | 'memory_retrieved'
  | 'provider_selected'
  | 'provider_generated'
  | 'brain_response_returned'
  | 'ui_received'
  | 'tts_triggered';

export interface DiagnosticEvent {
  id: string;
  step: PipelineStep;
  timestamp: number;
  label: string;
  details?: Record<string, any>;
}

export interface PipelineTrace {
  id: string;
  query: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  events: DiagnosticEvent[];
  status: 'running' | 'completed' | 'failed';
}

class DiagnosticsTracker {
  private traces: PipelineTrace[] = [];
  private currentTrace: PipelineTrace | null = null;
  private listeners: Set<(traces: PipelineTrace[]) => void> = new Set();
  private enabled: boolean = false;

  constructor() {
    // Enabled in dev mode or with URL flag '?debug=true'
    if (typeof window !== 'undefined') {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const hasDebugParam = window.location.search.includes('debug=true');
      const debugStorage = localStorage.getItem('luxion_dev_debug') === 'true';
      this.enabled = isLocalhost || hasDebugParam || debugStorage;
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
    if (typeof window !== 'undefined') {
      localStorage.setItem('luxion_dev_debug', String(val));
    }
    this.notify();
  }

  public startTrace(query: string): string {
    const id = `trace_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const trace: PipelineTrace = {
      id,
      query,
      startTime: Date.now(),
      events: [],
      status: 'running',
    };
    this.currentTrace = trace;
    this.traces.unshift(trace);
    if (this.traces.length > 20) this.traces.pop();

    this.recordStep('input_received', 'Input received by system', { query });
    return id;
  }

  public recordStep(step: PipelineStep, label: string, details?: Record<string, any>): void {
    if (!this.currentTrace) return;

    const event: DiagnosticEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      step,
      timestamp: Date.now(),
      label,
      details,
    };
    this.currentTrace.events.push(event);

    if (step === 'ui_received' || step === 'brain_response_returned') {
      this.currentTrace.endTime = Date.now();
      this.currentTrace.durationMs = this.currentTrace.endTime - this.currentTrace.startTime;
      this.currentTrace.status = 'completed';
    }

    this.notify();
  }

  public getTraces(): PipelineTrace[] {
    return this.traces;
  }

  public getLatestTrace(): PipelineTrace | null {
    return this.traces[0] || null;
  }

  public clear(): void {
    this.traces = [];
    this.currentTrace = null;
    this.notify();
  }

  public subscribe(cb: (traces: PipelineTrace[]) => void): () => void {
    this.listeners.add(cb);
    cb(this.traces);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb(this.traces));
  }
}

export const devDiagnostics = new DiagnosticsTracker();
