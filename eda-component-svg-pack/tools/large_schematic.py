"""Generate large, editable EDA schematic symbols for every small library asset."""
from __future__ import annotations

import html
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

INK = "var(--eda-ink,currentColor)"
MUTED = "var(--eda-muted,#94A3B8)"
PIN_LINE = "var(--eda-pin-line,#94A3B8)"
BODY = "var(--eda-symbol-body,#FFFFFF)"
ACCENT = "var(--eda-accent,#F59E0B)"
FONT = "ui-monospace,SFMono-Regular,Consolas,monospace"
DIRECTIONS = {"i": "input", "o": "output", "b": "bidirectional", "p": "power", "n": "passive"}


def esc(value):
    return html.escape(str(value), quote=True)


def seq(*items):
    result = []
    for item in items:
        number, name, *direction = item.split(":")
        result.append({"number": number, "name": name, "direction": DIRECTIONS[direction[0] if direction else "i"]})
    return result


def ports(*items):
    result = []
    for item in items:
        name, *direction = item.split(":")
        result.append({"number": "", "name": name, "direction": DIRECTIONS[direction[0] if direction else "b"]})
    return result


def spec(left, right=None, package="", shape="module", ref="U1", subtitle="", simple=""):
    return {"left": left, "right": right or [], "package": package, "shape": shape, "ref": ref, "subtitle": subtitle, "simple": simple}


SPECS = {}


def add(slugs, value):
    for slug in slugs.split():
        SPECS[slug] = value


