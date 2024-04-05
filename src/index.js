document.addEventListener("DOMContentLoaded", () => {
  window.addEventListener('resize', fitButtons);
  fitButtons()
  fillPatientData();
  document.getElementById("bluetoothImage").addEventListener("click", () => {
    onBtnSearchClick();
  });

  document.getElementById("btnEcg").addEventListener("click", () => {
    onBtnEcgClick();
  });

  document.getElementById("btnNibp").addEventListener("click", () => {
    onBtnNIBPClick();
  });

  document.getElementById("btnSpo2").addEventListener("click", () => {
    onBtnSpo2Click();
  });
  document.getElementById("btnTemp").addEventListener("click", () => {
    stopTemperature();
  });
  const txBluetoothStatus = document.getElementById("bluetooth-status");

  const waveformECG = new BMWaveform(document.getElementById("waveform-ecg"), "red", 250, 1);
  const waveformSpO2 = new BMWaveform(document.getElementById("waveform-spo2"), "red", 100, 3);
  const waveformRESP = new BMWaveform(document.getElementById("waveform-resp"), "yellow", 250, 3);

});

const fitButtons = () => {
  let parametersBoxHeigth = document.querySelector(".parameter-box").offsetHeight
  let btns = Array.from(document.getElementsByClassName("item-settings-conainer"))
  btns.map(b => { b.style.height = `${parametersBoxHeigth}px` })
}

const fillPatientData = () => {
  const queryString = window.location.search;
  const params = new URLSearchParams(queryString);
  const data = params.get("d");
  const divPatient = document.getElementById("patient");

  divPatient.innerHTML = descryptData(data);
};

const descryptData = (data) => {
  //TODO : Trabajar con url encriptada
  let parts = data.split("-");
  let name = parts[0]
  let age = parts[1]
  let date = parts[2]
  let dataPatient = ''
  if (name.length > 0) dataPatient += `Paciente: ${name}`
  if (age > 0) dataPatient += ` - Edad: ${age} años`
  if (date.length > 0) dataPatient += ` - Fecha: ${date}`
  return dataPatient;
};

// const txBluetoothStatus = document.getElementById("bluetooth-status");

// const waveformECG = new BMWaveform(document.getElementById("waveform-ecg"), "red", 250, 1);
// const waveformSpO2 = new BMWaveform(document.getElementById("waveform-spo2"), "red", 100, 3);
// const waveformRESP = new BMWaveform(document.getElementById("waveform-resp"), "yellow", 250, 3);

const paramHeartRate = document.getElementById("parameter-heart-rate");
const paramNIBP = document.getElementById("parameter-nibp");
const paramSpO2 = document.getElementById("parameter-spo2");
const paramPulseRate = document.getElementById("parameter-pulse-rate");
const paramTemperature = document.getElementById("parameter-temperature");
const paramRespRate = document.getElementById("parameter-resp-rate");

let heartRateValue = "";
let respRateValue = "";
let sysValue = "";
let diaValue = "";
let spo2Value = "";
let pulseRateValue = "";
let temperatureValue = "";

let spo2StartArray = false;
let saveEcgImageExecuted = false;
let saveNibpDataExecuted = false;

var calledSpo2Image = false;

let counterSpo2 = 0;
let counterEcg = 0;

var dataParser = new BMDataParser();
var patientMonitor = new BMPatientMonitor(dataParser, refreshBluetoothStatus);

var ecgWaveformBuf = [];
var spo2WaveformBuf = [];
var respWaveformBuf = [];

var waveforms = [
  { waveform: waveformECG, buffer: ecgWaveformBuf, slice_size: 10 },
  { waveform: waveformSpO2, buffer: spo2WaveformBuf, slice_size: 2 },
  { waveform: waveformRESP, buffer: respWaveformBuf, slice_size: 2 },
];

dataParser.registerCallback("on_ecg_waveform_received", (amp) => {
  if (counterEcg > 0) {
    ecgWaveformBuf.push(amp);
  }
});

dataParser.registerCallback("on_spo2_waveform_received", (amp) => {
  if (counterSpo2 > 0) {
    spo2WaveformBuf.push(amp);
  }
});

