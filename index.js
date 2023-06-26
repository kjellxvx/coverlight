const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
const Jimp = require("jimp");
const cors = require("cors");
require("dotenv").config();

let user = process.env.USERNAME;
let apiKey = process.env.APIKEY;

let url =
  "https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=" +
  user +
  "&api_key=" +
  apiKey +
  "&format=json";

let current = {
  artist: "",
  album: "",
  song: "",
  coverurl: "",
  playing: "",
  Pixels: {},
  vibrantColor: [],
  averageColor: [],
};

const app = express();
app.use(cors());

app.use("/", express.static(path.join(__dirname, "coverlight")));

app.get("/api", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(current, null, 2));
});

const port = 3333; // Set the desired server port
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

async function getTrack() {
  try {
    const response = await fetch(url, { method: "GET" });
    if (response.ok) {
      const json = await response.json();
      current.artist = json.recenttracks.track[0].artist["#text"];
      current.album = json.recenttracks.track[0].album["#text"];
      current.song = json.recenttracks.track[0].name;
      current.coverurl = json.recenttracks.track[0].image[3]["#text"];
      if (json.recenttracks.track[0]["@attr"].nowplaying == "true") {
        current.playing = true;
      } else {
        current.playing = false;
      }

      await getPixels();

      //console.log(current);
    } else {
      console.log(Error);
      throw new Error("Request failed");
    }
  } catch (error) {
    console.error(error);
    this.error = "Error fetching content";
  } finally {
    this.loading = false;
  }
}
async function getPixels() {
  const stackSize = 16;
  const pixelArray = [];
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;

  try {
    const image = await Jimp.read(current.coverurl);
    image.resize(stackSize, stackSize, Jimp.RESIZE_NEAREST_NEIGHBOR);

    for (let y = 0; y < stackSize; y++) {
      for (let x = 0; x < stackSize; x++) {
        const rgba = Jimp.intToRGBA(image.getPixelColor(x, y));
        const { r, g, b } = rgba;

        const hexValue = ((r << 16) + (g << 8) + b)
          .toString(16)
          .padStart(6, "0");
        pixelArray.push(hexValue);

        totalR += r;
        totalG += g;
        totalB += b;
      }
    }
    current.Pixels = pixelArray;

    const pixelCount = pixelArray.length;

    const averageR = Math.round(totalR / pixelCount);
    const averageG = Math.round(totalG / pixelCount);
    const averageB = Math.round(totalB / pixelCount);

    const saturation = 2.5; // Increase saturation
    const lightness = 0.6; // Increase lightness

    function rgbToHsl(r, g, b) {
      r /= 255;
      g /= 255;
      b /= 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h, s, l;

      l = (max + min) / 2;

      if (max === min) {
        h = s = 0; // achromatic
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
        }

        h /= 6;
      }

      return {
        h: h * 360,
        s: s * 100,
        l: l * 100,
      };
    }

    function hslToRgb(h, s, l) {
      h /= 360;
      s /= 100;
      l /= 100;

      let r, g, b;

      if (s === 0) {
        r = g = b = l; // achromatic
      } else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
      }

      return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
      };
    }

    const hsl = rgbToHsl(averageR, averageG, averageB);

    const adjustedHsl = {
      h: hsl.h,
      s: hsl.s * saturation,
      l: hsl.l * lightness,
    };

    const { r, g, b } = hslToRgb(adjustedHsl.h, adjustedHsl.s, adjustedHsl.l);
    const vibrantR = Math.round(r);
    const vibrantG = Math.round(g);
    const vibrantB = Math.round(b);

    const hexAverage = ((averageR << 16) + (averageG << 8) + averageB)
      .toString(16)
      .padStart(6, "0");
    current.averageColor = hexAverage;

    const hexVibrant = ((vibrantR << 16) + (vibrantG << 8) + vibrantB)
      .toString(16)
      .padStart(6, "0");
    current.vibrantColor = hexVibrant;
  } catch (error) {
    console.error(error);
  }
}

async function init() {
  //fetching every 10 seconds
  setInterval(getTrack, 1 * 60 * 50);
}

init();