quad_left = seq("1:1A", "2:1B", "3:1Y:o", "4:2A", "5:2B", "6:2Y:o", "7:GND:p")
quad_right = seq("14:VCC:p", "13:4B", "12:4A", "11:4Y:o", "10:3B", "9:3A", "8:3Y:o")
add("74ls00-nand 74ls08-and 74ls32-or 74ls86-xor", spec(quad_left, quad_right, "DIP-14", "dip", subtitle="QUAD 2-INPUT LOGIC"))
add("74ls161-dip16", spec(seq("1:nCLR", "2:CLK", "3:A", "4:B", "5:C", "6:D", "7:ENP", "8:GND:p"), seq("16:VCC:p", "15:RCO:o", "14:QA:o", "13:QB:o", "12:QC:o", "11:QD:o", "10:ENT", "9:nLOAD"), "DIP-16", "dip", subtitle="4-BIT BINARY COUNTER"))
add("74ls47-dip16", spec(seq("1:B", "2:C", "3:nLT", "4:BI/RBO:b", "5:RBI", "6:D", "7:A", "8:GND:p"), seq("16:VCC:p", "15:f:o", "14:g:o", "13:a:o", "12:b:o", "11:c:o", "10:d:o", "9:e:o"), "DIP-16", "dip", subtitle="BCD TO 7-SEGMENT DECODER"))
add("74ls74-dip14", spec(seq("1:n1CLR", "2:1D", "3:1CLK", "4:n1PRE", "5:1Q:o", "6:1nQ:o", "7:GND:p"), seq("14:VCC:p", "13:n2CLR", "12:2D", "11:2CLK", "10:n2PRE", "9:2Q:o", "8:2nQ:o"), "DIP-14", "dip", subtitle="DUAL D FLIP-FLOP"))
add("74ls138-dip16", spec(seq("1:A", "2:B", "3:C", "4:nG2A", "5:nG2B", "6:G1", "7:Y7:o", "8:GND:p"), seq("16:VCC:p", "15:Y0:o", "14:Y1:o", "13:Y2:o", "12:Y3:o", "11:Y4:o", "10:Y5:o", "9:Y6:o"), "DIP-16", "dip", subtitle="3-TO-8 LINE DECODER"))
add("74ls373-dip20", spec(seq("1:nOE", "2:D0", "3:D1", "4:D2", "5:D3", "6:D4", "7:D5", "8:D6", "9:D7", "10:GND:p"), seq("20:VCC:p", "19:Q0:o", "18:Q1:o", "17:Q2:o", "16:Q3:o", "15:Q4:o", "14:Q5:o", "13:Q6:o", "12:Q7:o", "11:LE"), "DIP-20", "dip", subtitle="OCTAL TRANSPARENT LATCH"))
add("74hc595-dip16", spec(seq("1:QB:o", "2:QC:o", "3:QD:o", "4:QE:o", "5:QF:o", "6:QG:o", "7:QH:o", "8:GND:p"), seq("16:VCC:p", "15:QA:o", "14:SER", "13:nOE", "12:RCLK", "11:SRCLK", "10:nSRCLR", "9:QH':o"), "DIP-16", "dip", subtitle="8-BIT SHIFT REGISTER"))
add("stc89c52rc-dip40", spec(seq("1:P1.0:b", "2:P1.1:b", "3:P1.2:b", "4:P1.3:b", "5:P1.4:b", "6:P1.5:b", "7:P1.6:b", "8:P1.7:b", "9:RST", "10:P3.0/RXD:b", "11:P3.1/TXD:b", "12:P3.2/INT0:b", "13:P3.3/INT1:b", "14:P3.4/T0:b", "15:P3.5/T1:b", "16:P3.6/WR:b", "17:P3.7/RD:b", "18:XTAL2:o", "19:XTAL1", "20:GND:p"), seq("40:VCC:p", "39:P0.0:b", "38:P0.1:b", "37:P0.2:b", "36:P0.3:b", "35:P0.4:b", "34:P0.5:b", "33:P0.6:b", "32:P0.7:b", "31:EA", "30:ALE:o", "29:PSEN:o", "28:P2.7:b", "27:P2.6:b", "26:P2.5:b", "25:P2.4:b", "24:P2.3:b", "23:P2.2:b", "22:P2.1:b", "21:P2.0:b"), "DIP-40", "dip", subtitle="8051 MICROCONTROLLER"))
add("stm32f103c8t6-lqfp48", spec(seq("1:VBAT:p", "2:PC13:b", "3:PC14/OSC32_IN:b", "4:PC15/OSC32_OUT:b", "5:PD0/OSC_IN:b", "6:PD1/OSC_OUT:b", "7:NRST", "8:VSSA:p", "9:VDDA:p", "10:PA0/WKUP:b", "11:PA1:b", "12:PA2:b", "13:PA3:b", "14:PA4:b", "15:PA5:b", "16:PA6:b", "17:PA7:b", "18:PB0:b", "19:PB1:b", "20:PB2/BOOT1:b", "21:PB10:b", "22:PB11:b", "23:VSS:p", "24:VDD:p"), seq("48:VDD:p", "47:VSS:p", "46:PB9:b", "45:PB8:b", "44:BOOT0", "43:PB7:b", "42:PB6:b", "41:PB5:b", "40:PB4/NJTRST:b", "39:PB3/JTDO:b", "38:PA15/JTDI:b", "37:PA14/SWCLK:b", "36:VDD:p", "35:VSS:p", "34:PA13/SWDIO:b", "33:PA12:b", "32:PA11:b", "31:PA10:b", "30:PA9:b", "29:PA8:b", "28:PB15:b", "27:PB14:b", "26:PB13:b", "25:PB12:b"), "LQFP-48", "qfp", subtitle="ARM CORTEX-M3 MICROCONTROLLER"))
add("lm358-dip8", spec(seq("1:OUT1:o", "2:IN1-", "3:IN1+", "4:GND:p"), seq("8:VCC:p", "7:OUT2:o", "6:IN2-", "5:IN2+"), "DIP-8", "dip", subtitle="DUAL OPERATIONAL AMPLIFIER"))
add("atmega328p-dip28", spec(seq("1:PC6/RESET:b", "2:PD0/RXD:b", "3:PD1/TXD:b", "4:PD2/INT0:b", "5:PD3/INT1:b", "6:PD4/T0:b", "7:VCC:p", "8:GND:p", "9:PB6/XTAL1:b", "10:PB7/XTAL2:b", "11:PD5/T1:b", "12:PD6/AIN0:b", "13:PD7/AIN1:b", "14:PB0/CLKO:b"), seq("28:PC5/ADC5/SCL:b", "27:PC4/ADC4/SDA:b", "26:PC3/ADC3:b", "25:PC2/ADC2:b", "24:PC1/ADC1:b", "23:PC0/ADC0:b", "22:GND:p", "21:AREF", "20:AVCC:p", "19:PB5/SCK:b", "18:PB4/MISO:b", "17:PB3/MOSI:b", "16:PB2/SS:b", "15:PB1:b"), "DIP-28", "dip", subtitle="8-BIT AVR MICROCONTROLLER"))
add("ne555-dip8", spec(seq("1:GND:p", "2:TRIG", "3:OUT:o", "4:nRESET"), seq("8:VCC:p", "7:DISCH:b", "6:THRES", "5:CTRL"), "DIP-8", "dip", subtitle="PRECISION TIMER"))
add("uln2003-dip16", spec(seq("1:IN1", "2:IN2", "3:IN3", "4:IN4", "5:IN5", "6:IN6", "7:IN7", "8:GND:p"), seq("16:COM:p", "15:OUT1:o", "14:OUT2:o", "13:OUT3:o", "12:OUT4:o", "11:OUT5:o", "10:OUT6:o", "9:OUT7:o"), "DIP-16", "dip", subtitle="7-CH DARLINGTON DRIVER"))
add("l293d-dip16", spec(seq("1:EN1", "2:IN1", "3:OUT1:o", "4:GND:p", "5:GND:p", "6:OUT2:o", "7:IN2", "8:VS:p"), seq("16:VCC:p", "15:IN4", "14:OUT4:o", "13:GND:p", "12:GND:p", "11:OUT3:o", "10:IN3", "9:EN2"), "DIP-16", "dip", subtitle="DUAL H-BRIDGE DRIVER"))
add("max3232-soic16", spec(seq("1:C1+", "2:VS+", "3:C1-", "4:C2+", "5:C2-", "6:VS-", "7:T2OUT:o", "8:R2IN"), seq("16:VCC:p", "15:GND:p", "14:T1OUT:o", "13:R1IN", "12:R1OUT:o", "11:T1IN", "10:T2IN", "9:R2OUT:o"), "SOIC-16", "soic", subtitle="RS-232 TRANSCEIVER"))
add("mcp2551-soic8", spec(seq("1:TXD", "2:VSS:p", "3:VDD:p", "4:RXD:o"), seq("8:RS", "7:CANH:b", "6:CANL:b", "5:VREF:o"), "SOIC-8", "soic", subtitle="HIGH-SPEED CAN TRANSCEIVER"))
add("pcf8574-soic16", spec(seq("1:A0", "2:A1", "3:A2", "4:P0:b", "5:P1:b", "6:P2:b", "7:P3:b", "8:VSS:p"), seq("16:VCC:p", "15:SDA:b", "14:SCL", "13:nINT:o", "12:P7:b", "11:P6:b", "10:P5:b", "9:P4:b"), "SOIC-16", "soic", subtitle="I2C 8-BIT I/O EXPANDER"))
add("at24c02-soic8", spec(seq("1:A0", "2:A1", "3:A2", "4:GND:p"), seq("8:VCC:p", "7:WP", "6:SCL", "5:SDA:b"), "SOIC-8", "soic", subtitle="I2C SERIAL EEPROM"))
add("w25q64-soic8", spec(seq("1:nCS", "2:DO/IO1:o", "3:nWP/IO2", "4:GND:p"), seq("8:VCC:p", "7:nHOLD/IO3", "6:CLK", "5:DI/IO0"), "SOIC-8", "soic", subtitle="SPI NOR FLASH"))
add("ads1115-msop10", spec(seq("1:ADDR", "2:ALERT/RDY:o", "3:GND:p", "4:AIN0", "5:AIN1"), seq("10:SCL", "9:SDA:b", "8:VDD:p", "7:AIN3", "6:AIN2"), "MSOP-10", "soic", subtitle="16-BIT 4-CHANNEL ADC"))

