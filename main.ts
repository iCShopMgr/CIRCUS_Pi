enum SwState {
    //% block="ON"
    on = 1,
    //% block="OFF"
    off = 0
}

enum DHTState {
    //% block="Temp"
    temp = 1,
    //% block="Humid"
    humid = 2
}

enum I2C_ADDR {
    //% block="0x20"
    addr1 = 0x20,
    //% block="0x27"
    addr2 = 0x27,
    //% block="0x3F"
    addr3 = 0x3F
}

let DHT_count = 0;
let DHT_value = 0;
let DHT_out = 0;
let DHT_Temp = 0;
let DHT_Humid = 0;
let DHTpin = DigitalPin.P1;

function Ready(): number {
    pins.digitalWritePin(DHTpin, 0);
    basic.pause(20);
    pins.digitalWritePin(DHTpin, 1);
    DHT_count = input.runningTimeMicros();
    while (pins.digitalReadPin(DHTpin) == 1) {
        if (input.runningTimeMicros() - DHT_count > 100) {
            return 0;
        }
    }
    DHT_count = input.runningTimeMicros();
    while (pins.digitalReadPin(DHTpin) == 0) {
        if (input.runningTimeMicros() - DHT_count > 100) {
            return 0;
        }
    }
    DHT_count = input.runningTimeMicros();
    while (pins.digitalReadPin(DHTpin) == 1) {
        if (input.runningTimeMicros() - DHT_count > 100) {
            return 0;
        }
    }
    return 1;
}

function ReadData() {
    DHT_value = 0;
    if (Ready() == 1) {
        for (let k = 0; k < 24; k++) {
            DHT_out = 0;
            while (pins.digitalReadPin(DHTpin) == 0) {
                DHT_out += 1;
                if (DHT_out > 100) {
                    break;
                }
            }
            DHT_count = input.runningTimeMicros();
            DHT_out = 0;
            while (pins.digitalReadPin(DHTpin) == 1) {
                DHT_out += 1;
                if (DHT_out > 100) {
                    break;
                }
            }
            if (input.runningTimeMicros() - DHT_count > 40) {
                DHT_value = DHT_value + (1 << (23 - k));
                DHT_Temp = (DHT_value & 0x0000ffff);
                DHT_Humid = (DHT_value >> 16);
            }
        }
    }
    else {
        pins.digitalWritePin(DHTpin, 1);
    }
}

let LCD_I2C_ADDR = 0x20
let BK = 0x08
let RS = 0x00

function setReg(dat: number): void {
    pins.i2cWriteNumber(LCD_I2C_ADDR, dat, NumberFormat.UInt8BE, false)
    basic.pause(1)
}

function send(dat: number): void {
    let d = dat & 0xF0
    d |= BK
    d |= RS
    setReg(d)
    setReg(d | 0x04)
    setReg(d)
}

function setcmd(cmd: number): void {
    RS = 0
    send(cmd)
    send(cmd << 4)
}

function setdat(dat: number): void {
    RS = 1
    send(dat)
    send(dat << 4)
}

function setI2CAddress(): void {
    setcmd(0x33)
    basic.pause(5)
    send(0x30)
    basic.pause(5)
    send(0x20)
    basic.pause(5)
    setcmd(0x28)
    setcmd(0x0C)
    setcmd(0x06)
    setcmd(0x01)
}

function printChar(ch: number, x: number, y: number): void {
    if (x >= 0) {
        let a = 0x80
        if (y > 0)
            a = 0xC0
        a += x
        setcmd(a)
    }
    setdat(ch)
}

const _NOOP = 0
const _DIGIT = [1, 2, 3, 4, 5, 6, 7, 8]
const _DECODEMODE = 9
const _INTENSITY = 10
const _SCANLIMIT = 11
const _SHUTDOWN = 12
const _DISPLAYTEST = 15

let _pinCS = DigitalPin.P16
let _matrixNum = 1
let _displayArray: number[] = []
let _rotation = 0
let _reversed = false

