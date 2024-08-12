const txBluetoothStatus = document.getElementById("bluetooth-status");
sessionStorage.clear();
const waveformECG = new BMWaveform(
  document.getElementById("waveform-ecg"),
  "red",
  250,
  1
);
const waveformSpO2 = new BMWaveform(
  document.getElementById("waveform-spo2"),
  "red",
  100,
  3
);
const waveformRESP = new BMWaveform(
  document.getElementById("waveform-resp"),
  "yellow",
  250,
  3
);

const paramHeartRate = document.getElementById("parameter-heart-rate");
const paramNIBP = document.getElementById("parameter-nibp");
const paramSpO2 = document.getElementById("parameter-spo2");
const paramPulseRate = document.getElementById("parameter-pulse-rate");
const paramTemperature = document.getElementById("parameter-temperature");
const paramRespRate = document.getElementById("parameter-resp-rate");

let pacienteId = "";
let consultaId = "";
let heartRateValue = "";
let respRateValue = "";
let sysValue = "";
let diaValue = "";
let spo2Value = "";
let pulseRateValue = "";
let temperatureValue = "";
let baseUrl = "";
let timeGraph = 5000;

let spo2StartArray = false;

var calledSpo2Image = false;

let counterSpo2 = 1;
let counterEcg = 1;
let counterTemperature = null;

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

function onBtnSearchClick() {
  patientMonitor.connect();
}

function onBtnEcgClick(id) {
  if (
    sessionStorage.getItem(id) !== "active" &&
    sessionStorage.getItem("bth-status") == "Connected to BerryMed"
  ) {
    setColorBtn(id);
    sessionStorage.setItem(id, "active");
    let ecgMeasureTime = getActualTime();
    let counterEcg = 0;
    let saveEcgDataExecuted = false;

    dataParser.registerCallback(
      "on_ecg_params_received",
      (states, heartRate, respRate) => {
        heartRateValue = heartRate;
        respRateValue = respRate;
        paramHeartRate.innerHTML = heartRate === 0 ? "- -" : heartRate;
        paramRespRate.innerHTML = heartRate === 0 ? "- -" : respRate;
        if (counterEcg < 30 && heartRate !== 0 && respRate !== 0) {
          saveEcg(ecgMeasureTime);
          counterEcg++;
          saveEcgDataExecuted = true;
        }

        if (counterEcg === 30 && saveEcgDataExecuted) {
          setTimeout(async function () {
            await saveEcgImage(ecgMeasureTime);
            await saveRespImage(ecgMeasureTime);
            saveEcgDataExecuted = false;
          }, timeGraph);
        }
      }
    );
  }
}

function onBtnNIBPClick() {
  if (
    sessionStorage.getItem("btnNibp") !== "active" &&
    sessionStorage.getItem("bth-status") == "Connected to BerryMed"
  ) {
    nibpMeasureTime = getActualTime();
    document.getElementById("btnNibp").style.backgroundColor = "#00ABC8";
    sessionStorage.setItem("btnNibp", "active");
    patientMonitor.startNIBP();
    dataParser.registerCallback(
      "on_nibp_params_received",
      (states, cuff, sys, mean, dia) => {
        sysValue = sys;
        diaValue = dia;
        paramNIBP.innerHTML =
          sys === 0 || dia === 0 ? "- - -/- -" : sys + "/" + dia;
        if (sys !== 0 && dia !== 0) {
          saveNibpDataExecuted = true;
          document.getElementById("btnNibp").style.backgroundColor = "";
          sessionStorage.setItem("btnNibp", "deactive");
          saveNibp(nibpMeasureTime);
        }
      }
    );
  }
}