# Displays, controls, modules and instruments use functional ports where board revisions vary.
add("lcd1602", spec(seq("1:VSS:p", "2:VDD:p", "3:VO", "4:RS", "5:RW", "6:E", "7:D0:b", "8:D1:b"), seq("16:LED_A:p", "15:LED_K:p", "14:D7:b", "13:D6:b", "12:D5:b", "11:D4:b", "10:D3:b", "9:D2:b"), "16 PIN", "module", "LCD1", "16 x 2 CHARACTER LCD"))
add("seven-segment-1digit", spec(ports("A", "B", "C", "D", "E"), ports("F", "G", "DP", "CC1:p", "CC2:p"), "10 PIN", "module", "DS1", "COMMON-CATHODE DISPLAY"))
add("seven-segment-4digit", spec(ports("A", "B", "C", "D", "E", "F"), ports("G", "DP", "D1", "D2", "D3", "D4"), "12 PIN", "module", "DS1", "4-DIGIT MULTIPLEXED DISPLAY"))
add("oled-096-i2c", spec(ports("GND:p", "VCC:p"), ports("SCL", "SDA:b"), "I2C", "module", "DS1", "128 x 64 OLED"))
add("tactile-button-6mm", spec(ports("A1:n", "A2:n"), ports("B1:n", "B2:n"), "4 PIN", "module", "SW1", "NORMALLY OPEN"))
add("keypad-4x4", spec(ports("R1:o", "R2:o", "R3:o", "R4:o"), ports("C1", "C2", "C3", "C4"), "8 PIN", "module", "KP1", "4 x 4 MATRIX KEYPAD"))
add("potentiometer", spec(seq("1:CCW:n", "2:WIPER:n"), seq("3:CW:n"), "3 PIN", "module", "RV1", "VARIABLE RESISTOR"))
add("usb-ttl-ch340", spec(ports("VCC:p", "GND:p", "TXD:o"), ports("RXD"), "UART", "module", "MOD1", "USB TO SERIAL"))
add("logic-analyzer", spec(ports("CH0", "CH1", "CH2", "CH3", "CH4"), ports("CH5", "CH6", "CH7", "GND:p", "CLK"), "8 CH", "module", "LA1", "LOGIC ANALYZER"))
add("serial-terminal", spec(ports("VCC:p", "GND:p", "RXD"), ports("TXD:o"), "UART", "module", "UART1", "SERIAL TERMINAL"))
add("oscilloscope", spec(ports("CH1", "CH2"), ports("EXT_TRIG", "GND:p"), "2 CH", "module", "SCOPE1", "DUAL-CHANNEL OSCILLOSCOPE"))
add("signal-source-sine", spec(ports("GND:p"), ports("OUT:o"), "1 kHz", "module", "SIG1", "SINE SOURCE"))
add("clock-source-square", spec(ports("GND:p"), ports("OUT:o"), "1 kHz", "module", "CLK1", "SQUARE CLOCK SOURCE"))
add("pwm-driver", spec(ports("PWM", "DIR", "EN", "GND:p"), ports("VM:p", "OUT+:o", "OUT-:o"), "100 kHz", "module", "DRV1", "PWM POWER DRIVER"))
add("servo-sg90", spec(ports("GND:p", "VCC:p"), ports("SIG"), "3 PIN", "module", "M1", "PWM SERVO"))
add("stepper-28byj48", spec(ports("VCC:p", "IN1", "IN2"), ports("IN3", "IN4"), "5 WIRE", "module", "M1", "5-WIRE STEPPER"))
add("blue-pill-stm32", spec(ports("3V3:p", "5V:p", "GND:p", "NRST", "BOOT0", "BOOT1", "SWDIO:b", "SWCLK", "PA0:b", "PA1:b", "PA2:b", "PA3:b", "PA4:b", "PA5:b", "PA6:b", "PA7:b"), ports("PB0:b", "PB1:b", "PB8:b", "PB9:b", "PB10:b", "PB11:b", "PB12:b", "PB13:b", "PB14:b", "PB15:b", "PC13:b", "PC14:b", "PC15:b", "PA8:b", "PA9:b", "PA10:b"), "2 x 20 PIN", "module", "MOD1", "STM32F103 CORE BOARD"))
add("esp32-devkit", spec(ports("EN", "GPIO36", "GPIO39", "GPIO34", "GPIO35", "GPIO32:b", "GPIO33:b", "GPIO25:b", "GPIO26:b", "GPIO27:b", "GPIO14:b", "GPIO12:b", "GPIO13:b", "GPIO22:b", "GPIO1/TXD:b", "GPIO3/RXD:b", "3V3:p"), ports("GPIO21:b", "GPIO19:b", "GPIO18:b", "GPIO5:b", "GPIO17:b", "GPIO16:b", "GPIO4:b", "GPIO0:b", "GPIO2:b", "GPIO15:b", "GPIO23:b", "GPIO6:b", "GPIO7:b", "GPIO8:b", "VIN:p", "GND:p"), "38 PIN", "module", "MOD1", "ESP32-WROOM DEVKIT"))
add("esp8266-nodemcu", spec(ports("A0", "GPIO0:b", "GPIO2:b", "GPIO4:b", "GPIO5:b", "GPIO12:b", "GPIO13:b", "GPIO14:b"), ports("GPIO15:b", "GPIO16:b", "TXD:o", "RXD", "EN", "RST", "3V3:p", "VIN:p", "GND:p"), "30 PIN", "module", "MOD1", "ESP-12E NODEMCU"))
add("raspberry-pi-pico", spec(seq("1:GP0:b", "2:GP1:b", "3:GND:p", "4:GP2:b", "5:GP3:b", "6:GP4:b", "7:GP5:b", "8:GND:p", "9:GP6:b", "10:GP7:b", "11:GP8:b", "12:GP9:b", "13:GND:p", "14:GP10:b", "15:GP11:b", "16:GP12:b", "17:GP13:b", "18:GND:p", "19:GP14:b", "20:GP15:b"), seq("40:VBUS:p", "39:VSYS:p", "38:GND:p", "37:3V3_EN", "36:3V3_OUT:p", "35:ADC_VREF", "34:GP28:b", "33:GND:p", "32:GP27:b", "31:GP26:b", "30:RUN", "29:GP22:b", "28:GND:p", "27:GP21:b", "26:GP20:b", "25:GP19:b", "24:GP18:b", "23:GND:p", "22:GP17:b", "21:GP16:b"), "2 x 20 PIN", "module", "MOD1", "RP2040 DEVELOPMENT BOARD"))
add("arduino-uno-r3", spec(ports("D0/RXD:b", "D1/TXD:b", "D2:b", "D3/PWM:b", "D4:b", "D5/PWM:b", "D6/PWM:b", "D7:b", "D8:b", "D9/PWM:b", "D10/SS:b", "D11/MOSI:b", "D12/MISO:b", "D13/SCK:b"), ports("A0", "A1", "A2", "A3", "A4/SDA:b", "A5/SCL:b", "AREF", "RESET", "3V3:p", "5V:p", "VIN:p", "GND:p", "IOREF:p"), "UNO R3", "module", "MOD1", "UNO-COMPATIBLE BOARD"))
add("hx711-module", spec(ports("DT:o", "SCK", "VCC:p", "GND:p", "E+"), ports("E-", "A+", "A-", "B+", "B-"), "24 BIT", "module", "MOD1", "LOAD-CELL ADC"))
add("ds3231-rtc-module", spec(ports("VCC:p", "GND:p", "SCL"), ports("SDA:b", "SQW:o", "32K:o"), "I2C RTC", "module", "MOD1", "REAL-TIME CLOCK"))
add("mpu6050-module", spec(ports("VCC:p", "GND:p", "SCL", "SDA:b"), ports("XDA:b", "XCL", "AD0", "INT:o"), "I2C", "module", "U1", "6-AXIS IMU"))
add("dht11-module", spec(ports("VCC:p", "DATA:b"), ports("GND:p"), "1-WIRE", "module", "SEN1", "TEMPERATURE / HUMIDITY"))
add("bme280-module", spec(ports("VCC:p", "GND:p", "SCL"), ports("SDA:b", "CSB", "SDO"), "I2C / SPI", "module", "SEN1", "ENVIRONMENT SENSOR"))
add("bh1750-module", spec(ports("VCC:p", "GND:p"), ports("SCL", "SDA:b", "ADDR"), "I2C", "module", "SEN1", "AMBIENT LIGHT SENSOR"))
add("hc-sr04", spec(ports("VCC:p", "TRIG"), ports("ECHO:o", "GND:p"), "4 PIN", "module", "SEN1", "ULTRASONIC RANGER"))
add("hc-sr501-pir", spec(ports("VCC:p"), ports("OUT:o", "GND:p"), "3 PIN", "module", "SEN1", "PIR MOTION SENSOR"))
add("ir-receiver", spec(ports("OUT:o"), ports("GND:p", "VCC:p"), "38 kHz", "module", "SEN1", "IR RECEIVER"))
add("microphone-module", spec(ports("VCC:p", "GND:p"), ports("AO:o", "DO:o"), "AUDIO", "module", "SEN1", "SOUND SENSOR"))
add("sd-card-module", spec(ports("VCC:p", "GND:p", "SCK"), ports("MOSI", "MISO:o", "CS"), "SPI", "module", "MOD1", "MICRO SD SOCKET"))
add("tft-18-spi", spec(ports("VCC:p", "GND:p", "SCK", "MOSI"), ports("RESET", "DC", "CS", "BL"), "SPI", "module", "DS1", "1.8-INCH TFT"))
add("led-matrix-8x8", spec(ports("R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"), ports("C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"), "16 PIN", "module", "DS1", "8 x 8 LED MATRIX"))
add("rgb-led-5mm", spec(ports("R", "G"), ports("B", "COM:p"), "4 PIN", "module", "D1", "RGB LED"))
add("ws2812-5050", spec(seq("1:VDD:p", "2:DOUT:o"), seq("4:DIN", "3:VSS:p"), "5050", "module", "D1", "ADDRESSABLE RGB LED"))
add("rotary-encoder", spec(ports("A:b", "B:b", "C:p"), ports("S1:n", "S2:n"), "5 PIN", "module", "EC1", "INCREMENTAL ENCODER"))
add("dual-axis-joystick", spec(ports("VCC:p", "GND:p"), ports("VRX:o", "VRY:o", "SW:o"), "5 PIN", "module", "JOY1", "DUAL-AXIS JOYSTICK"))
add("relay-srd05", spec(ports("COIL+:p", "COIL-:p"), ports("COM:b", "NO:b", "NC:b"), "SPDT", "module", "K1", "5 V RELAY"))
add("terminal-block-3p", spec(ports("1:n", "2:n"), ports("3:n"), "5.08 mm", "module", "J1", "SCREW TERMINAL"))
add("usb-c-connector", spec(ports("VBUS:p", "GND:p", "D+:b", "D-:b"), ports("CC1:b", "CC2:b", "SBU1:b", "SBU2:b", "SHIELD:p"), "USB-C", "module", "J1", "USB TYPE-C RECEPTACLE"))
add("pin-header-40", spec(seq(*[f"{i}:P{i}:b" for i in range(1, 21)]), seq(*[f"{i}:P{i}:b" for i in range(40, 20, -1)]), "1 x 40", "module", "J1", "2.54 mm PIN HEADER"))
add("buck-lm2596", spec(ports("IN+:p", "IN-:p"), ports("OUT+:o", "OUT-:o"), "DC-DC", "module", "PS1", "STEP-DOWN CONVERTER"))
add("boost-mt3608", spec(ports("IN+:p", "IN-:p"), ports("OUT+:o", "OUT-:o"), "DC-DC", "module", "PS1", "STEP-UP CONVERTER"))
add("transformer", spec(ports("P1:n", "P2:n"), ports("S1:n", "S2:n"), "E-I CORE", "module", "T1", "LOW-FREQUENCY TRANSFORMER"))
add("battery-18650", spec(ports("BAT-:p"), ports("BAT+:p"), "3.7 V", "module", "BT1", "LI-ION CELL"))
add("crystal-hc49", spec(ports("X1:n"), ports("X2:n"), "2 PIN", "module", "Y1", "QUARTZ CRYSTAL"))

