class BMPatientMonitor {
  UUID_SERVICE_COMM = "49535343-fe7d-4ae5-8fa9-9fafd205e455";
  UUID_CHARACTER_RECEIVE = "49535343-1e4d-4bd9-ba61-23c647249616";
  UUID_CHARACTER_SEND = "49535343-8841-43f4-a8d4-ecbe34729bb3";

  constructor(parser, refreshStatus) {
    this.device = null;
    this.chReceive = null;
    this.chSend = null;
    this.server = null;
    this.parser = parser;
    this.refreshStatus = refreshStatus;
    this.reconnectTime = 0;
  }

  sleep(mseconds) {
    return new Promise((resolve) => {
      setTimeout(resolve, mseconds);
    });
  }

  startNotify() {
    this.chReceive.addEventListener("characteristicvaluechanged", (e) => {
      this.parser.addData(e.target.value);
    });
    this.chReceive.startNotifications();
  }

  startNIBP() {
    if (this.chSend != null) {
      this.chSend.writeValue(
        new Uint8Array([0x55, 0xaa, 0x04, 0x02, 0x01, 0xf8])
      );
    }
  }

  async connect() {
    this.device = null;
    this.chReceive = null;
    this.chSend = null;
    this.server = null;

    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "BerryMed" }],
      optionalServices: [this.UUID_SERVICE_COMM],
    });

    this.device.addEventListener("gattserverdisconnected", () => {
      this.refreshStatus("Disconnected");
      // console.log("bm-patient-monitor: disconnected.");
    });

    while (this.chReceive == null && this.reconnectTime <= 5) {
      // console.log("bm-patient-monitor: ", "connect time " + this.reconnectTime);
      this.refreshStatus("Connecting to " + this.device.name);

      try {
        this.server = await this.device.gatt.connect();
        // console.log("bm-patient-monitor: ", this.server);

        const service = await this.server.getPrimaryService(
          this.UUID_SERVICE_COMM
        );
        // console.log("bm-patient-monitor: ", service);

        this.chReceive = await service.getCharacteristic(
          this.UUID_CHARACTER_RECEIVE
        );
        // console.log("bm-patient-monitor: recv - ", this.chReceive);

        this.chSend = await service.getCharacteristic(this.UUID_CHARACTER_SEND);
        // console.log("bm-patient-monitor: send - ", this.chSend);
      } catch (e) {
        // console.log("bm-patient-monitor: ", this.chReceive);
      }

      this.sleep(500);
      this.reconnectTime += 1;
    }

    this.reconnectTime = 0;

    if (this.chReceive != null) {
      this.startNotify();
      this.refreshStatus("Connected to " + this.device.name);
      // console.log("bm-patient-monitor: " + "start notify");
    } else {
      this.refreshStatus("Not Connect");
    }
  }
}