function onBtnSpo2Click() {
  if (
    sessionStorage.getItem("btnSpo2") !== "active" &&
    sessionStorage.getItem("bth-status") == "Connected to BerryMed"
  ) {
    sessionStorage.setItem("btnSpo2", "active");
    setColorBtn("btnSpo2");
    let spo2MeasureTime = getActualTime();
    spo2StartArray = false;

    dataParser.registerCallback(
      "on_spo2_params_received",
      async (states, spo2, pulseRate) => {
        spo2Value = spo2;
        pulseRateValue = pulseRate;
        paramSpO2.innerHTML = spo2 === 127 ? "- -" : spo2;
        paramPulseRate.innerHTML = pulseRate === 255 ? "- -" : pulseRate;

        if (counterSpo2 <= 30 && spo2 !== 127 && pulseRate !== 255) {
          saveSpo2(spo2MeasureTime);
          counterSpo2++;
        }

        if (counterSpo2 === 30) {
          setTimeout(async function () {
            await saveSpo2Image(spo2MeasureTime);
          }, timeGraph);
        }
      }
    );
  }
}

function onBtnTemperatureClick() {
  if (
    sessionStorage.getItem("btnTemp") !== "active" &&
    sessionStorage.getItem("bth-status") == "Connected to BerryMed"
  ) {
    counterTemperature = 0;
    sessionStorage.setItem("btnTemp", "active");
    setColorBtn("btnTemp");
    let tempMeasureTime = getActualTime();
    dataParser.registerCallback(
      "on_temp_params_received",
      (states, temperature) => {
        temperatureValue = temperature;
        paramTemperature.innerHTML = temperature === 0 ? "- -.-" : temperature;
        if (counterTemperature <= 30 && temperature !== 0) {
          counterTemperature++;
          saveTemperature(tempMeasureTime);
        }
      }
    );
  }
}

setInterval(updateWaveforms, 40);

function saveEcg(ecgMeasureTime) {
  let values = {
    ecgHeartRate: heartRateValue,
    ecgRespRate: respRateValue,
    medicionTime: ecgMeasureTime,
    charConsultaId: consultaId,
    charPacienteId: pacienteId,
  };

  let headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Accept", "application/json");

  fetch(baseUrl + "/rest/EcgCreate", {
    method: "POST",
    body: JSON.stringify(values),
    headers: headers,
  })
    .then((response) => response)
    .then((json) => console.log(json))
    .catch((err) => console.log(err));
}
async function saveEcgImage(ecgMeasureTime) {
  let headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Access-Control-Allow-Origin", "*");
  // console.log("array", waveformECG.measurementArray);
  var arrayBase64 = waveformECG.measurementArray;
  var totalImage = await waveformECG.saveImageBase64(arrayBase64);
  // console.log("total image", totalImage);

  let values = {
    ecgImage: totalImage,
    medicionTime: ecgMeasureTime,
    charConsultaId: consultaId,
    charPacienteId: pacienteId,
  };

  fetch(baseUrl + "/rest/EcgGraphicsCreate", {
    method: "POST",
    body: JSON.stringify(values),
    headers: headers,
  })
    .then((response) => response.json()) // Parsea la respuesta como JSON
    .then((data) => {
      if (data.error) {
        document.getElementById("error-text").style.display = "block";
      } else {
        document.getElementById("error-text").style.display = "none";
      }
    })
    .catch((err) => console.log("Error al enviar solicitud:", err));
}
async function saveRespImage(ecgMeasureTime) {
  let headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Access-Control-Allow-Origin", "*");
  var arrayBase64 = waveformRESP.measurementArray;
  var totalImage = await waveformRESP.saveImageBase64(arrayBase64);
  // console.log("total image", totalImage);

  let values = {
    respImage: totalImage,
    medicionTime: ecgMeasureTime,
    charConsultaId: consultaId,
    charPacienteId: pacienteId,
  };

  fetch(baseUrl + "/rest/RespGraphicsCreate", {
    method: "POST",
    body: JSON.stringify(values),
    headers: headers,
  })
    .then((response) => response.json()) // Parsea la respuesta como JSON
    .then((data) => {
      if (data.error) {
        document.getElementById("error-text").style.display = "block";
      } else {
        document.getElementById("error-text").style.display = "none";
      }
    })
    .catch((err) => console.log("Error al enviar solicitud:", err));
}