add("lm7805-to220", spec(seq("1:IN:p", "2:GND:p"), seq("3:OUT:o"), "TO-220", "module", "U1", "FIXED 5 V REGULATOR"))
add("ams1117-sot223", spec(seq("1:GND/ADJ:p", "2:VOUT:o"), seq("4:VOUT_TAB:o", "3:VIN:p"), "SOT-223", "module", "U1", "3.3 V LDO REGULATOR"))
add("ds18b20-to92", spec(seq("1:GND:p", "2:DQ:b"), seq("3:VDD:p"), "TO-92", "module", "SEN1", "1-WIRE TEMPERATURE SENSOR"))

# Discrete semiconductors and passive parts use recognizable EDA symbols.
add("resistor-axial", spec(seq("1:1:n"), seq("2:2:n"), "AXIAL", "simple", "R1", simple="resistor"))
add("capacitor-ceramic", spec(seq("1:1:n"), seq("2:2:n"), "RADIAL", "simple", "C1", simple="capacitor"))
add("electrolytic-capacitor", spec(seq("1:+:p"), seq("2:-:p"), "POLARIZED", "simple", "C1", simple="electrolytic"))
add("inductor-shielded", spec(seq("1:1:n"), seq("2:2:n"), "SMD", "simple", "L1", simple="inductor"))
add("1n4148-axial", spec(seq("1:A:n"), seq("2:K:n"), "DO-35", "simple", "D1", simple="diode"))
add("ss34-sma", spec(seq("1:A:n"), seq("2:K:n"), "SMA", "simple", "D1", simple="schottky"))
add("led-5mm-red", spec(seq("1:A:n"), seq("2:K:n"), "5 mm", "simple", "D1", simple="led"))
add("photoresistor", spec(seq("1:1:n"), seq("2:2:n"), "LDR", "simple", "R1", simple="photoresistor"))
add("reed-switch", spec(seq("1:1:n"), seq("2:2:n"), "2 PIN", "simple", "SW1", simple="switch"))
add("spst-rocker", spec(seq("1:1:n"), seq("2:2:n"), "SPST", "simple", "SW1", simple="switch"))
add("active-buzzer", spec(seq("1:+:p"), seq("2:-:p"), "THT", "simple", "BZ1", simple="buzzer"))
add("dc-motor-130", spec(seq("1:M+:p"), seq("2:M-:p"), "DC MOTOR", "simple", "M1", simple="motor"))
add("cooling-fan", spec(seq("1:FAN+:p"), seq("2:FAN-:p"), "2 PIN", "simple", "FAN1", simple="fan"))
add("speaker-8r", spec(seq("1:SP+:p"), seq("2:SP-:p"), "8 OHM", "simple", "SP1", simple="speaker"))
add("2n2222-to92", spec(ports("B"), ports("C:o", "E:o"), "TO-92 · 核对厂商脚序", "module", "Q1", "NPN TRANSISTOR"))
add("irf540n-to220", spec(seq("1:G", "2:D:o"), seq("3:S:o"), "TO-220", "module", "Q1", "N-CHANNEL MOSFET"))
add("irf9540n-to220", spec(seq("1:G", "2:D:o"), seq("3:S:o"), "TO-220", "module", "Q1", "P-CHANNEL MOSFET"))
add("fga25n120-to247", spec(seq("1:G", "2:C:o"), seq("3:E:o"), "TO-247", "module", "Q1", "IGBT"))
add("bt151-to220", spec(seq("1:K:n", "2:A:n"), seq("3:G"), "TO-220", "module", "Q1", "THYRISTOR"))

