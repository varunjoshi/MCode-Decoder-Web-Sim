// Morse Code Dictionary and Reference Data
// Based on International Morse Code and tesar-tech/arduino_and_morse_code definitions

export const MORSE_ALPHABET = [
  { code: ".-", char: "A" },
  { code: "-...", char: "B" },
  { code: "-.-.", char: "C" },
  { code: "-..", char: "D" },
  { code: ".", char: "E" },
  { code: "..-.", char: "F" },
  { code: "--.", char: "G" },
  { code: "....", char: "H" },
  { code: "..", char: "I" },
  { code: ".---", char: "J" },
  { code: "-.-", char: "K" },
  { code: ".-..", char: "L" },
  { code: "--", char: "M" },
  { code: "-.", char: "N" },
  { code: "---", char: "O" },
  { code: ".--.", char: "P" },
  { code: "--.-", char: "Q" },
  { code: ".-.", char: "R" },
  { code: "...", char: "S" },
  { code: "-", char: "T" },
  { code: "..-", char: "U" },
  { code: "...-", char: "V" },
  { code: ".--", char: "W" },
  { code: "-..-", char: "X" },
  { code: "-.--", char: "Y" },
  { code: "--..", char: "Z" },
  { code: ".----", char: "1" },
  { code: "..---", char: "2" },
  { code: "...--", char: "3" },
  { code: "....-", char: "4" },
  { code: ".....", char: "5" },
  { code: "-....", char: "6" },
  { code: "--...", char: "7" },
  { code: "---..", char: "8" },
  { code: "----.", char: "9" },
  { code: "-----", char: "0" }
];

export const SPECIAL_COMMANDS = [
  { code: "......", action: "DELETE_LAST", name: "6x Dot (......)", desc: "Deletes last character (BackSpace)" },
  { code: "------", action: "DELETE_ALL", name: "6x Dash (------)", desc: "Clears all displayed text" },
  { code: "[empty] + Space", action: "INSERT_SPACE", name: "Separator without code", desc: "Inserts word space (' ')" }
];

export const MORSE_LOOKUP = new Map();
MORSE_ALPHABET.forEach(item => {
  MORSE_LOOKUP.set(item.code, item.char);
});

export const CHAR_TO_MORSE = new Map();
MORSE_ALPHABET.forEach(item => {
  CHAR_TO_MORSE.set(item.char, item.code);
});

export const ARDUINO_SOURCE_CODE = `/* ZAPISOVÁTKO MORSEOVY ABECEDY
 * Využívá 3 tlačítka (tečka, čárka, oddělovač)
 * Zapisuje na LCD 16x2
 * https://github.com/tesar-tech/arduino_and_morse_code
 */
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define CARKABUTTONPIN 12 
#define TECKABUTTONPIN 8
#define ODDELBUTTONPIN 10
#define DISPLAY_NUMOFCOLUMNS 16

int carkaButtonState = 0;
int carkaButtonLastState = 0;
int teckaButtonState = 0;
int teckaButtonLastState = 0;
int oddelButtonState = 0;
int oddelButtonLastState = 0;
String tonesBuffer;
String text;

String symbolsAlphabet[][2] = {
  { ".-","A" }, { "-...","B" }, { "-.-.","C" }, { "-..","D" }, { ".","E" },
  { "..-.","F" }, { "--.","G" }, { "....","H" }, { "..","I" }, { ".---","J" },
  { "-.-","K" }, { ".-..","L" }, { "--","M" }, { "-.","N" }, { "---","O" },
  { ".--.","P" }, { "--.-","Q" }, { ".-.","R" }, { "...","S" }, { "-","T" },
  { "..-","U" }, { "...-","V" }, { ".--","W" }, { "-..-","X" }, { "-.--","Y" },
  { "--..","Z" }, { ".----","1" }, { "..---","2" }, { "...--","3" }, { "....-","4" },
  { ".....","5" }, { "-....","6" }, { "--...","7" }, { "---..","8" }, { "----.","9" },
  { "-----","0" }
};

LiquidCrystal_I2C lcd(0x27, DISPLAY_NUMOFCOLUMNS, 2);

char getToneFromButtonStates() {
  if (!carkaButtonState && carkaButtonLastState) return '-';
  if (!teckaButtonState && teckaButtonLastState) return '.';
  if (!oddelButtonState && oddelButtonLastState) return ' ';
  return (char)0;
}

char getSymbolFromBuffer() {
  if (tonesBuffer == "") return ' ';
  for (int i = 0; i < sizeof symbolsAlphabet / sizeof symbolsAlphabet[0]; i++) {
    if (tonesBuffer == symbolsAlphabet[i][0])
      return symbolsAlphabet[i][1][0];
  }
  return (char)0;
}

void extractActionFromTonesBuffer() {
  if (tonesBuffer == "......") text.remove(text.length() - 1, 1);
  if (tonesBuffer == "------") text = "";
}

void setup() {
  lcd.init();
  lcd.backlight();
  lcd.print("Morseovkovnitko");
  lcd.setCursor(0, 1);
  lcd.print("6x.Smaze1 6x-Vse");

  pinMode(CARKABUTTONPIN, INPUT);
  pinMode(TECKABUTTONPIN, INPUT);
  pinMode(ODDELBUTTONPIN, INPUT);
}

void loop() {
  carkaButtonState = digitalRead(CARKABUTTONPIN);
  teckaButtonState = digitalRead(TECKABUTTONPIN);
  oddelButtonState = digitalRead(ODDELBUTTONPIN);

  char tone = getToneFromButtonStates();

  if (tone != (char)0) {
    if (tone == ' ') {
      char symbol = getSymbolFromBuffer();
      if (symbol != (char)0) {
        text += symbol;
        if (text.length() > DISPLAY_NUMOFCOLUMNS) text = (String)symbol;
      } else {
        extractActionFromTonesBuffer();
      }
      tonesBuffer = "";
    } else {
      tonesBuffer += tone;
      if (tonesBuffer.length() > DISPLAY_NUMOFCOLUMNS) tonesBuffer = (String)tone;
    }

    lcd.clear();
    lcd.print(text);
    lcd.setCursor(0, 1);
    lcd.print(tonesBuffer);
  }

  carkaButtonLastState = carkaButtonState;
  teckaButtonLastState = teckaButtonState;
  oddelButtonLastState = oddelButtonState;
}`;
