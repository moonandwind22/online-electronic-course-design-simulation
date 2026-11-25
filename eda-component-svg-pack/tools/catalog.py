"""Asset catalog for the electronic course design SVG library."""


def asset(slug, name, model, category, package, kind, label="", sub="", scope="current", sources=None, detail=""):
    return {
        "slug": slug,
        "name": name,
        "model": model,
        "category": category,
        "package": package,
        "kind": kind,
        "label": label or model,
        "sub": sub,
        "scope": scope,
        "sources": sources or [],
        "detail": detail,
    }


ASSETS = [
    # Current project: digital logic and timing
    asset("74ls161-dip16", "四位二进制计数器", "74LS161", "芯片与逻辑", "DIP-16", "dip", "74LS161", "COUNTER", sources=["workspace-digital.html", "ai-netlist.html"]),
    asset("74ls47-dip16", "BCD 七段译码器", "74LS47", "芯片与逻辑", "DIP-16", "dip", "74LS47", "DECODER", sources=["workspace-digital.html", "ai-netlist.html"]),
    asset("74ls00-nand", "四路 2 输入与非门", "74LS00", "芯片与逻辑", "NAND", "nand", sources=["workspace-digital.html", "ai-netlist.html"]),
    asset("74ls08-and", "四路 2 输入与门", "74LS08", "芯片与逻辑", "AND", "and", sources=["workspace-digital.html", "ai-netlist.html"]),
    asset("74ls32-or", "四路 2 输入或门", "74LS32", "芯片与逻辑", "OR", "or", sources=["workspace-digital.html"]),
    asset("74ls86-xor", "四路 2 输入异或门", "74LS86", "芯片与逻辑", "XOR", "xor", sources=["workspace-digital.html"]),
    asset("74ls74-dip14", "双 D 触发器", "74LS74", "芯片与逻辑", "DIP-14", "dip", "74LS74", "D FF", sources=["workspace-digital.html"]),
    asset("74ls138-dip16", "3-8 线译码器", "74LS138", "芯片与逻辑", "DIP-16", "dip", "74LS138", "3 TO 8", sources=["workspace-digital.html"]),
    asset("74ls373-dip20", "八路透明锁存器", "74LS373", "芯片与逻辑", "DIP-20", "dip", "74LS373", "LATCH", sources=["workspace-digital.html"]),
    asset("74hc595-dip16", "八位移位寄存器", "74HC595", "芯片与逻辑", "DIP-16", "dip", "74HC595", "SHIFT", sources=["workspace-digital.html"]),

    # Current project: MCU and boards
    asset("stc89c52rc-dip40", "8051 最小系统", "STC89C52RC", "芯片与逻辑", "DIP-40", "dip", "STC89C52", "8051", sources=["workspace-mcu51.html"]),
    asset("stm32f103c8t6-lqfp48", "ARM Cortex-M3 微控制器", "STM32F103C8T6", "芯片与逻辑", "LQFP-48", "qfp", "STM32", "F103C8", sources=["workspace-mcu-stm32.html"]),

    # Current project: displays and input
    asset("seven-segment-1digit", "一位七段数码管", "7-SEG-1", "显示器件", "共阴 · 1 位", "seven1", sources=["workspace-digital.html"]),
    asset("seven-segment-4digit", "四位七段数码管", "7-SEG-4", "显示器件", "共阴 · 4 位", "seven4", sources=["workspace-mcu51.html"]),
    asset("lcd1602", "字符液晶模块", "LCD1602", "显示器件", "16×2 · 并行", "lcd", sources=["workspace-mcu51.html", "workspace-mcu-stm32.html"]),
    asset("oled-096-i2c", "OLED 显示模块", "OLED 0.96\"", "显示器件", "128×64 · I²C", "oled", sources=["workspace-mcu-stm32.html"]),
    asset("led-5mm-red", "发光二极管", "LED 5 mm", "显示器件", "红色 · THT", "led", sources=["workspace-analog.html", "workspace-digital.html", "workspace-mcu51.html", "workspace-mcu-stm32.html"]),
    asset("tactile-button-6mm", "轻触按键", "6×6 mm", "输入器件", "常开 · 4 脚", "button", sources=["workspace-digital.html", "workspace-mcu51.html"]),
    asset("keypad-4x4", "矩阵键盘", "4×4 Keypad", "输入器件", "16 键 · 扫描", "keypad", sources=["workspace-mcu51.html"]),
    asset("potentiometer", "电位器", "Potentiometer", "输入器件", "单圈 · 线性", "potentiometer", sources=["workspace-analog.html", "workspace-power.html"]),

    # Current project: communication and instruments
    asset("usb-ttl-ch340", "USB 转串口模块", "CH340 USB-TTL", "通信与接口", "4 Pin · UART", "usbttl", sources=["workspace-mcu-stm32.html"]),
    asset("logic-analyzer", "逻辑分析仪", "Logic Analyzer", "仪器与信号", "8 CH", "analyzer", sources=["workspace-mcu51.html", "workspace-mcu-stm32.html"]),
    asset("serial-terminal", "串口终端", "UART Terminal", "仪器与信号", "TX / RX", "terminal", sources=["workspace-mcu51.html"]),
    asset("oscilloscope", "双通道示波器", "Oscilloscope", "仪器与信号", "2 CH", "oscilloscope", sources=["workspace-analog.html", "workspace-power.html"]),
    asset("signal-source-sine", "正弦信号源", "Sine Source", "仪器与信号", "1 kHz", "sine", sources=["workspace-analog.html"]),
    asset("clock-source-square", "方波时钟源", "Clock Source", "仪器与信号", "1 kHz", "clock", sources=["workspace-digital.html"]),
    asset("pwm-driver", "PWM 功率驱动模块", "PWM Driver", "仪器与信号", "100 kHz", "pwm", sources=["workspace-power.html"]),

    # Current project: actuators
    asset("active-buzzer", "有源蜂鸣器", "Active Buzzer", "执行与声学", "5 V · THT", "buzzer", sources=["workspace-mcu51.html"]),
    asset("servo-sg90", "微型舵机", "SG90", "执行与声学", "PWM 50 Hz", "servo", sources=["workspace-mcu-stm32.html"]),
    asset("stepper-28byj48", "五线步进电机", "28BYJ-48", "执行与声学", "ULN2003", "stepper", sources=["workspace-mcu51.html", "workspace-mcu-stm32.html"]),

    # Current project: analog and power semiconductors
    asset("2n2222-to92", "NPN 三极管", "2N2222", "分立半导体", "TO-92", "to92", "2222", "NPN", sources=["workspace-analog.html"]),
    asset("lm358-dip8", "双运算放大器", "LM358", "芯片与逻辑", "DIP-8", "soic", "LM358", "DUAL OP", sources=["workspace-analog.html"]),
    asset("irf540n-to220", "N 沟道 MOSFET", "IRF540N", "分立半导体", "TO-220", "to220", "IRF540", "N-MOS", sources=["workspace-power.html"]),
    asset("irf9540n-to220", "P 沟道 MOSFET", "IRF9540N", "分立半导体", "TO-220", "to220", "IRF9540", "P-MOS", sources=["workspace-power.html"]),
    asset("fga25n120-to247", "绝缘栅双极晶体管", "FGA25N120", "分立半导体", "TO-247", "to247", "25N120", "IGBT", sources=["workspace-power.html"]),
    asset("bt151-to220", "晶闸管", "BT151", "分立半导体", "TO-220", "to220", "BT151", "SCR", sources=["workspace-power.html"]),

    # Current project: passives and switching
    asset("resistor-axial", "轴向电阻", "Resistor", "无源器件", "轴向 · 1/4 W", "resistor", sources=["workspace-analog.html", "workspace-power.html"]),
    asset("capacitor-ceramic", "瓷片电容", "Ceramic Capacitor", "无源器件", "径向 · THT", "capacitor", sources=["workspace-analog.html"]),
    asset("electrolytic-capacitor", "铝电解电容", "Electrolytic", "无源器件", "径向 · 极性", "electrolytic", sources=["workspace-analog.html", "workspace-power.html"]),
    asset("inductor-shielded", "功率电感", "Inductor", "无源器件", "屏蔽式 · SMD", "inductor", sources=["workspace-power.html"]),
    asset("1n4148-axial", "开关二极管", "1N4148", "分立半导体", "DO-35", "diode", sources=["workspace-analog.html"]),
    asset("ss34-sma", "肖特基二极管", "SS34", "分立半导体", "SMA", "schottky", sources=["workspace-power.html"]),
    asset("spst-rocker", "单刀单掷开关", "SPST", "输入器件", "船型 · 2 脚", "rocker", sources=["workspace-power.html"]),

    # Extension: microcontrollers, boards and common ICs
    asset("atmega328p-dip28", "8 位 AVR 微控制器", "ATmega328P", "芯片与逻辑", "DIP-28", "dip", "ATmega328P", "AVR", scope="extended"),
    asset("blue-pill-stm32", "STM32 核心开发板", "Blue Pill", "开发板", "STM32F103 · 2×20 Pin", "board", "STM32", "BLUE PILL", scope="extended"),
    asset("esp32-devkit", "Wi-Fi / 蓝牙开发板", "ESP32 DevKit", "开发板", "ESP32-WROOM · 38 Pin", "board", "ESP32", "DEVKIT", scope="extended"),
    asset("esp8266-nodemcu", "Wi-Fi 开发板", "NodeMCU ESP8266", "开发板", "ESP-12E · 30 Pin", "board", "ESP8266", "NODE MCU", scope="extended"),
    asset("raspberry-pi-pico", "RP2040 微控制器板", "Pico RP2040", "开发板", "40 Pin · 3 个调试焊盘", "board", "RP2040", "PICO", scope="extended"),
    asset("arduino-uno-r3", "ATmega328P 学习板", "UNO R3 Compatible", "开发板", "USB-B · DC Jack", "arduino", scope="extended", detail="通用兼容板轮廓，不含品牌商标"),
    asset("ne555-dip8", "定时器", "NE555", "芯片与逻辑", "DIP-8", "soic", "NE555", "TIMER", scope="extended"),
    asset("uln2003-dip16", "七路达林顿驱动", "ULN2003", "芯片与逻辑", "DIP-16", "dip", "ULN2003", "DRIVER", scope="extended"),
    asset("l293d-dip16", "双 H 桥电机驱动", "L293D", "芯片与逻辑", "DIP-16", "dip", "L293D", "H-BRIDGE", scope="extended"),
    asset("max3232-soic16", "RS-232 电平转换", "MAX3232", "通信与接口", "SOIC-16", "soic", "MAX3232", "RS232", scope="extended"),
    asset("mcp2551-soic8", "CAN 总线收发器", "MCP2551", "通信与接口", "SOIC-8", "soic", "MCP2551", "CAN", scope="extended"),
    asset("pcf8574-soic16", "I²C 八路 IO 扩展", "PCF8574", "芯片与逻辑", "SOIC-16", "soic", "PCF8574", "I/O EXP", scope="extended"),
    asset("at24c02-soic8", "I²C EEPROM", "AT24C02", "芯片与逻辑", "SOIC-8", "soic", "24C02", "EEPROM", scope="extended"),
    asset("w25q64-soic8", "SPI NOR Flash", "W25Q64", "芯片与逻辑", "SOIC-8", "soic", "W25Q64", "FLASH", scope="extended"),
    asset("ads1115-msop10", "16 位四通道 ADC", "ADS1115", "芯片与逻辑", "MSOP-10", "qfn", "ADS1115", "ADC", scope="extended"),
    asset("hx711-module", "24 位称重 ADC 模块", "HX711", "传感器", "24 bit · 差分输入", "module-chip", "HX711", "LOAD CELL", scope="extended"),
    asset("ds3231-rtc-module", "实时时钟模块", "DS3231 RTC", "芯片与逻辑", "I²C · 电池座", "rtc", scope="extended"),

    # Extension: power management
    asset("lm7805-to220", "三端线性稳压器", "LM7805", "电源器件", "TO-220", "to220", "LM7805", "+5 V", scope="extended"),
    asset("ams1117-sot223", "低压差线性稳压器", "AMS1117-3.3", "电源器件", "SOT-223", "sot223", "1117", "3V3", scope="extended"),
    asset("buck-lm2596", "降压电源模块", "LM2596 Buck", "电源器件", "DC-DC · Step Down", "power-module", "LM2596", "BUCK", scope="extended"),
    asset("boost-mt3608", "升压电源模块", "MT3608 Boost", "电源器件", "DC-DC · Step Up", "power-module", "MT3608", "BOOST", scope="extended"),
    asset("battery-18650", "锂离子电芯", "18650 Li-ion", "电源器件", "3.7 V · 圆柱", "battery", scope="extended"),
    asset("crystal-hc49", "无源晶振", "HC-49S", "无源器件", "2 Pin · THT", "crystal", scope="extended"),
    asset("transformer", "低频变压器", "Transformer", "电源器件", "E-I 铁芯", "transformer", scope="extended"),

    # Extension: sensors and modules
    asset("mpu6050-module", "六轴姿态传感器", "MPU6050", "传感器", "I²C · 3 轴陀螺 + 3 轴加速度", "sensor-axis", scope="extended"),
    asset("dht11-module", "温湿度传感器", "DHT11", "传感器", "单总线 · 数字输出", "dht11", scope="extended"),
    asset("ds18b20-to92", "数字温度传感器", "DS18B20", "传感器", "TO-92 · 1-Wire", "to92", "18B20", "1-WIRE", scope="extended"),
    asset("bme280-module", "温湿度气压传感器", "BME280", "传感器", "I²C / SPI", "sensor-metal", "BME280", "ENV", scope="extended"),
    asset("bh1750-module", "数字光照传感器", "BH1750", "传感器", "I²C · Lux", "sensor-light", scope="extended"),
    asset("hc-sr04", "超声波测距模块", "HC-SR04", "传感器", "Trig / Echo", "ultrasonic", scope="extended"),
    asset("hc-sr501-pir", "人体红外感应模块", "HC-SR501", "传感器", "PIR · 数字输出", "pir", scope="extended"),
    asset("ir-receiver", "红外接收管", "IR Receiver", "传感器", "38 kHz · 3 Pin", "ir", scope="extended"),
    asset("photoresistor", "光敏电阻", "LDR", "传感器", "CdS · 模拟量", "ldr", scope="extended"),
    asset("reed-switch", "干簧管", "Reed Switch", "传感器", "常开 · 磁控", "reed", scope="extended"),
    asset("microphone-module", "声音传感器模块", "Microphone", "传感器", "模拟 / 数字输出", "microphone", scope="extended"),
    asset("sd-card-module", "Micro SD 存储模块", "TF Card", "通信与接口", "SPI · 3.3 V", "sd", scope="extended"),

    # Extension: displays, controls and actuators
    asset("tft-18-spi", "彩色 TFT 显示模块", "1.8\" TFT", "显示器件", "128×160 · SPI", "tft", scope="extended"),
    asset("led-matrix-8x8", "LED 点阵模块", "8×8 Matrix", "显示器件", "共阴 / 共阳", "matrix", scope="extended"),
    asset("rgb-led-5mm", "全彩发光二极管", "RGB LED", "显示器件", "4 Pin · 共阴", "rgbled", scope="extended"),
    asset("ws2812-5050", "可寻址 RGB LED", "WS2812", "显示器件", "5050 · 单总线", "ws2812", scope="extended"),
    asset("rotary-encoder", "增量式旋转编码器", "EC11", "输入器件", "A / B / SW", "encoder", scope="extended"),
    asset("dual-axis-joystick", "双轴摇杆模块", "Joystick", "输入器件", "X / Y / SW", "joystick", scope="extended"),
    asset("relay-srd05", "电磁继电器", "SRD-05VDC", "执行与声学", "5 V · SPDT", "relay", scope="extended"),
    asset("dc-motor-130", "微型直流电机", "DC Motor 130", "执行与声学", "3–6 V", "motor", scope="extended"),
    asset("cooling-fan", "直流散热风扇", "DC Fan", "执行与声学", "2 Pin · 无刷", "fan", scope="extended"),
    asset("speaker-8r", "小型扬声器", "Speaker 8 Ω", "执行与声学", "8 Ω · 0.5 W", "speaker", scope="extended"),

    # Extension: connectors
    asset("usb-c-connector", "USB Type-C 母座", "USB-C", "连接器", "16 Pin · SMT", "usbc", scope="extended"),
    asset("pin-header-40", "单排针", "Pin Header", "连接器", "1×40 · 2.54 mm", "header", scope="extended"),
    asset("terminal-block-3p", "螺钉式接线端子", "KF301-3P", "连接器", "3 Pin · 5.08 mm", "terminal-block", scope="extended"),
]