CATEGORY_DIRS = {
    "芯片与逻辑": "chips", "显示器件": "displays", "输入器件": "inputs", "通信与接口": "interfaces",
    "仪器与信号": "instruments", "执行与声学": "actuators", "分立半导体": "semiconductors",
    "无源器件": "passives", "开发板": "boards", "传感器": "sensors", "电源器件": "power", "连接器": "connectors",
}


def large_asset_path(asset):
    if asset["slug"] == "74ls32-or":
        return Path("assets/extended/chips/74ls32-dip14-schematic.svg")
    folder = CATEGORY_DIRS.get(asset["category"], "modules")
    return Path("assets/large-schematic") / folder / f'{asset["slug"]}-schematic.svg'


def large_schematic_entry(slug):
    from catalog import ASSETS
    asset = next((a for a in ASSETS if a["slug"] == slug), None)
    if asset is None or asset["kind"] == "dip14-schematic":
        return None
    path = large_asset_path(asset)
    return {"source": slug, "file": path.as_posix()}


def text(x, y, value, size=7, fill=INK, anchor="start", weight=500, extra=""):
    return f'<text x="{x}" y="{y}" fill="{fill}" stroke="none" font-family="{FONT}" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}" {extra}>{esc(value)}</text>'


def pin_group(pin, side, index, y, body_left, body_right, width):
    direction = pin["direction"]
    number = pin["number"]
    name = pin["name"]
    active = direction in ("output", "power")
    fill = ACCENT if active else BODY
    stroke = ACCENT if active else PIN_LINE
    left = side == "left"
    x1, x2 = (16, body_left) if left else (body_right, width - 16)
    endpoint_x = x1 if left else x2
    gid = f"pin-{number}" if number else f"port-{side}-{index + 1}"
    number_attr = f' data-number="{esc(number)}"' if number else ""
    lead = f'<path d="M{x1} {y}H{x2}" fill="none" stroke="{PIN_LINE}" stroke-width="1.25"/>'
    endpoint = f'<circle cx="{endpoint_x}" cy="{y}" r="3.2" fill="{fill}" stroke="{stroke}" stroke-width="1.1"/>'
    number_text = ""
    if number:
        number_text = text(body_left - 10 if left else body_right + 10, y - 5, number, 5.8, MUTED, "end" if left else "start")
    label = text(body_left + 8 if left else body_right - 8, y + 3, name, 7.2, INK, "start" if left else "end", 700 if direction == "power" else 600)
    return f'<g id="{gid}" data-pin="{esc(number or name)}" data-name="{esc(name)}" data-direction="{direction}" data-side="{side}"{number_attr}>{lead}{endpoint}{number_text}{label}</g>'


