#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

const char* ssid = "obstlan";
const char* password = "obsunjemoes";
const char* host = "unknown.gruppe5.org";
String averageColor = "000000";
String averageColorNew = "000000";
bool playing = false;
bool fading = false;
uint8_t rgb[3];

unsigned long previousRequestTime = 0;
const unsigned long requestInterval = 3000;  // Request interval in milliseconds

// Red, green, and blue pins for PWM control
const int redPin = 5;    // 13 corresponds to GPIO13
const int greenPin = 4;  // 12 corresponds to GPIO12
const int bluePin = 0;   // 14 corresponds to GPIO14

// Setting PWM bit resolution
const int resolution = 256;

uint8_t startColor[3];
uint8_t targetColor[3];

void setup() {
  Serial.begin(9600);

  pinMode(redPin, OUTPUT);
  pinMode(greenPin, OUTPUT);
  pinMode(bluePin, OUTPUT);

  analogWrite(redPin, 0);
  analogWrite(greenPin, 0);
  analogWrite(bluePin, 0);

  analogWriteRange(resolution);

  while (!Serial)
    continue;

  // Connect to WiFi network
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  unsigned long currentMillis = millis();
  if (currentMillis - previousRequestTime >= requestInterval) {
    previousRequestTime = currentMillis;
    sendRequest();
  }
}

void sendRequest() {
  // Connect to HTTP server
  WiFiClientSecure client;
  client.setInsecure();

  if (!client.connect(host, 443)) {
    Serial.println("Connection failed");
    return;
  }

  Serial.println("Sending Request!");

  // Send HTTP request
  client.print(F("GET /api HTTP/1.1\r\n"));
  client.print(F("Host: "));
  client.println(host);
  client.println(F("Cache-Control: no-cache"));
  client.println(F("Content-Type: application/json"));
  client.println();

  // Check HTTP status
  char status[32] = { 0 };
  client.readBytesUntil('\r', status, sizeof(status));
  if (strcmp(status, "HTTP/1.1 200 OK") != 0) {
    Serial.print("Unexpected response: ");
    Serial.println(status);
    client.stop();
    return;
  }

  // Skip HTTP headers
  char endOfHeaders[] = "\r\n\r\n";
  if (!client.find(endOfHeaders)) {
    Serial.println("Invalid response");
    client.stop();
    return;
  }

  // Read the response in chunks and store it in a string
  String response;
  const size_t bufferSize = 128;
  char buffer[bufferSize];
  while (client.available()) {
    size_t bytesRead = client.readBytes(buffer, bufferSize);
    for (size_t i = 0; i < bytesRead; i++) {
      response += buffer[i];
    }
  }

  DynamicJsonDocument doc(8192);

  DeserializationError error = deserializeJson(doc, response);

  if (error) {
    Serial.print(F("deserializeJson() failed: "));
    Serial.println(error.f_str());
    return;
  }
  Serial.println("Received response");
  client.stop();

  const char* artist = doc["artist"];  // "Dazy"
  const char* album = doc["album"];    // "OTHERBODY"
  const char* song = doc["song"];      // "I Know Nothing At All"
  const char* coverurl = doc["coverurl"];
  playing = doc["playing"];  // true

  if (playing == true) {
    averageColorNew = doc["averageColor"].as<String>();
    if (averageColorNew != averageColor && fading == false) {
      changeColor();
      averageColor = averageColorNew;
      fading = false;
      Serial.print("fading finished ");
      Serial.print(averageColor);
      Serial.print(" = ");
      Serial.println(averageColorNew);
    }
  } else {
    Serial.println("nothing playing");
    analogWrite(redPin, 0);
    analogWrite(greenPin, 0);
    analogWrite(bluePin, 0);
  }
}

void changeColor() {
  fading = true;
  Serial.print("Changing Color from ");
  Serial.print(averageColor);
  Serial.print(" to ");
  Serial.println(averageColorNew);

  hexToRGB(averageColor, startColor);

  hexToRGB(averageColorNew, targetColor);

  startColor[0] = map(startColor[0], 0, 255, 0, 160);
  targetColor[0] = map(targetColor[0], 0, 255, 0, 160);

  unsigned long fadeStartTime = millis();
  const unsigned long fadeDuration = 2000;  // Fade duration in milliseconds

  while (millis() - fadeStartTime <= fadeDuration) {
    float progress = float(millis() - fadeStartTime) / float(fadeDuration);

    uint8_t currentColor[3];
    for (int i = 0; i < 3; i++) {
      int colorDiff = targetColor[i] - startColor[i];
      currentColor[i] = startColor[i] + int(progress * colorDiff);
    }


    analogWrite(redPin, currentColor[0]);
    analogWrite(greenPin, currentColor[1]);
    analogWrite(bluePin, currentColor[2]);
    yield();
  }

  analogWrite(redPin, targetColor[0]);
  analogWrite(greenPin, targetColor[1]);
  analogWrite(bluePin, targetColor[2]);
}


void hexToRGB(const String& hexCode, uint8_t color[3]) {
  char hex[7];
  hexCode.toCharArray(hex, 7);

  long colorValue = strtol(hex, nullptr, 16);
  color[0] = (colorValue >> 16) & 0xFF;
  color[1] = (colorValue >> 8) & 0xFF;
  color[2] = colorValue & 0xFF;
}
