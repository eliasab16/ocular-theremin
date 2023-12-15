import { Component, OnDestroy, OnInit } from '@angular/core';
import * as handTrack from 'handtrackjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'digital_theremin';
  canvas: HTMLCanvasElement | null = null;
  context: CanvasRenderingContext2D | null = null;
  videoRunning = false;
  model: any;
  video: HTMLVideoElement | null = null;
  allowedGestures = [1, 2, 4] // 1: open, 2: closed, 4: point 
  videoWidth = 800;
  videoHeight = this.videoWidth * (3/4);
  centerX = this.videoWidth / 2;
  centerY = this.videoHeight / 2;

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
    handTrack.stopVideo(this.video);
  }

  async runDetection(video: any) {
    this.model.detect(video).then((predictions: any) => {
      const filteredPreds = predictions.filter((pred: any) => {
        if (this.allowedGestures.includes(pred.class)) {
          return pred;
        }
      })
      // console.log(filteredPreds[0]);
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
    const predCenterX = Number(prediction.bbox[0] + (prediction.bbox[2]/2));
    const predCenterY = Number(prediction.bbox[1] + (prediction.bbox[3]/2));

    const xDiff = predCenterX - this.centerX;
    const yDiff = predCenterY - this.centerY;

    console.log(`x diff`, xDiff);
    console.log(`y diff`, yDiff);
  }

  async ngOnDestroy() {
    this.model.dispose();
  }
}