def render_block(asset, data):
    pins = data["left"] + data["right"]
    max_name = max([len(p["name"]) for p in pins] + [4])
    width = max(200, min(340, 180 + max_name * 7))
    body_left, body_right = 64, width - 64
    center = width / 2
    rows = max(len(data["left"]), len(data["right"]), 1)
    pitch = 23
    first_y = 76
    body_bottom = first_y + (rows - 1) * pitch + 18
    height = max(190, body_bottom + 26)
    shape = data["shape"]
    if shape in ("dip", "soic"):
        body_path = f'M{body_left + 8} 30H{center - 8}C{center - 8} 44 {center + 8} 44 {center + 8} 30H{body_right - 8}Q{body_right} 30 {body_right} 38V{body_bottom - 8}Q{body_right} {body_bottom} {body_right - 8} {body_bottom}H{body_left + 8}Q{body_left} {body_bottom} {body_left} {body_bottom - 8}V38Q{body_left} 30 {body_left + 8} 30Z'
        package = f'<path d="{body_path}" fill="{BODY}" stroke="{INK}" stroke-width="1.6"/>'
    else:
        package = f'<rect x="{body_left}" y="30" width="{body_right - body_left}" height="{body_bottom - 30}" rx="8" fill="{BODY}" stroke="{INK}" stroke-width="1.6"/>'
        if shape == "qfp":
            package += f'<circle cx="{body_left + 10}" cy="42" r="2.3" fill="{ACCENT}" stroke="none"/>'
    markings = text(16, 18, data["ref"], 10, INK, weight=700)
    markings += text(width - 16, 18, data["package"] or asset["package"], 6.5, MUTED, "end", 600)
    markings += text(center, 55, asset["label"] or asset["model"], 11, INK, "middle", 700)
    subtitle = data["subtitle"] or asset["sub"] or asset["name"].upper()
    markings += text(center, 66, subtitle, 4.8, "var(--eda-muted,#64748B)", "middle", 500, 'letter-spacing="0.35"')
    groups = []
    for side, entries in (("left", data["left"]), ("right", data["right"])):
        for index, pin in enumerate(entries):
            groups.append(pin_group(pin, side, index, first_y + index * pitch, body_left, body_right, width))
    return f'<g id="package">{package}</g><g id="reference-and-markings">{markings}</g><g id="pins">' + "".join(groups) + "</g>", f"0 0 {width} {height}", width, height