let keylist = [" ", "!", "\"", "#", "$", "%", "&", "\'", "(", ")",
            "*", "+", ",", "-", ".", "/",
            "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
            ":", ";", "<", "=", ">", "?", "@",
            "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
            "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
            "[", "\\", "]", "_", "`",
            "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l",
            "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
            "{", "|", "}", "~", "^"]

let font_matrix = [
    [0b00000000,
        0b00000000,
        0b00000000,
        0b00000000],
    [0b01011111,
        0b00000000],
    [0b00000011,
        0b00000000,
        0b00000011,
        0b00000000],
    [0b00010100,
        0b00111110,
        0b00010100,
        0b00111110,
        0b00010100,
        0b00000000],
    [0b00100100,
        0b01101010,
        0b00101011,
        0b00010010,
        0b00000000],
    [0b01100011,
        0b00010011,
        0b00001000,
        0b01100100,
        0b01100011,
        0b00000000],
    [0b00110110,
        0b01001001,
        0b01010110,
        0b00100000,
        0b01010000,
        0b00000000],
    [0b00000011,
        0b00000000],
    [0b00011100,
        0b00100010,
        0b01000001,
        0b00000000],
    [0b01000001,
        0b00100010,
        0b00011100,
        0b00000000],
    [0b00101000,
        0b00011000,
        0b00001110,
        0b00011000,
        0b00101000,
        0b00000000],
    [0b00001000,
        0b00001000,
        0b00111110,
        0b00001000,
        0b00001000,
        0b00000000],
    [0b10110000,
        0b01110000,
        0b00000000],
    [0b00001000,
        0b00001000,
        0b00001000],
    [0b01100000,
        0b01100000,
        0b00000000],
    [0b01100000,
        0b00011000,
        0b00000110,
        0b00000001,
        0b00000000],
    [0b00111110,
        0b01000001,
        0b01000001,
        0b00111110,
        0b00000000],
    [0b01000010,
        0b01111111,
        0b01000000,
        0b00000000],
    [0b01100010,
        0b01010001,
        0b01001001,
        0b01000110,
        0b00000000],
    [0b00100010,
        0b01000001,
        0b01001001,
        0b00110110,
        0b00000000],
    [0b00011000,
        0b00010100,
        0b00010010,
        0b01111111,
        0b00000000],
    [0b00100111,
        0b01000101,
        0b01000101,
        0b00111001,
        0b00000000],
    [0b00111110,
        0b01001001,
        0b01001001,
        0b00110000,
        0b00000000],
    [0b01100001,
        0b00010001,
        0b00001001,
        0b00000111,
        0b00000000],
    [0b00110110,
        0b01001001,
        0b01001001,
        0b00110110,
        0b00000000],
    [0b00000110,
        0b01001001,
        0b01001001,
        0b00111110,
        0b00000000],
    [0b00010100,
        0b00000000],
    [0b00100000,
        0b00010100,
        0b00000000],
    [0b00001000,
        0b00010100,
        0b00100010,
        0b00000000],
    [0b00010100,
        0b00010100,
        0b00010100,
        0b00000000],
    [0b00100010,
        0b00010100,
        0b00001000,
        0b00000000],
    [0b00000010,
        0b01011001,
        0b00001001,
        0b00000110,
        0b00000000],
    [0b00111110,
        0b01001001,
        0b01010101,
        0b01011101,
        0b00001110,
        0b00000000],
    [0b01111110,
        0b00010001,
        0b00010001,
        0b01111110,
        0b00000000],
    [0b01111111,
        0b01001001,
        0b01001001,
        0b00110110,
        0b00000000],
    [0b00111110,
        0b01000001,
        0b01000001,
        0b00100010,
        0b00000000],
    [0b01111111,
        0b01000001,
        0b01000001,
        0b00111110,
        0b00000000],
    [0b01111111,
        0b01001001,
        0b01001001,
        0b01000001,
        0b00000000],
    [0b01111111,
        0b00001001,
        0b00001001,
        0b00000001,
        0b00000000],
    [0b00111110,
        0b01000001,
        0b01001001,
        0b01111010,
        0b00000000],
    [0b01111111,
        0b00001000,
        0b00001000,
        0b01111111,
        0b00000000],
    [0b01000001,
        0b01111111,
        0b01000001,
        0b00000000],
    [0b00110000,
        0b01000000,
        0b01000001,
        0b00111111,
        0b00000000],
    [0b01111111,
        0b00001000,
        0b00010100,
        0b01100011,
        0b00000000],
    [0b01111111,
        0b01000000,
        0b01000000,
        0b01000000,
        0b00000000],
    [0b01111111,
        0b00000010,
        0b00001100,
        0b00000010,
        0b01111111,
        0b00000000],
    [0b01111111,
        0b00000100,
        0b00001000,
        0b00010000,
        0b01111111,
        0b00000000],
    [0b00111110,
        0b01000001,
        0b01000001,
        0b00111110,
        0b00000000],
    [0b01111111,
        0b00001001,
        0b00001001,
        0b00000110,
        0b00000000],
    [0b00111110,
        0b01000001,
        0b01000001,
        0b10111110,
        0b00000000],
    [0b01111111,
        0b00001001,
        0b00001001,
        0b01110110,
        0b00000000],
    [0b01000110,
        0b01001001,
        0b01001001,
        0b00110010,
        0b00000000],
    [0b00000001,
        0b00000001,
        0b01111111,
        0b00000001,
        0b00000001,
        0b00000000],
    [0b00111111,
        0b01000000,
        0b01000000,
        0b00111111,
        0b00000000],
    [0b00001111,
        0b00110000,
        0b01000000,
        0b00110000,
        0b00001111,
        0b00000000],
    [0b00111111,
        0b01000000,
        0b00111000,
        0b01000000,
        0b00111111,
        0b00000000],
    [0b01100011,
        0b00010100,
        0b00001000,
        0b00010100,
        0b01100011,
        0b00000000],
    [0b00000111,
        0b00001000,
        0b01110000,
        0b00001000,
        0b00000111,
        0b00000000],
    [0b01100001,
        0b01010001,
        0b01001001,
        0b01000111,
        0b00000000],
    [0b01111111,
        0b01000001,
        0b00000000],
    [0b00000001,
        0b00000110,
        0b00011000,
        0b01100000,
        0b00000000],
    [0b01000001,
        0b01111111,
        0b00000000],
    [0b01000000,
        0b01000000,
        0b01000000,
        0b01000000,
        0b00000000],
    [0b00000001,
        0b00000010,
        0b00000000],
    [0b00100000,
        0b01010100,
        0b01010100,
        0b01111000,
        0b00000000],
    [0b01111111,
        0b01000100,
        0b01000100,
        0b00111000,
        0b00000000],
    [0b00111000,
        0b01000100,
        0b01000100,
        0b00101000,
        0b00000000],
    [0b00111000,
        0b01000100,
        0b01000100,
        0b01111111,
        0b00000000],
    [0b00111000,
        0b01010100,
        0b01010100,
        0b00011000,
        0b00000000],
    [0b00000100,
        0b01111110,
        0b00000101,
        0b00000000],
    [0b10011000,
        0b10100100,
        0b10100100,
        0b01111000,
        0b00000000],
    [0b01111111,
        0b00000100,
        0b00000100,
        0b01111000,
        0b00000000],
    [0b01000100,
        0b01111101,
        0b01000000,
        0b00000000],
    [0b01000000,
        0b10000000,
        0b10000100,
        0b01111101,
        0b00000000],
    [0b01111111,
        0b00010000,
        0b00101000,
        0b01000100,
        0b00000000],
    [0b01000001,
        0b01111111,
        0b01000000,
        0b00000000],
    [0b01111100,
        0b00000100,
        0b01111100,
        0b00000100,
        0b01111000,
        0b00000000],
    [0b01111100,
        0b00000100,
        0b00000100,
        0b01111000,
        0b00000000],
    [0b00111000,
        0b01000100,
        0b01000100,
        0b00111000,
        0b00000000],
    [0b11111100,
        0b00100100,
        0b00100100,
        0b00011000,
        0b00000000],
    [0b00011000,
        0b00100100,
        0b00100100,
        0b11111100,
        0b00000000],
    [0b01111100,
        0b00001000,
        0b00000100,
        0b00000100,
        0b00000000],
    [0b01001000,
        0b01010100,
        0b01010100,
        0b00100100,
        0b00000000],
    [0b00000100,
        0b00111111,
        0b01000100,
        0b00000000],
    [0b00111100,
        0b01000000,
        0b01000000,
        0b01111100,
        0b00000000],
    [0b00011100,
        0b00100000,
        0b01000000,
        0b00100000,
        0b00011100,
        0b00000000],
    [0b00111100,
        0b01000000,
        0b00111100,
        0b01000000,
        0b00111100,
        0b00000000],
    [0b01000100,
        0b00101000,
        0b00010000,
        0b00101000,
        0b01000100,
        0b00000000],
    [0b10011100,
        0b10100000,
        0b10100000,
        0b01111100,
        0b00000000],
    [0b01100100,
        0b01010100,
        0b01001100,
        0b00000000],
    [0b00001000,
        0b00110110,
        0b01000001,
        0b00000000],
    [0b01111111,
        0b00000000],
    [0b01000001,
        0b00110110,
        0b00001000,
        0b00000000],
    [0b00001000,
        0b00000100,
        0b00001000,
        0b00000100,
        0b00000000],
    [0b00000010,
        0b00000001,
        0b00000010,
        0b00000000]]

