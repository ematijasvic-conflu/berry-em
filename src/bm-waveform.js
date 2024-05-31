 class BMWaveform {
  constructor(canvas, color, maxValue, step) {
    this.canvas = canvas;
    this.color = color;
    this.maxValue = maxValue;
    this.step = step;

    this.context = this.canvas.getContext("2d");
    this.context.strokeStyle = this.color;
    this.lineWidth = 1.2;
    this.lineCap = "round";

    this.prevPointX = 0;
    this.prevPointY = this.canvas.height / 2;
    this.measurementArray = [];
    this.imageNumberArray = [];
    this.imageNumber = 0;
    this.imageArrayLength = false;
    this.curPointX;
    this.arrayIsFull = false;
    this.imageDifference = 0;
    this.curPointY;
    this.lastElementAdded = false;
  }

  add(yValue) {
    this.curPointX = this.prevPointX + this.step;

    if (this.curPointX >= this.canvas.width) {
      this.measurementArray.push(this.canvas.toDataURL());
      this.imageNumber++;
      // console.log("imageNumber if", this.imageNumber);
      this.imageNumberArray.push(this.imageNumber);

      this.prevPointX = 0;
      this.curPointX = 0;

      this.context.beginPath();
      this.context.fillRect(0, 0, 5, this.canvas.height);
      this.context.stroke();
    } else {
      this.curPointY =
        this.canvas.height - (yValue * this.canvas.height) / this.maxValue;
      this.curPointY = this.curPointY * 0.98;

      this.context.beginPath();
      this.context.fillRect(this.curPointX, 0, 5, this.canvas.height);
      this.context.moveTo(this.prevPointX, this.prevPointY);
      this.context.lineTo(this.curPointX, this.curPointY);
      this.context.stroke();
    }

    if (this.imageNumberArray.length > 0 && !this.imageArrayLength) {
      // console.log("image numbar array", this.imageNumberArray);
      this.imageArrayLength = true;
      this.imageNumberArray = [];
    }
    this.prevPointX = this.curPointX;
    this.prevPointY = this.curPointY;
  }

  addArray(arr) {
    while (arr.length > 0) {
      this.add(arr.shift());
    }
  }

  async saveImageBase64(measureArray = new Array()) {
    var canvas = document.createElement("canvas");
    canvas.width = 1200 * measureArray.length;
    const context = canvas.getContext("2d");

    var xPosition = 0;

    // console.log("measure array", measureArray.length);

    var loadImages = measureArray.map((base64, index) => {
      return new Promise((resolve, reject) => {
        var img = new Image();
        img.src = base64;
        img.onload = () => {
          context.drawImage(img, xPosition, 0);
          xPosition += 1200;

          resolve();
        };

        img.onerror = reject;
      });
    });

    try {
      await Promise.all(loadImages);
      const measureBase64 = canvas.toDataURL();
      return measureBase64;
    } catch (err) {
      console.error("Failed to load images:", err);
      return null;
    }
  }
}