def simple_geometry(kind):
    if kind == "resistor":
        return '<rect x="78" y="57" width="64" height="26" rx="2" fill="var(--eda-soft,#F8FAFC)" stroke="var(--eda-ink,currentColor)" stroke-width="1.8"/>'
    if kind in ("capacitor", "electrolytic"):
        plus = '<path d="M91 44h12M97 38v12" stroke="var(--eda-accent,#F59E0B)" stroke-width="1.6"/>' if kind == "electrolytic" else ""
        return f'<path d="M99 49v42M121 49v42" stroke="var(--eda-ink,currentColor)" stroke-width="2.4"/>{plus}'
    if kind == "inductor":
        return '<path d="M78 70c0-16 18-16 18 0 0-16 18-16 18 0 0-16 18-16 18 0 0-16 18-16 18 0" fill="none" stroke="var(--eda-ink,currentColor)" stroke-width="2"/>'
    if kind in ("diode", "schottky", "led"):
        cathode = '<path d="M126 48h-4M126 92h-4" stroke="var(--eda-ink,currentColor)" stroke-width="1.8"/>' if kind == "schottky" else ""
        arrows = '<path d="M121 43l12-14M127 43l12-14M128 29h5v5M134 29h5v5" stroke="var(--eda-accent,#F59E0B)" stroke-width="1.5"/>' if kind == "led" else ""
        return f'<path d="M91 48l27 22-27 22zM122 48v44" fill="var(--eda-soft,#F8FAFC)" stroke="var(--eda-ink,currentColor)" stroke-width="1.8"/>{cathode}{arrows}'
    if kind == "photoresistor":
        return '<rect x="78" y="57" width="64" height="26" rx="2" fill="var(--eda-soft,#F8FAFC)" stroke="var(--eda-ink,currentColor)" stroke-width="1.8"/><path d="M90 43l12-14M112 43l12-14M96 29h6v6M118 29h6v6" stroke="var(--eda-accent,#F59E0B)" stroke-width="1.5"/>'
    if kind == "switch":
        return '<path d="M82 70l48-26M82 70h0M142 70h0" stroke="var(--eda-ink,currentColor)" stroke-width="2.2"/><circle cx="82" cy="70" r="3" fill="var(--eda-symbol-body,#FFF)" stroke="var(--eda-ink,currentColor)"/><circle cx="142" cy="70" r="3" fill="var(--eda-symbol-body,#FFF)" stroke="var(--eda-ink,currentColor)"/>'
    if kind in ("buzzer", "speaker"):
        return '<path d="M87 57h20l26-18v62l-26-18H87zM143 52q18 18 0 36M151 44q27 26 0 52" fill="var(--eda-soft,#F8FAFC)" stroke="var(--eda-ink,currentColor)" stroke-width="1.8"/>'
    if kind in ("motor", "fan"):
        label = "M" if kind == "motor" else "F"
        blades = '<path d="M110 70q-22-30-28-7 15 12 28 7q22-30 28-7-15 12-28 7q30 22 7 28-12-15-7-28q-30 22-28 7 15-12 28-7" fill="none" stroke="var(--eda-ink,currentColor)" stroke-width="1.2"/>' if kind == "fan" else ""
        return f'<circle cx="110" cy="70" r="35" fill="var(--eda-soft,#F8FAFC)" stroke="var(--eda-ink,currentColor)" stroke-width="1.8"/>{blades or text(110, 77, label, 22, INK, "middle", 700)}'
    return '<rect x="78" y="45" width="64" height="50" rx="5" fill="var(--eda-soft,#F8FAFC)" stroke="var(--eda-ink,currentColor)" stroke-width="1.8"/>'


