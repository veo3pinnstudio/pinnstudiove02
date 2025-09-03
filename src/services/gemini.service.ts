// FIX: Import `GenerateVideosOperation` for correct typing of video generation operations.
import { Injectable } from '@angular/core';
import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // FIX: Updated to accept an API key to instantiate the GenAI client on-demand.
  async generateVideo(prompt: string, apiKey: string, stopSignal: () => boolean): Promise<{ videoUrl: string | null; blob: Blob | null }> {
    if (!prompt) {
      throw new Error('Prompt is required.');
    }
    if (!apiKey) {
      throw new Error('API Key is required.');
    }
    
    // FIX: Initialize GoogleGenAI with the user-provided API key.
    const ai = new GoogleGenAI({ apiKey });

    // FIX: Use the correct `GenerateVideosOperation` type for the operation variable.
    let operation: GenerateVideosOperation = await ai.models.generateVideos({
      model: 'veo-2.0-generate-001',
      prompt: prompt,
      config: {
        numberOfVideos: 1
      }
    });

    while (!operation.done) {
      if (stopSignal()) {
        throw new Error('Video generation was stopped by the user.');
      }
      await this.delay(10000); // Wait 10 seconds before polling again
      operation = await ai.operations.getVideosOperation({ operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error('Video generation finished but no download link was found.');
    }

    const separator = downloadLink.includes('?') ? '&' : '?';
    // FIX: Use the provided API key for fetching the video.
    const videoUrlWithKey = `${downloadLink}${separator}key=${apiKey}`;
    
    // Fetch the video as a blob for download using the native fetch API
    try {
      const response = await fetch(videoUrlWithKey);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to fetch video file. Status: ${response.status}`, errorText);
        // The error text from the API might be helpful to the user
        throw new Error(`Download failed: ${response.status}. ${errorText.substring(0, 100)}`);
      }
      const blob = await response.blob();
      return { videoUrl: URL.createObjectURL(blob), blob: blob };
    } catch (error: any) {
       console.error('Failed to fetch video blob:', error);
       // Re-throw a user-friendly error that might include info from the fetch error.
       throw new Error(error.message || 'Failed to download the generated video file. Check browser console for details.');
    }
  }
}