function saveNibp(nibpMeasureTime) {
  let values = {
    NibpSys: sysValue,
    NibpDia: diaValue,
    medicionTime: nibpMeasureTime,
    charConsultaId: consultaId,
    charPacienteId: pacienteId,
  };

  let headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Accept", "application/json");

  fetch(baseUrl + "/rest/NibpCreate", {
    method: "POST",
    body: JSON.stringify(values),
    headers: headers,
  })
    .then((response) => response)
    .then((json) => console.log(json))
    .catch((err) => console.log(err));
}

function saveSpo2(measureTime) {
  let values = {
    Spo2Spo2: spo2Value.toString(),
    Spo2PulseRate: pulseRateValue.toString(),
    medicionTime: measureTime,
    charConsultaId: consultaId,
    charPacienteId: pacienteId,
  };

  let headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Accept", "application/json");

  fetch(baseUrl + "/rest/Spo2Create", {
    method: "POST",
    body: JSON.stringify(values),
    headers: headers,
  })
    .then((response) => response.json()) // Parsea la respuesta como JSON
    .then((data) => {
      if (data.error) {
        document.getElementById("error-text").style.display = "block";
      } else {
        document.getElementById("error-text").style.display = "none";
      }
    })
    .catch((err) => console.log("Error al enviar solicitud:", err));
}

async function saveSpo2Image(spo2MeasureTime) {
  let headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Access-Control-Allow-Origin", "*");
  // console.log("array", waveformSpO2.measurementArray);
  // console.log("array length", waveformSpO2.measurementArray.length);
  // console.log("array copia", [...waveformSpO2.measurementArray]); // Hace una copia del array antes de imprimirlo
  // console.log("array lenght", waveformSpO2.measurementArray.length);

  var arrayBase64 = waveformSpO2.measurementArray;
  var totalImage = await waveformSpO2.saveImageBase64(arrayBase64);
  let values = {
    spo2Image: totalImage,
    medicionTime: spo2MeasureTime,
    charConsultaId: consultaId,
    charPacienteId: pacienteId,
  };

  fetch(baseUrl + "/rest/Spo2GraphicsCreate", {
    method: "POST",
    body: JSON.stringify(values),
    headers: headers,
  })
    .then((response) => response.json()) // Parsea la respuesta como JSON
    .then((data) => {
      if (data.error) {
        document.getElementById("error-text").style.display = "block";
      } else {
        document.getElementById("error-text").style.display = "none";
      }
    })
    .catch((err) => console.log("Error al enviar solicitud:", err));
}

function saveTemperature(measureTime) {
  let values = {
    temp: temperatureValue,
    medicionTime: measureTime,
    charConsultaId: consultaId,
    charPacienteId: pacienteId,
  };
  let headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Accept", "application/json");

  fetch(baseUrl + "/rest/TemperatureCreate", {
    method: "POST",
    body: JSON.stringify(values),
    headers: headers,
  })
    .then((response) => response.json()) // Parsea la respuesta como JSON
    .then((data) => {
      if (data.error) {
        document.getElementById("error-text").style.display = "block";
      } else {
        document.getElementById("error-text").style.display = "none";
      }
    })
    .catch((err) => console.log("Error al enviar solicitud:", err));
}

