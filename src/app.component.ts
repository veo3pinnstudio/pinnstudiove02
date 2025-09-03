// FIX: Switched to an inline template and removed API key management from the component UI.
import { Component, ChangeDetectionStrategy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini.service';

export interface VideoJob {
  id: number;
  prompt: string;
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'stopped';
  videoUrl?: string;
  blob?: Blob;
  error?: string;
  progressMessage: string;
}

@Component({
  selector: 'app-root',
  // FIX: Re-introduced API key input field in the inline template.
  template: `
    <main class="bg-gray-900 text-gray-100 min-h-screen p-4 sm:p-8 font-sans">
      <div class="max-w-4xl mx-auto">
        <header class="text-center mb-8">
          <h1 class="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Gemini Video Batch Generator
          </h1>
          <p class="text-gray-400 mt-2">Generate multiple videos from a list of prompts using the Gemini API.</p>
        </header>

        <section class="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
          <h2 class="text-2xl font-semibold mb-4 text-gray-200">1. Configure &amp; Enter Prompts</h2>
          
          <div class="mb-6">
            <label for="apiKey" class="block text-sm font-medium text-gray-300 mb-2">Google AI API Key</label>
            <input 
              id="apiKey"
              type="text" 
              placeholder="Enter your API Key here"
              [value]="apiKey()"
              (input)="onApiKeyInput($event)"
              [disabled]="isGenerating()"
              class="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
            />
            <p class="text-xs text-gray-500 mt-2">Your API key is used directly in your browser and is not stored on any server.</p>
          </div>

          <div>
            <label for="prompts" class="block text-sm font-medium text-gray-300 mb-2">Prompts (One per line)</label>
            <textarea
              id="prompts"
              [value]="prompts()"
              (input)="onPromptsInput($event)"
              [disabled]="isGenerating()"
              class="w-full h-40 p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-100 transition"
              placeholder="e.g., A cat wearing a tiny hat programming on a laptop&#10;A majestic dragon flying through a neon city"
            ></textarea>
          </div>
        </section>

        <section class="text-center mb-8">
          @if (!isGenerating()) {
            <button
              (click)="startGeneration()"
              [disabled]="!canStart()"
              class="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-full hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg text-lg"
            >
              Start Generation
            </button>
          } @else {
            <button
              (click)="stopGeneration()"
              class="px-8 py-3 bg-red-600 text-white font-bold rounded-full hover:bg-red-700 transition-all shadow-lg text-lg"
            >
              Stop Generation
            </button>
          }
        </section>

        @if (videoJobs().length > 0) {
          <section>
            <h2 class="text-2xl font-semibold mb-4 text-gray-200">2. Generation Progress</h2>
            <div class="space-y-4">
              @for (job of videoJobs(); track job.id) {
                <div class="bg-gray-800 p-4 rounded-lg shadow-md flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div class="flex-grow">
                    <p class="font-mono text-sm text-gray-400 break-all">{{ job.prompt }}</p>
                    <div class="flex items-center gap-2 mt-2">
                      <span
                        class="px-2 py-1 text-xs font-semibold rounded-full"
                        [class]="{
                          'bg-yellow-500 text-yellow-900': job.status === 'generating' || job.status === 'pending',
                          'bg-green-500 text-green-900': job.status === 'completed',
                          'bg-red-500 text-red-900': job.status === 'failed',
                          'bg-gray-500 text-gray-900': job.status === 'stopped'
                        }"
                      >
                        {{ job.status | uppercase }}
                      </span>
                      <p class="text-sm text-gray-300">{{ job.progressMessage }}</p>
                    </div>
                    @if (job.status === 'failed' && job.error) {
                      <p class="text-red-400 text-sm mt-2">{{ job.error }}</p>
                    }
                  </div>
                  @if (job.status === 'completed' && job.videoUrl) {
                    <div class="flex-shrink-0 flex items-center gap-4 mt-4 md:mt-0">
                      <video [src]="job.videoUrl" controls class="w-48 h-auto rounded"></video>
                      <button (click)="downloadVideo(job)" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">Download</button>
                    </div>
                  }
                  @if (job.status === 'generating') {
                    <div class="w-full md:w-auto mt-4 md:mt-0">
                      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                    </div>
                  }
                </div>
              }
            </div>
          </section>
        }
      </div>
    </main>
  `,
  styleUrls: [], // No separate CSS file needed, using Tailwind via template
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
})
export class AppComponent {
  private geminiService = inject(GeminiService);
  
  // FIX: Added signal for API key.
  apiKey = signal<string>('');
  prompts = signal<string>('');
  isGenerating = signal<boolean>(false);
  videoJobs = signal<VideoJob[]>([]);
  
  // A signal to stop the generation process
  private shouldStop = signal<boolean>(false);

  // FIX: `canStart` now depends on the API key being present.
  canStart = computed(() => this.prompts().trim() !== '' && this.apiKey().trim() !== '' && !this.isGenerating());

  progressMessages = [
    "Warming up the digital director's chair...",
    "Teaching pixels to dance...",
    "Brewing a fresh pot of creativity...",
    "Herding cats into a perfect scene...",
    "Polishing the lens of imagination...",
    "Untangling cinematic spaghetti code...",
    "Requesting render farm gnomes for assistance...",
    "Almost there, just adding extra sparkle...",
    "Finalizing the blockbuster hit...",
  ];

  async startGeneration(): Promise<void> {
    if (!this.canStart()) return;

    this.isGenerating.set(true);
    this.shouldStop.set(false);
    
    const promptLines = this.prompts().split('\n').map(p => p.trim()).filter(p => p.length > 0);
    const initialJobs: VideoJob[] = promptLines.map((prompt, index) => ({
      id: Date.now() + index,
      prompt,
      status: 'pending',
      progressMessage: 'Waiting in queue...'
    }));
    this.videoJobs.set(initialJobs);

    for (const job of this.videoJobs()) {
      if (this.shouldStop()) {
        this.videoJobs.update(jobs => jobs.map(j => j.id === job.id ? { ...j, status: 'stopped', progressMessage: 'Cancelled' } : j));
        continue;
      }

      this.videoJobs.update(jobs => jobs.map(j => j.id === job.id ? { ...j, status: 'generating', progressMessage: this.getRandomProgressMessage() } : j));
      
      let progressInterval: any;
      try {
        progressInterval = setInterval(() => {
          this.videoJobs.update(jobs => jobs.map(j => j.id === job.id ? { ...j, progressMessage: this.getRandomProgressMessage() } : j));
        }, 8000);

        // FIX: Pass API key to the service call.
        const { videoUrl, blob } = await this.geminiService.generateVideo(job.prompt, this.apiKey(), this.shouldStop);
        clearInterval(progressInterval);
        
        if (videoUrl && blob) {
          this.videoJobs.update(jobs => jobs.map(j => j.id === job.id ? { ...j, status: 'completed', videoUrl, blob, progressMessage: 'Completed!' } : j));
        } else {
          throw new Error("Generation resulted in no video URL.");
        }
      } catch (e: any) {
        clearInterval(progressInterval);
        this.videoJobs.update(jobs => jobs.map(j => j.id === job.id ? { ...j, status: 'failed', error: e.message, progressMessage: 'Failed!' } : j));
      }
    }

    this.isGenerating.set(false);
  }

  stopGeneration(): void {
    this.shouldStop.set(true);
    this.isGenerating.set(false); // Allow starting a new session
    // Update any remaining pending jobs to stopped status
    this.videoJobs.update(jobs => jobs.map(j => j.status === 'pending' ? {...j, status: 'stopped', progressMessage: 'Cancelled'} : j));
  }
  
  // FIX: Added method to handle API key input changes.
  onApiKeyInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.apiKey.set(input.value);
  }

  onPromptsInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.prompts.set(textarea.value);
  }

  downloadVideo(job: VideoJob): void {
    if (!job.blob || !job.videoUrl) return;
    const a = document.createElement('a');
    a.href = job.videoUrl;
    // Sanitize prompt for filename
    const fileName = job.prompt.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
    a.download = `${fileName}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  
  private getRandomProgressMessage(): string {
    return this.progressMessages[Math.floor(Math.random() * this.progressMessages.length)];
  }
}