function setup(num: number, cs: DigitalPin, mosi: DigitalPin, miso: DigitalPin, sck: DigitalPin) {
    _pinCS = cs
    _matrixNum = num
    for (let i = 0; i < (num + 2) * 8; i++) {
      _displayArray.push(0)
    }

    pins.spiPins(mosi, miso, sck)
    pins.spiFormat(8, 3)
    pins.spiFrequency(1000000)

    _registerAll(_SHUTDOWN, 0)
    _registerAll(_DISPLAYTEST, 0)
    _registerAll(_DECODEMODE, 0)
    _registerAll(_SCANLIMIT, 7)
    _registerAll(_INTENSITY, 15)
    _registerAll(_SHUTDOWN, 1)
    clearAll()
}

function _registerAll(addressCode: number, data: number) {
    pins.digitalWritePin(_pinCS, 0)
    for (let i = 0; i < _matrixNum; i++) {
        pins.spiWrite(addressCode)
        pins.spiWrite(data)
    }
    pins.digitalWritePin(_pinCS, 1)
}

function clearAll() {
    for (let i = 0; i < 8; i++) _registerAll(_DIGIT[i], 0)
}

let _brightness = 25
let _lednumber = 24
let neopixel_buf = pins.createBuffer(16 * _lednumber);
let _di = DigitalPin.P12
for (let i = 0; i < 16 * _lednumber; i++) {
    neopixel_buf[i] = 0
}
circuspi.rgb_led_clear();