dataParser.registerCallback("on_resp_waveform_received", (amp) => {
  if (counterEcg > 0) {
    respWaveformBuf.push(amp);
  }
});

function onBtnEcgClick() {
  let counterEcg = 0;
  let saveEcgDataExecuted = false;

  dataParser.registerCallback(
    "on_ecg_params_received",
    (states, heartRate, respRate) => {
      console.log("HR(bpm)", heartRate);
      console.log("RESP(brpm)", respRate);
      heartRateValue = heartRate;
      respRateValue = respRate;
      paramHeartRate.innerHTML = heartRate === 0 ? "- -" : heartRate;
      paramRespRate.innerHTML = heartRate === 0 ? "- -" : respRate;

      if (counterEcg < 30 && heartRate !== 0 && respRate !== 0) {
        saveEcg();
        counterEcg++;
        console.log("countEcg", counterEcg);
        saveEcgDataExecuted = true;
      }

      if (counterEcg === 30 && saveEcgDataExecuted) {
        setTimeout(async function () {
          await saveEcgImage();
          await saveRespImage();
          saveEcgDataExecuted = false;
        }, 5000);
      }
    }
  );
}

function onBtnSpo2Click() {
  let saveSpo2DataExecuted = false;
  spo2StartArray = false;

  dataParser.registerCallback(
    "on_spo2_params_received",
    async (states, spo2, pulseRate) => {
      console.log("SpO2(%)", spo2);
      console.log("PR(bpm)", pulseRate);
      spo2Value = spo2;
      pulseRateValue = pulseRate;
      console.log("SpO2 Value", spo2Value);
      console.log("PR(bpm) Value", pulseRateValue);
      paramSpO2.innerHTML = spo2 === 127 ? "- -" : spo2;
      paramPulseRate.innerHTML = pulseRate === 255 ? "- -" : pulseRate;

      if (counterSpo2 <= 30 && spo2 !== 127 && pulseRate !== 255) {
        saveSpo2();
        counterSpo2++;
        console.log("counter spo2", counterSpo2);

        saveSpo2DataExecuted = true;
      }

      if (counterSpo2 === 30) {
        setTimeout(async function () {
          await saveSpo2Image();
          saveSpo2DataExecuted = false;
        }, 5000);
      }
    }
  );
}

let counterTemperature = null;

document.getElementById("stop").addEventListener("click", stopTemperature);

function onBtnTemperatureClick() {
  dataParser.registerCallback(
    "on_temp_params_received",
    (states, temperature) => {
      console.log("Temp(°C)", temperature);
      temperatureValue = temperature;
      paramTemperature.innerHTML = temperature === 0 ? "- -.-" : temperature;
      if (!counterTemperature && temperature !== 0) {
        counterTemperature = setInterval(saveTemperature, 1000);
      }
    }
  );
}

function stopTemperature() {
  clearInterval(counterTemperature);
}

setInterval(updateWaveforms, 40);

function onBtnSearchClick() {
  patientMonitor.connect();
}

function onBtnNIBPClick() {
  patientMonitor.startNIBP();

  let saveNibpDataExecuted = false;

  dataParser.registerCallback(
    "on_nibp_params_received",
    (states, cuff, sys, mean, dia) => {
      console.log("NIBP(mmHg) Sys", sys);
      console.log("NIBP(mmHg) Dia", dia);
      sysValue = sys;
      diaValue = dia;
      paramNIBP.innerHTML =
        sys === 0 || dia === 0 ? "- - -/- -" : sys + "/" + dia;

      if (sys !== 0 && dia !== 0 && !saveNibpDataExecuted) {
        saveNibp();
        saveNibpDataExecuted = true;
      }
    }
  );
}

function saveEcg() {
  console.log("HeartRateValue", heartRateValue);
  console.log("RespRateValue", respRateValue);

  let values = {
    EcgHeartRate: heartRateValue,
    EcgRespRate: respRateValue,
  };

  let headers = new Headers();

  headers.append("Content-Type", "application/json");
  headers.append("Accept", "application/json");

  //http://localhost:8080/BerryJavaPostgreSQL/rest/EcgCreate

  fetch("http://localhost:8080/GuardiaJava/rest/EcgCreate", {
    method: "POST",
    body: JSON.stringify(values),
    headers: headers,
  })
    .then((response) => response)
    .then((json) => console.log(json))
    .catch((err) => console.log(err));
}

