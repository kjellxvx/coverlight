let data = {};

async function getState() {
  const response = await fetch("/api");
  const json = await response.json();
  data = json;
  console.log(data);
  return data;
}

async function drawImage() {
  await getState();
  drawUI();
  drawPixels();
}

async function drawUI() {
  document.getElementById("song").innerText = data.song;
  document.getElementById("artist").innerText = data.artist;
}

async function drawPixels() {
  const Pixels = data.Pixels;
  const canvas = document.getElementById("imageCanvas");
  const ctx = canvas.getContext("2d");

  const pixelSize = Math.floor(canvas.width / 16); // Size of each pixel (rounded down)

  ctx.imageSmoothingEnabled = false; // Disable image smoothing

  let totalR = 0;
  let totalG = 0;
  let totalB = 0;

  for (let i = 0; i < Pixels.length; i++) {
    const pixel = Pixels[i];
    const x = Math.floor(i % 16) * pixelSize; // Calculate the x-coordinate of the pixel (rounded down)
    const y = Math.floor(i / 16) * pixelSize; // Calculate the y-coordinate of the pixel (rounded down)

    const { r, g, b } = pixel;

    totalR += r;
    totalG += g;
    totalB += b;

    ctx.clearRect(x, y, pixelSize, pixelSize); // Clear the pixel area
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`; // Set the fill style to the pixel's color
    ctx.fillRect(x, y, pixelSize, pixelSize); // Draw the pixel
  }

  const pixelCount = Pixels.length;
  const averageR = Math.round(totalR / pixelCount);
  const averageG = Math.round(totalG / pixelCount);
  const averageB = Math.round(totalB / pixelCount);

  // Adjust saturation and darkness
  const saturation = 1.2; // Increase saturation
  const darkness = 0.8; // Decrease brightness

  const adjustedR = Math.round(averageR * saturation * darkness);
  const adjustedG = Math.round(averageG * saturation * darkness);
  const adjustedB = Math.round(averageB * saturation * darkness);

  const containerElement = document.getElementById("container");
  containerElement.style.backgroundColor = `rgb(${adjustedR}, ${adjustedG}, ${adjustedB})`;
}

async function init() {
  while (true) {
    await drawImage();
    await new Promise((resolve) => setTimeout(resolve, 10000)); // Delay for 10 seconds
  }
}

init();