/**
 * CIRCUS Pi for micro:bit
 */
//% weight=10 color=#ff7f27 icon=""
namespace circuspi {
    /**
     * TODO: 按鈕模組(數位)
     * @param p 連接Pin腳編號, eg: P1
     */
    //% blockId=button
    //% block="Button %p | is pressed"
    //% group="1. Digital in"
    //% weight=100
    export function button(p: DigitalPin): boolean {
        pins.setPull(p, PinPullMode.PullUp)
        if (pins.digitalReadPin(p) == 0) {
            return true;
        }
        else {
            return false;
        }
    }

    /**
     * TODO: 滾珠開關模組(數位)
     * @param p 連接Pin腳編號, eg: P1
     */
    //% blockId=tilt_ball_switch
    //% block="Tilt Ball Switch %p | is trigger"
    //% group="1. Digital in"
    //% weight=99
    export function ballswitch(p: DigitalPin): boolean {
        pins.setPull(p, PinPullMode.PullUp)
        if (pins.digitalReadPin(p) == 1) {
            return true;
        }
        else {
            return false;
        }
    }

    /**
     * TODO: 霍爾磁性模組(數位)
     * @param p 連接Pin腳編號, eg: P1
     */
    //% blockId=hall_effect
    //% block="Hall effect sensor %p | is trigger"
    //% group="1. Digital in"
    //% weight=98
    export function halleffect(p: DigitalPin): boolean {
        pins.setPull(p, PinPullMode.PullUp)
        if (pins.digitalReadPin(p) == 0) {
            return true;
        }
        else {
            return false;
        }
    }

