class BMDataParser {
  PACKAGE_MIN_LENGTH = 4;
  PACKAGE_HEADER = [0x55, 0xaa];
  PACKAGE_CALLBACKS = [
    //package_type     callback_name                   callback_func
    0x01,
    "on_ecg_waveform_received",
    null,
    0x02,
    "on_ecg_params_received",
    null,
    0x03,
    "on_nibp_params_received",
    null,
    0x04,
    "on_spo2_params_received",
    null,
    0x05,
    "on_temp_params_received",
    null,
    0x30,
    "on_ecg_peak_received",
    null,
    0x31,
    "on_spo2_peak_received",
    null,
    0xfc,
    "on_firmware_ver_received",
    null,
    0xfd,
    "on_hardware_ver_received",
    null,
    0xfe,
    "on_spo2_waveform_received",
    null,
    0xff,
    "on_resp_waveform_received",
    null,
  ];

  constructor() {
    this.rawBuffer = [];
  }

  registerCallback(name, callback) {
    var callbackNameIndex = this.PACKAGE_CALLBACKS.indexOf(name);
    if (callbackNameIndex != -1) {
      this.PACKAGE_CALLBACKS[callbackNameIndex + 1] = callback;
    }
  }

  addData(arr) {
    this.rawBuffer.push(
      ...Array.prototype.slice.call(new Uint8Array(arr.buffer))
    );

    while (this.rawBuffer.length >= this.PACKAGE_MIN_LENGTH) {
      let packageStartIndex = -1;
      for (let i = 0; i < this.rawBuffer.length - 1; i++) {
        if (
          this.rawBuffer[i] === this.PACKAGE_HEADER[0] &&
          this.rawBuffer[i + 1] === this.PACKAGE_HEADER[1]
        ) {
          packageStartIndex = i;
          break;
        }
      }

      if (packageStartIndex === -1) {
        this.rawBuffer.splice(0, this.rawBuffer.length - 1);
        continue;
      }

      let packageEndIndex =
        packageStartIndex + this.rawBuffer[packageStartIndex + 2] + 2;
      if (packageEndIndex > this.rawBuffer.length) {
        break;
      }

      let packageData = this.rawBuffer.slice(
        packageStartIndex,
        packageEndIndex
      );
      this.rawBuffer.splice(0, packageEndIndex);

      if (this.checkSum(packageData)) {
        this.parsePackage(packageData);
      }
    }
  }

  checkSum(pkg) {
    var sum = 0;
    for (let i = 2; i < pkg.length - 1; i++) {
      sum += pkg[i];
    }
    sum = ~sum & 0xff;
    return sum === pkg[pkg.length - 1];
  }

  parsePackage(pkg) {
    var typeIndex = this.PACKAGE_CALLBACKS.indexOf(pkg[3]);
    if (typeIndex != -1) {
      const callbackName = this.PACKAGE_CALLBACKS[typeIndex + 1];
      const callback = this.PACKAGE_CALLBACKS[typeIndex + 2];

      if (callback == null) return;

      switch (callbackName) {
        case "on_ecg_waveform_received":
          callback(pkg[4]);
          break;

        case "on_ecg_params_received":
          callback(
            /*states*/ pkg[4],
            /*heart rate*/ pkg[5],
            /*resp rate*/ pkg[6]
          );
          break;

        case "on_nibp_params_received":
          callback(
            /*states*/ pkg[4],
            /*cuff pressure*/ pkg[5] * 2,
            /*SYS*/ pkg[6],
            /*MEAN*/ pkg[7],
            /*DIA*/ pkg[8]
          );
          break;

        case "on_spo2_params_received":
          callback(/*states*/ pkg[4], /*SpO2*/ pkg[5], /*pulse rate*/ pkg[6]);
          break;

        case "on_temp_params_received":
          callback(
            /*states*/ pkg[4],
            /*temperature*/ (pkg[5] * 10 + pkg[6]) / 10.0
          );
          break;

        case "on_ecg_peak_received":
          callback();
          break;

        case "on_spo2_peak_received":
          callback();
          break;

        case "on_firmware_ver_received":
          break;

        case "on_hardware_ver_received":
          break;

        case "on_spo2_waveform_received":
          callback(/*ppg*/ pkg[4]);
          //console.log(pkg[4]);
          break;

        case "on_resp_waveform_received":
          callback(/*ecg*/ pkg[4]);
          break;
      }
    }
  }
}