def render_simple(asset, data):
    width, height = 220, 150
    left, right = data["left"][0], data["right"][-1]
    left_pin = pin_group(left, "left", 0, 70, 78, 142, width).replace("M16 70H78", "M24 70H78").replace('cx="16"', 'cx="24"')
    right_pin = pin_group(right, "right", 0, 70, 78, 142, width).replace("M142 70H196", "M142 70H196").replace('cx="196"', 'cx="196"')
    # Simple symbols use compact leads and do not repeat pin names inside the symbol.
    left_pin = re.sub(r'<text[^>]*>' + re.escape(esc(left["name"])) + r'</text>', "", left_pin)
    right_pin = re.sub(r'<text[^>]*>' + re.escape(esc(right["name"])) + r'</text>', "", right_pin)
    markings = text(24, 20, data["ref"], 10, INK, weight=700)
    markings += text(196, 20, data["package"], 6.5, MUTED, "end", 600)
    markings += text(110, 122, asset["model"], 10, INK, "middle", 700)
    markings += text(110, 135, data["subtitle"] or asset["name"].upper(), 5.5, MUTED, "middle", 500)
    body = f'<path d="M24 70H78M142 70H196" stroke="{PIN_LINE}" stroke-width="1.25"/>' + simple_geometry(data["simple"])
    return f'<g id="symbol-body">{body}</g><g id="reference-and-markings">{markings}</g><g id="pins">{left_pin}{right_pin}</g>', "0 0 220 150", width, height


def render_large(asset):
    data = SPECS[asset["slug"]]
    if data["shape"] == "simple":
        content, viewbox, width, height = render_simple(asset, data)
    else:
        content, viewbox, width, height = render_block(asset, data)
    slug = asset["slug"] + "-large-schematic"
    title = f'{asset["model"]} · {asset["name"]}大符号'
    if data["shape"] in ("dip", "soic", "qfp"):
        desc = f'{asset["name"]}，{asset["package"]}。按标准器件引脚顺序绘制的生产级可编辑 EDA 原理图大符号。'
    elif data["shape"] == "simple":
        desc = f'{asset["name"]}，{asset["package"]}。生产级可编辑标准原理图符号，含独立端子与语义化分组。'
    else:
        desc = f'{asset["name"]}，{asset["package"]}。生产级可编辑 EDA 功能接口符号；无统一封装的模块不虚构物理脚号。'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" width="{width}" height="{height}" color="#475569" fill="none" stroke-linecap="round" stroke-linejoin="round" shape-rendering="geometricPrecision" role="img" aria-labelledby="title-{slug} desc-{slug}" data-component="{slug}" data-source-component="{asset["slug"]}"><title id="title-{slug}">{esc(title)}</title><desc id="desc-{slug}">{esc(desc)}</desc>{content}</svg>\n'


def generate_large_assets(root):
    from catalog import ASSETS
    sources = [a for a in ASSETS if a["kind"] != "dip14-schematic"]
    missing = [a["slug"] for a in sources if a["slug"] not in SPECS]
    if missing:
        raise RuntimeError("Missing large-symbol specifications: " + ", ".join(missing))
    entries = []
    for asset in sources:
        path = large_asset_path(asset)
        output = root / path
        if asset["slug"] != "74ls32-or":
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(render_large(asset), encoding="utf-8")
        tree = ET.parse(output)
        svg = tree.getroot()
        pins = svg.findall(".//{http://www.w3.org/2000/svg}g[@data-pin]")
        entries.append({"source": asset["slug"], "model": asset["model"], "name": asset["name"] + "大符号", "file": path.as_posix(), "viewBox": svg.attrib["viewBox"], "pin_count": len(pins), "symbol_type": SPECS[asset["slug"]]["shape"]})
    return entries


def update_manifest_large_symbols(root, entries):
    path = root / "manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    manifest["large_schematic_viewBox"] = "dynamic · 23-unit pin pitch"
    manifest["large_schematics"] = entries
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[1]
    result = generate_large_assets(root)
    update_manifest_large_symbols(root, result)
    print(json.dumps({"status": "generated", "large_schematics": len(result), "pins": sum(x["pin_count"] for x in result)}, ensure_ascii=False, indent=2))