    /**
     * TODO: 單色LED模組(數位)
     * @param p 連接Pin腳編號, eg: P1
     * @param s 數值, eg: 0 or 1
     */
    //% blockId=singal_led_d
    //% block="Singal LED %p | state %s"
    //% group="2. Digital out"
    //% weight=97
    export function singalledd(p: DigitalPin, s: SwState): void {
        pins.digitalWritePin(p, s);
    }

    /**
     * TODO: 單色LED模組(類比)
     * @param p 連接Pin腳編號, eg: P1
     * @param v 數值, eg: 0 ~ 1023
     */
    //% blockId=singal_led_a
    //% block="Singal LED %p | value %v"
    //% group="2. Digital out"
    //% weight=96
    //% v.min=0 v.max=1023
    //% v.defl=1023
    export function singalleda(p: AnalogPin, v: number): void {
        if (v < 0) {
            v = 0;
        }
        else if (v > 1023) {
            v = 1023;
        }
        pins.analogWritePin(p, v);
    }

    /**
     * TODO: 一路繼電器模組(數位)
     * @param p 連接Pin腳編號, eg: P1
     * @param s 數值, eg: 0 or 1
     */
    //% blockId=relay
    //% block="Relay %p | state %s"
    //% group="2. Digital out"
    //% weight=95
    export function relay(p: DigitalPin, s: SwState): void {
        pins.digitalWritePin(p, s);
    }

    /**
     * TODO: LED紅綠燈整合模組
     * @param p1, p2, p3 連接Pin腳編號, eg: P1
     * @param s1, s2, s3 數值, eg: 0 or 1
     */
    //% blockId=traffic_lights
    //% block="Traffic lights:| Red%p1 set%s1| Yellow%p2 set%s2| Green%p3 set%s3"
    //% group="2. Digital out"
    //% weight=94
    export function trafficlights(p1: DigitalPin, s1: SwState, p2: DigitalPin, s2: SwState, p3: DigitalPin, s3: SwState): void {
        pins.digitalWritePin(p1, s1);
        pins.digitalWritePin(p2, s2);
        pins.digitalWritePin(p3, s3);
    }

    /**
     * TODO: 光線模組(類比)
     * @param p 連接Pin腳編號, eg: P1
     */
    //% blockId=light_sensor
    //% block="Light sensor %p value"
    //% group="3. Analog in"
    //% weight=93
    export function lightsensor(p: AnalogPin): number {
        return pins.analogReadPin(p);
    }

    /**
     * TODO: 可變電阻模組(類比)
     * @param p 連接Pin腳編號, eg: P1
     */
    //% blockId=var_resistance
    //% block="Variable resistance %p value"
    //% group="3. Analog in"
    //% weight=92
    export function varresistance(p: AnalogPin): number {
        return pins.analogReadPin(p);
    }

    /**
     * TODO: 土壤濕度感測模組(類比)
     * @param p 連接Pin腳編號, eg: P1
     */
    //% blockId=moisture_sensor
    //% block="Moisture sensor %p value"
    //% group="3. Analog in"
    //% weight=91
    export function moisturesensor(p: AnalogPin): number {
        return pins.analogReadPin(p);
    }

    /**
     * TODO: 避障紅外線模組(數位)
     * @param p 連接Pin腳編號, eg: P1
     */
    //% blockId=infrared_ranging_d
    //% block="Infrared ranging(digital) %p value"
    //% group="3. Analog in"
    //% weight=90
    export function infrared_ranging_d(p: DigitalPin): boolean {
        pins.setPull(p, PinPullMode.PullUp)
        if (pins.digitalReadPin(p) == 0) {
            return true;
        }
        else {
            return false;
        }
    }