NAME_MAP = {
    "74LS161": "74ls161-dip16", "74LS47": "74ls47-dip16", "74LS00": "74ls00-nand",
    "74LS08": "74ls08-and", "74LS32": "74ls32-or", "74LS86": "74ls86-xor",
    "74LS74": "74ls74-dip14", "74LS138": "74ls138-dip16", "74LS373": "74ls373-dip20",
    "74HC595": "74hc595-dip16", "8051 最小系统": "stc89c52rc-dip40",
    "STM32F103C8T6": "stm32f103c8t6-lqfp48", "LCD1602": "lcd1602",
    "OLED 0.96\"": "oled-096-i2c", "LED": "led-5mm-red", "轻触按键": "tactile-button-6mm",
    "4×4 矩阵键盘": "keypad-4x4", "电位器": "potentiometer", "USB-TTL": "usb-ttl-ch340",
    "逻辑分析仪": "logic-analyzer", "串口终端": "serial-terminal", "示波器": "oscilloscope",
    "信号源": "signal-source-sine", "时钟源": "clock-source-square", "PWM 驱动": "pwm-driver",
    "有源蜂鸣器": "active-buzzer", "舵机": "servo-sg90", "步进电机": "stepper-28byj48",
    "NPN 三极管": "2n2222-to92", "LM358": "lm358-dip8", "N-MOSFET": "irf540n-to220",
    "P-MOSFET": "irf9540n-to220", "IGBT": "fga25n120-to247", "晶闸管 SCR": "bt151-to220",
    "电阻": "resistor-axial", "负载电阻": "resistor-axial", "电容": "capacitor-ceramic",
    "电解电容": "electrolytic-capacitor", "电感": "inductor-shielded", "二极管": "1n4148-axial",
    "肖特基二极管": "ss34-sma", "理想开关": "spst-rocker",
}