function saveNibp() {
  console.log("SysValue", sysValue);
  console.log("DiaValue", diaValue);

  let values = {
    NibpSys: sysValue,
    NibpDia: diaValue,
  };

  let headers = new Headers();

  headers.append("Content-Type", "application/json");
  headers.append("Accept", "application/json");

  //http://localhost:8080/BerryJavaPostgreSQL/rest/NibpCreate

  //http://localhost:8080/GuardiaJava/rest/NibpCreate

  fetch("https://app-prepro.sigestion.ar/sanikumqa/rest/NibpCreate", {
    method: "POST",
    body: JSON.stringify(values),
    headers: headers,
  })
    .then((response) => response)
    .then((json) => console.log(json))
    .catch((err) => console.log(err));
}

function saveSpo2() {
  console.log("Spo2Value", spo2Value);
  console.log("PulseRateValue", pulseRateValue);

  let values = {
    Spo2Spo2: spo2Value,
    Spo2PulseRate: pulseRateValue,
  };

  let headers = new Headers();

  headers.append("Content-Type", "application/json");
  headers.append("Accept", "application/json");
  //headers.append('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT, DELETE');
  /*headers.append('Access-Control-Allow-Origin', '*');
    
    headers.append('Access-Control-Allow-Headers', 'Content-Type');*/

  //http://localhost:8080/BerryJavaPostgreSQL/rest/Spo2Create

  //http://localhost:8080/GuardiaJava/rest/Spo2Create

  fetch("https://app-prepro.sigestion.ar/sanikumqa/rest/Spo2Create", {
    method: "POST",
    body: JSON.stringify(values),
    // mode: 'no-cors',
    headers: headers,
  })
    .then((response) => response)
    .then((json) => console.log(json))
    .catch((err) => console.log(err));
}

function saveTemperature() {
  console.log("TemperatureValue", temperatureValue);

  let values = {
    TemperatureTemperature: temperatureValue,
  };

  let headers = new Headers();

  headers.append("Content-Type", "application/json");
  headers.append("Accept", "application/json");

  //http://localhost:8080/BerryJavaPostgreSQL/rest/TemperatureCreate

  fetch("http://localhost:8080/GuardiaJava/rest/TemperatureCreate", {
    method: "POST",
    body: JSON.stringify(values),
    headers: headers,
  })
    .then((response) => response)
    .then((json) => console.log(json))
    .catch((err) => console.log(err));
}

function refreshBluetoothStatus(status) {
  txBluetoothStatus.innerHTML = status;
}

function updateWaveforms() {
  if (document.hidden) {
    for (let waveform of waveforms) {
      waveform["waveform"].addArray(
        waveform["buffer"].splice(0, waveform["buffer"].length)
      );
    }
  } else {
    for (let waveform of waveforms) {
      if (waveform["buffer"].length > waveform["slice_size"]) {
        waveform["waveform"].addArray(
          waveform["buffer"].splice(0, waveform["slice_size"])
        );
      }
    }
  }
}

function onBtnSpo2Image() {
  let headers = new Headers();

  headers.append("Content-Type", "application/json");

  fetch("http://localhost:8080/BerryJavaPostgreSQL/rest/Spo2Obtener", {
    method: "POST",
    headers: headers,
  })
    .then((response) => response)
    .then((json) => {
      console.log(json);
      var image = new Image();
      image.src = json.imageSpo2;
      document.getElementById("imageSpo2").innerHTML = image;
    })
    .catch((err) => console.log(err));
}

