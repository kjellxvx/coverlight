const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
const Jimp = require("jimp");
const cors = require("cors");
require("dotenv").config();

let user = process.env.USERNAME;
// let user = "kjellxvx"
let apiKey = process.env.APIKEY;

console.log(user);
console.log(apiKey);

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

      console.log(current);
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

  try {
    const image = await Jimp.read(current.coverurl);
    image.resize(stackSize, stackSize, Jimp.RESIZE_NEAREST_NEIGHBOR);

    const pixelArray = [];
    let totalR = 0;
    let totalG = 0;
    let totalB = 0;

    for (let y = 0; y < stackSize; y++) {
      for (let x = 0; x < stackSize; x++) {
        const rgba = Jimp.intToRGBA(image.getPixelColor(x, y));
        const { r, g, b } = rgba;
        // const average = Math.floor((r + g + b) / 3);
        pixelArray.push({ r, g, b });

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

    // Adjust saturation and darkness
    const saturation = 1.2; // Increase saturation
    const darkness = 0.8; // Decrease brightness

    const adjustedR = Math.round(averageR * saturation * darkness);
    const adjustedG = Math.round(averageG * saturation * darkness);
    const adjustedB = Math.round(averageB * saturation * darkness);
    const averageArray = [adjustedR, adjustedG, adjustedB];

    current.averageColor = averageArray;
  } catch (error) {
    console.error(error);
  }
}

async function init() {
  //fetching every 10 seconds
  setInterval(getTrack, 1 * 60 * 100);
}

init();