    /**
     * TODO: 避障紅外線模組(類比)
     * @param p 連接Pin腳編號, eg: P1
     */
    //% blockId=infrared_ranging_a
    //% block="Infrared ranging(analog) %p value"
    //% group="3. Analog in"
    //% weight=89
    export function infrared_ranging_a(p: AnalogPin): number {
        return pins.analogReadPin(p);
    }

    /**
     * TODO: RGB LED共陰模組
     * @param p1, p2, p3 連接Pin腳編號, eg: P1
     * @param s1, s2, s3 數值, eg: 0 ~ 1023
     */
    //% blockId=rgb_led
    //% block="RGB LED:| Red%p1 set%s1| Green%p2 set%s2| Blue%p3 set%s3"
    //% group="4. Analog out(PWM)"
    //% weight=88
    //% s1.min=0 s1.max=1023 s2.min=0 s2.max=1023 s3.min=0 s3.max=1023
    //% s1.defl=1023 s2.defl=1023 s3.defl=1023
    export function rgbled(p1: AnalogPin, s1: number, p2: AnalogPin, s2: number, p3: AnalogPin, s3: number): void {
        pins.analogWritePin(p1, s1);
        pins.analogWritePin(p2, s2);
        pins.analogWritePin(p3, s3);
    }

    /**
     * TODO: 馬達驅動模組
     * @param p1, p2, p3, p4 連接Pin腳編號, eg: P1
     * @param s1, s2, s3, s4 數值, eg: 0 ~ 1023
     */
    //% blockId=motor
    //% block="motor:| M1B%p1 set%s1| M1A%p2 set%s2| M2B%p3 set%s3| M2A%p4 set%s4"
    //% group="4. Analog out(PWM)"
    //% weight=87
    //% s1.min=0 s1.max=1023 s2.min=0 s2.max=1023 s3.min=0 s3.max=1023 s4.min=0 s4.max=1023
    //% s1.defl=0 s2.defl=1023 s3.defl=0 s4.defl=1023
    export function motor(p1: AnalogPin, s1: number, p2: AnalogPin, s2: number, p3: AnalogPin, s3: number, p4: AnalogPin, s4: number): void {
        pins.analogWritePin(p1, s1);
        pins.analogWritePin(p2, s2);
        pins.analogWritePin(p3, s3);
        pins.analogWritePin(p4, s4);
    }

    /**
     * TODO: 電晶體MOS模組(數位)
     * @param p 連接Pin腳編號, eg: P1
     * @param s 數值, eg: 0 or 1
     */
    //% blockId=transistor_mos
    //% block="Transistor MOS %p | state %s"
    //% group="4. Analog out(PWM)"
    //% weight=86
    export function transistormos(p: DigitalPin, s: SwState): void {
        pins.digitalWritePin(p, s);
    }

    /**
     * TODO: DHT11溫溼度模組
     * @param p 連接Pin腳編號, eg: P1
     * @param s 選擇量測類型, eg: 0 or 1
     */
    //% blockId=dht11
    //% block="DHT11 %p read %s"
    //% group="5. Lirbraries"
    //% weight=85
    export function dht11(p: DigitalPin, s: DHTState): number {
        DHTpin = p;
        ReadData()
        if (s == 1) {
            return DHT_Temp;
        }
        else {
            return DHT_Humid;
        }
    }

    /**
     * TODO: 超音波模組
     * @param trig, echo 連接Pin腳編號, eg: P1
     */
    //% blockId=ultrasonic_sensor
    //% block="Ultrasonic Sensor(cm) trig %trig echo %echo value"
    //% group="5. Lirbraries"
    //% weight=84
    export function sonicsensor(trig: DigitalPin, echo: DigitalPin): number {
		let distance = 0
		pins.setPull(trig, PinPullMode.PullNone);

		pins.digitalWritePin(trig, 0);
	    control.waitMicros(5);
		pins.digitalWritePin(trig, 1);
		control.waitMicros(10)
		pins.digitalWritePin(trig, 0);

		distance = pins.pulseIn(echo, PulseValue.High)
		return distance = Math.round(distance / 2 / 29)
	}

