import { Component, OnDestroy, OnInit } from '@angular/core';
import * as handTrack from 'handtrackjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'digital_theremin';
  // Video properties
  canvas: HTMLCanvasElement | null = null;
  context: CanvasRenderingContext2D | null = null;
  videoRunning = false;
  model: any;
  video: HTMLVideoElement | null = null;
  allowedGestures = [1, 2, 4] // 1: open, 2: closed, 4: point 
  videoWidth = 800;
  videoHeight = this.videoWidth * (3/4);

  // Audio properties
  oscillator!: OscillatorNode; // controls the frequency
  gainNode!: GainNode; // controls the volume
  audioContext!: AudioContext;

  modelParams = {
    flipHorizontal: true,
    outputStride: 16,
    imageScaleFactor: 1,
    maxNumBoxes: 2,
    iouThreshold: 0.2,
    scoreThreshold: 0.7,
    modelType: "ssd320fpnlite",
    modelSize: "large",
    bboxLineWidth: "2",
    fontSize: 17,
  };

  async ngOnInit() {
    this.model = await handTrack.load(this.modelParams);
    this.canvas = document.getElementById("canvas") as HTMLCanvasElement;
    this.context = this.canvas.getContext("2d");
  }

  async startPlaying() {
    this.video = document.getElementById('trackingVideo') as HTMLVideoElement;
    this.video!.style.width = this.videoWidth + 'px';

    handTrack.startVideo(this.video).then((status: any) => {
      this.audioContext = new AudioContext();
      this.gainNode = this.audioContext.createGain();
      this.oscillator = this.audioContext.createOscillator();

      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination); 

      this.oscillator.frequency.value = 0;
      this.oscillator.start();

      if (status) {
        this.videoRunning = true;
        console.log(status);
        this.runDetection(this.video);
      } else {
          console.log("Please enable video");
      }
    })
  }

  stopPlaying() {
    this.videoRunning = false;
    this.oscillator!.stop();
    this.oscillator!.disconnect();
    handTrack.stopVideo(this.video);
  }

  async runDetection(video: any) {
    this.model.detect(video).then((predictions: any) => {
      const filteredPreds = predictions.filter((pred: any) => {
        if (this.allowedGestures.includes(pred.class)) {
          return pred;
        }
      })
      this.playSound(filteredPreds[0]);

      this.model.renderPredictions(filteredPreds, this.canvas, this.context, video);
      if (this.videoRunning) {
        requestAnimationFrame(() => this.runDetection(video));
      }
    });
  }

  async playSound(prediction: any) {
    if (!prediction) {
      return;
    }
    if (prediction.class == 2) {
      this.oscillator!.frequency.value = 0;
    } else {
      const freqFactor = prediction.class == 1 ? 1 : 0.5;
      const predCenterX = Number(prediction.bbox[0] + (prediction.bbox[2]/2));
      const predCenterY = Number(prediction.bbox[1] + (prediction.bbox[3]/2));

      const xDist = (predCenterX/this.videoWidth)
      const yDist = 1-(predCenterY/this.videoHeight)

      const freq = (200 + 500 * xDist) * freqFactor;
      console.log(yDist, freq);
      this.oscillator!.frequency.value = freq;
      this.gainNode.gain.value = yDist;
    }
  }

  async ngOnDestroy() {
    this.model.dispose();
  }
}