function refreshBluetoothStatus(status) {
  txBluetoothStatus.innerHTML = status;
  sessionStorage.setItem("bth-status", status.toString());
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
/*
async function saveImageBase64(measureArray = new Array()) {
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

const fitButtons = () => {
  let parametersBoxHeigth =
    document.querySelector(".parameter-box").offsetHeight;
  let btns = Array.from(
    document.getElementsByClassName("item-settings-container")
  );
  btns.map((b) => {
    b.style.height = `${parametersBoxHeigth}px`;
  });
};
const fillPatientData = () => {
  const queryString = window.location.search;
  const params = new URLSearchParams(queryString);
  const data = params.get("d");
  const divPatient = document.getElementById("patient");

  divPatient.innerHTML = descryptData(data);
};
const descryptData = (data) => {
  let dataPatient = "";
  if (data == null) {
    dataPatient = "-sin datos-";
  } else {
    //TODO : Trabajar con url encriptada
    let parts = data.split("-");
    let name = parts[0];
    let age = parts[1];
    let date = parts[2];
    pacienteId = parts[3];
    consultaId = parts[4];
    dataPatient = "";
    if (name.length > 0) dataPatient += `Paciente: ${name}`;
    if (age > 0) dataPatient += ` - Edad: ${age} años`;
    if (date.length > 0) dataPatient += ` - Fecha: ${date}`;
  }
  return dataPatient;
};

const setColorBtn = (id) => {
  let boton = document.getElementById(id);
  console.log(boton);
  boton.style.backgroundColor = "#00ABC8";
  setTimeout(function () {
    boton.style.backgroundColor = "";
    sessionStorage.setItem(id, "deactive");
  }, 30000); // 30 segundos

  boton.style.backgroundPosition = "0% 100%"; // Cambiar la posición del gradiente hacia abajo
  setTimeout(function () {
    boton.style.backgroundPosition = "0% 0%"; // Devolver la posición del gradiente a la parte superior
  }, 30000);
};
const setColorBorderBtn = (id, color) => {
  let boton = document.getElementById(id);
  boton.style.border = `2px solid ${color}`;
};

const getActualTime = () => {
  let date = new Date();
  let options = {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };

  // Formatear la fecha y hora según la zona horaria de Buenos Aires
  let dateTimeFormat = new Intl.DateTimeFormat("en-GB", options);
  let formattedDateParts = dateTimeFormat.formatToParts(date);

  // Extraer las partes formateadas
  let year = formattedDateParts.find((part) => part.type === "year").value;
  let month = formattedDateParts.find((part) => part.type === "month").value;
  let day = formattedDateParts.find((part) => part.type === "day").value;
  let hours = formattedDateParts.find((part) => part.type === "hour").value;
  let minutes = formattedDateParts.find((part) => part.type === "minute").value;
  let seconds = formattedDateParts.find((part) => part.type === "second").value;
  let horaMas3 = parseInt(hours);
  horaMas3 += 3;

  let medicionTime = `${year}-${month}-${day} ${horaMas3}:${minutes}:${seconds}.000`;
  return medicionTime;
};

document.addEventListener("DOMContentLoaded", () => {
  window.addEventListener("message", e => {
    var url = new URL(e.data);
    baseUrl = url.origin + url.pathname.split('/').slice(0, 2).join('/');
    console.log(baseUrl);

  });

  window.addEventListener("resize", fitButtons);
  fitButtons();
  fillPatientData();

  document.getElementById("btnEcg").addEventListener("click", () => {
    onBtnEcgClick("btnEcg");
  });

  document.getElementById("btnNibp").addEventListener("click", () => {
    onBtnNIBPClick();
  });

  document.getElementById("btnSpo2").addEventListener("click", () => {
    onBtnSpo2Click();
  });
  document.getElementById("btnTemp").addEventListener("click", () => {
    onBtnTemperatureClick();
  });

  /*____________________MOVIL______________________*/
  
  document.getElementById("ecg-button-xs").addEventListener("click", () => {
    onBtnEcgClick("ecg-button-xs");
  });

  document.getElementById("nibp-button-xs").addEventListener("click", () => {
    onBtnNIBPClick("nibp-button-xs");
  });

  document.getElementById("spo2-button-xs").addEventListener("click", () => {
    onBtnSpo2Click("spo2-button-xs");
  });
  document.getElementById("temp-button-xs").addEventListener("click", () => {
    onBtnTemperatureClick("temp-button-xs");
  });
});