    /**
     * TODO: RGB LED 12燈環
     * @param pins, 連接Pin腳編號, eg: P12
     */
    //% rgb.shadow="colorNumberPicker"
    //% blockId="RGB_LED_show_all"
    //% block="All RGB LED show color %rgb"
    //% group="5. Lirbraries"
    //% weight=83
    export function rgbledshowall(rgb: number): void{
        let r = (rgb >> 16) * (_brightness / 255);
        let g = ((rgb >> 8) & 0xFF) * (_brightness / 255);
        let b = ((rgb) & 0xFF) * (_brightness / 255);
        for (let i = 0; i < _lednumber; i++) {
            neopixel_buf[i * 3 + 0] = Math.round(g)
            neopixel_buf[i * 3 + 1] = Math.round(r)
            neopixel_buf[i * 3 + 2] = Math.round(b)
        }
        ws2812b.sendBuffer(neopixel_buf, _di)
    }

    //% index.min=0 index.max=_lednumber
    //% rgb.shadow="colorNumberPicker"
    //% blockId="RGB_LED_show"
    //% block="RGB LED number| %index show color| %rgb"
    //% weight=82
    export function rgb_led_show(index: number, rgb: number): void{
        let f = index;
        let t = index;
        let r = (rgb >> 16) * (_brightness / 255);
        let g = ((rgb >> 8) & 0xFF) * (_brightness / 255);
        let b = ((rgb) & 0xFF) * (_brightness / 255);

        if (index > 15) {
            if (((index >> 8) & 0xFF) == 0x02) {
                f = index >> 16;
                t = index & 0xff;
            } else {
                f = 0;
                t = -1;
            }
        }
        for (let i = f; i <= t; i++) {
            neopixel_buf[i * 3 + 0] = Math.round(g)
            neopixel_buf[i * 3 + 1] = Math.round(r)
            neopixel_buf[i * 3 + 2] = Math.round(b)
        }
        ws2812b.sendBuffer(neopixel_buf, _di)
    }

    //% brightness.min=0 brightness.max=255
    //% blockId="RGB_LED_set_brightness"
    //% block="RGB LED set pins %di LED %ln brightness to |%brightness |(0~255)"
    //% weight=81
    export function rgb_led_set_setBrightness(di: DigitalPin, ln: number, brightness: number) {
        _brightness = brightness;
        _lednumber = ln
        _di = di
    }

    //% r.min=0 r.max=255
    //% g.min=0 g.max=255
    //% b.min=0 b.max=255
    //% blockId="RGB_LED_set_RGB"
    //% block="Red|%r Green|%g Blue|%b"
    //& weight=80
    export function rgb_led_set_RGB(r: number, g: number, b: number): number {
        return (r << 16) + (g << 8) + (b);
    }

    //% blockId="RGB_LED_clear"
    //% block="RGB LED clear all"
    //% weight=79
    export function rgb_led_clear(): void {
        for (let i = 0; i < 16 * _lednumber; i++) {
            neopixel_buf[i] = 0
        }
        ws2812b.sendBuffer(neopixel_buf, _di)
    }

    /**
     * TODO: MAX7219 8x8 LED點矩陣顯示模組
     * @param pins=>SPI
     */
    //% blockId="MAX7219_set"
    //% block="Setup MAX7219:|CS(LOAD) = %cs|MOSI(DIN) = %mosi|MISO(None) = %miso|SCK(CLK) = %sck"
    //% cs.defl=DigitalPin.P16
    //% mosi.defl=DigitalPin.P15
    //% miso.defl=DigitalPin.P14
    //% sck.defl=DigitalPin.P13
    //% group="5. Lirbraries"
    //% weight=78
    export function max7219set(cs: DigitalPin, mosi: DigitalPin, miso: DigitalPin, sck: DigitalPin): void {
        setup(1, cs, mosi, miso, sck)
    }