async function saveSpo2Image() {
  let headers = new Headers();

  headers.append("Content-Type", "application/json");
  headers.append("Access-Control-Allow-Origin", "*");

  console.log("array", waveformSpO2.measurementArray);
  console.log("array length", waveformSpO2.measurementArray.length);

  console.log("array copia", [...waveformSpO2.measurementArray]); // Hace una copia del array antes de imprimirlo
  console.log("array lenght", waveformSpO2.measurementArray.length);

  var arrayBase64 = waveformSpO2.measurementArray;

  //var totalImage = await saveImageBase64(arrayBase64);
  var totalImage = await waveformSpO2.saveImageBase64(arrayBase64);

  console.log("total image", totalImage);

  let values = {
    spo2Image: totalImage,
  };

  console.log("image converted", values.spo2Image);

  // http://localhost:8080/BerryJavaPostgreSQL/rest/Spo2GraphicsCreate
  //http://localhost:8080/GuardiaJava/rest/Spo2GraphicsCreate

  fetch("https://app-prepro.sigestion.ar/sanikumqa/rest/Spo2GraphicsCreate", {
    method: "POST",
    body: JSON.stringify(values),
    headers: headers,
  })
    .then((response) => response)
    .then((json) => console.log(json))
    .catch((err) => console.log(err));
}

async function saveEcgImage() {
  let headers = new Headers();

  headers.append("Content-Type", "application/json");
  headers.append("Access-Control-Allow-Origin", "*");

  console.log("array", waveformECG.measurementArray);

  var arrayBase64 = waveformECG.measurementArray;

  var totalImage = await waveformECG.saveImageBase64(arrayBase64);

  console.log("total image", totalImage);

  let values = {
    ecgImage: totalImage,
  };

  console.log("image converted", values.ecgImage);

  //http://localhost:8080/BerryJavaPostgreSQL/rest/EcgGraphicsCreate

  fetch("http://localhost:8080/GuardiaJava/rest/EcgGraphicsCreate", {
    method: "POST",
    body: JSON.stringify(values),
    headers: headers,
  })
    .then((response) => response)
    .then((json) => console.log(json))
    .catch((err) => console.log(err));
}

async function saveRespImage() {
  let headers = new Headers();

  headers.append("Content-Type", "application/json");
  headers.append("Access-Control-Allow-Origin", "*");

  console.log("array", waveformRESP.measurementArray);

  var arrayBase64 = waveformRESP.measurementArray;

  var totalImage = await waveformRESP.saveImageBase64(arrayBase64);

  console.log("total image", totalImage);

  let values = {
    respImage: totalImage,
  };

  console.log("image converted", values.respImage);

  //http://localhost:8080/BerryJavaPostgreSQL/rest/RespGraphicsCreate

  fetch("http://localhost:8080/GuardiaJava/rest/RespGraphicsCreate", {
    method: "POST",
    body: JSON.stringify(values),
    headers: headers,
  })
    .then((response) => response)
    .then((json) => console.log(json))
    .catch((err) => console.log(err));
}

async function mergeArrayBase64(measureArray = new Array()) {
  if (!Array.isArray(measureArray)) {
    throw new Error("Input must be an array");
  }

  var canvas = document.createElement("canvas");
  canvas.width = 1200 * measureArray.length;
  const context = canvas.getContext("2d");

  var xPosition = 0;

  var loadImages = measureArray.map((base64) => {
    return new Promise((resolve, reject) => {
      var img = new Image();
      img.src = base64;
      img.onload = () => {
        context.drawImage(img, xPosition, 0);
        xPosition += 1200;

        resolve();
      };

      let lastElement = measureArray[measureArray.length - 1];
      let image = new Image();
      image.src = base64;
      image.onload = function () {
        context.drawImage(image, canvas.width, 0);
      };
      image.src = lastElement;
      resolve();

      img.onerror = reject;
    });
  });

  try {
    await Promise.all(loadImages);
    // await Promise.all(loadImagesMin);
    const measureBase64 = canvas.toDataURL();
    return measureBase64;
  } catch (err) {
    console.error("Failed to load images:", err);
    return null;
  }
}

//Esta va
/*async function saveImageBase64(measureArray = new Array()) {
   var canvas = document.createElement('canvas');
   canvas.width = 1200 * (measureArray.length);
   const context = canvas.getContext('2d');

   var xPosition = 0;

   var loadImages = measureArray.map((base64) => {
       return new Promise((resolve, reject) => {
           var img = new Image();
           img.src = base64;
           img.onload = () => {
               context.drawImage(img, xPosition, 0);
               xPosition += 1200;

               if (index === measureArray.length) {
                  context.drawImage(img, canvas.width, 0);
               }

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
       console.error('Failed to load images:', err);
       return null;
   }
}*/
