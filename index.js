const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
const Jimp = require("jimp");
const cors = require("cors");
require("dotenv").config();

let user = process.env.USER;
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
};

const app = express();
app.use(cors());

app.use("/", express.static(path.join(__dirname, "coverlight")));

app.get("/api", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(current, null, 2));
});

const port = 2224; // Set the desired server port
app.listen(2224, () => {
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
    image.resize(16, 16, Jimp.RESIZE_NEAREST_NEIGHBOR);

    const pixelArray = [];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const rgba = Jimp.intToRGBA(image.getPixelColor(x, y));
        const { r, g, b } = rgba;
        // const average = Math.floor((r + g + b) / 3);
        pixelArray.push({r, g, b });
      }
    }
    current.Pixels = pixelArray;
  } catch (error) {
    console.error(error);
  }
}

async function init() {
  //fetching every 10 seconds
  setInterval(getTrack, 1 * 60 * 100);
}

init();