    //% blockId="MAX7219_text"
    //% block="MAX7219 text %string pos %pos time %time"
    //% string.defl="text"
    //% time.defl=100
    //% group="5. Lirbraries"
    //% weight=77
    export function max7219Text(string: string, pos:number, time: number): void {
        let _text = string
        let _out = []
        let _TT = []
        let _rowTime = time

        for (let i = 0; i < _text.length; i++) {
            for (let j = 0; j < keylist.length; j++) {
                if (keylist[j] == _text.charAt(i)) {
                    _out.push(j)
                }
            }
        }

        for (let x = 0; x < _out.length; x++) {
            clearAll()
            for (let i = 0; i < font_matrix[_out[x]].length; i++) {
                font_matrix[_out[x]][i]
                _registerAll(_DIGIT[i+pos], font_matrix[_out[x]][i])
            }
            basic.pause(_rowTime)
        }
    }

    //% blockId="MAX7219_scroll_text"
    //% block="MAX7219 scroll text %string time %time"
    //% string.defl="text"
    //% time.defl=100
    //% group="5. Lirbraries"
    //% weight=76
    export function max7219Scroll(string: string, time: number): void {
        let _text = string
        let _out = []
        let _TT = []
        let _rowTime = time

        for (let i = 0; i < _text.length; i++) {
            for (let j = 0; j < keylist.length; j++) {
                if (keylist[j] == _text.charAt(i)) {
                    _out.push(j)
                }
            }
        }

        for (let x = 0; x < _out.length; x++) {
            clearAll()
            for (let i = 0; i < font_matrix[_out[x]].length; i++) {
                _TT.push(font_matrix[_out[x]][i])
            }
        }

        let _max7219 = [0, 0, 0, 0, 0, 0, 0, 0]


        for (let index = 0; index < _max7219.length + _TT.length; index++) {
            _max7219.shift()
            if (index >= _TT.length) {
                _max7219.push(0)
            }
            else {
                _max7219.push(_TT[index])
            }
            for (let g=0; g<_max7219.length; g++) {
            _registerAll(_DIGIT[g], _max7219[g])
            }
            basic.pause(_rowTime)
        }
    }

    //% blockId="MAX7219_clear"
    //% block="MAX7219 clear"
    //% group="5. Lirbraries"
    //% weight=75
    export function max7219Clear(): void {
        clearAll()
    }

    /**
     * TODO: LCD1602液晶模組
     * @param myAddr=>I2C
     */
    //% blockId="LCD_setAddress"
    //% block="LCD1602 I2C address %myAddr"
    //% group="5. Lirbraries"
    //% weight=74 blockExternalInputs=true
    export function setAddress(myAddr: I2C_ADDR): void {
        LCD_I2C_ADDR = myAddr
        setI2CAddress()
    }

    //% blockId="LCD_clear"
    //% block="LCD clear"
    //% group="5. Lirbraries"
    //% weight=73
    export function clear(): void {
        setcmd(0x01)
    }

    //% blockId="LCD_backlight"
    //% block="set LCD backlight %on"
    //% group="5. Lirbraries"
    //% weight=72
    export function set_backlight(on: SwState): void {
        if (on == 1)
            BK = 0x08
        else
            BK = 0x00
        setcmd(0x00)
    }

    //% blockId="LCD_putString"
    //% block="LCD show string %s|on x:%x|y:%y"
    //% group="5. Lirbraries"
    //% weight=71
    //% x.min=0 x.max=15 y.min=0 y.max=1
    export function putString(s: string, x: number, y: number): void {
        if (s.length > 0) {
            let breakPoint = -1
            printChar(s.charCodeAt(0), x, y)
            if (y == 0)
                breakPoint = 16 - x
            for (let i = 1; i < s.length; i++) {
                if (i == breakPoint)
                    printChar(s.charCodeAt(i), 0, 1)
                else
                    printChar(s.charCodeAt(i), -1, 0)
            }
        }
    }
    //% blockId="LCD_putNumber"
    //% block="LCD show number %n|on x:%x|y:%y"
    //% group="5. Lirbraries"
    //% weight=70
    //% x.min=0 x.max=15 y.min=0 y.max=1
    export function putNumber(n: number, x: number, y: number): void {
        putString(n.toString(),x,y)
    }

}
