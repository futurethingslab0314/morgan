#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
旋鈕與按鈕 API 服務器
提供 HTTP API 來讀取旋鈕位置與按鈕狀態
"""

import logging

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("knob_api_server")

knob_handler = None
button_gpio_pin = 4  # GPIO 4 (實體針腳 7，接 3V3)
button_handler = None


# 嘗試導入旋鈕處理器（如果不在樹莓派上運行會失敗）
try:
    from rotary_knob_handler import get_knob_handler

    knob_handler = get_knob_handler()
    logger.info("旋鈕處理器初始化成功")
except ImportError as e:
    logger.warning(f"無法導入旋鈕處理器（可能不在樹莓派上運行）: {e}")
    knob_handler = None
except Exception as e:
    logger.error(f"旋鈕處理器初始化失敗: {e}")
    knob_handler = None


# 初始化按鈕 GPIO（GPIO 4，接 3V3）
try:
    import RPi.GPIO as GPIO

    GPIO.setmode(GPIO.BCM)
    # 下拉電阻（按下時連到 3V3 = HIGH）
    GPIO.setup(button_gpio_pin, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
    button_handler = True
    logger.info(f"按鈕 GPIO {button_gpio_pin} 初始化成功（接 3V3）")
except ImportError:
    logger.warning("無法導入 RPi.GPIO（可能不在樹莓派上運行）")
    button_handler = None
except Exception as e:
    logger.error(f"按鈕 GPIO 初始化失敗: {e}")
    button_handler = None


@app.route("/api/knob/position", methods=["GET"])
def get_knob_position():
    """獲取當前旋鈕位置（只返回位置 0-5，不返回任務）"""
    if knob_handler is None:
        return (
            jsonify(
                {
                    "success": False,
                    "knob_handler_available": False,
                    "message": "旋鈕處理器未初始化（可能不在樹莓派上運行）",
                }
            ),
            503,
        )
    
    try:
        pos = knob_handler.read_position()
        
        if pos is not None:
            # 直接回傳目前讀到的位置
            return jsonify(
                {
                    "success": True,
                    "knob_handler_available": True,
                    "position": pos,
                }
            )
        else:
            # 如果讀取不到位置，返回上次穩定位置（如果有的話）
            last_pos = getattr(knob_handler, "last_stable_position", None)
            if last_pos is not None:
                return jsonify(
                    {
                        "success": True,
                        "knob_handler_available": True,
                        "position": last_pos,
                    }
                )
            else:
                # 真的什麼都讀不到才回失敗
                return jsonify(
                    {
                        "success": False,
                        "knob_handler_available": True,
                        "message": "無法讀取旋鈕位置（可能沒有選中任何位置）",
                    }
                )
    except Exception as e:
        logger.error(f"讀取旋鈕位置失敗: {e}")
        return (
            jsonify(
                {
                    "success": False,
                    "knob_handler_available": True,
                    "error": str(e),
                }
            ),
            500,
        )


@app.route("/api/knob/health", methods=["GET"])
def health_check():
    """健康檢查"""
    return jsonify(
        {
            "status": "ok",
            "knob_handler_available": knob_handler is not None,
        }
    )


@app.route("/api/button/state", methods=["GET"])
def get_button_state():
    """獲取按鈕狀態（GPIO 4，接 3V3）"""
    # 獲取 GPIO 參數（如果提供）
    gpio_param = request.args.get("gpio", str(button_gpio_pin))
    try:
        gpio_pin = int(gpio_param)
    except ValueError:
        gpio_pin = button_gpio_pin

    if button_handler is None:
        return (
            jsonify(
                {
                    "success": False,
                    "pressed": False,
                    "message": "按鈕處理器未初始化（可能不在樹莓派上運行）",
                }
            ),
            503,
        )
    
    try:
        import RPi.GPIO as GPIO

        # 讀取 GPIO 狀態
        # 按鈕接 3V3，按下時 GPIO 4 會是 HIGH (1)，釋放時是 LOW (0)（使用下拉電阻）
        state = GPIO.input(gpio_pin)
        pressed = state == GPIO.HIGH  # HIGH = 按下（連到 3V3）

        return jsonify(
            {
                "success": True,
                "pressed": pressed,
                "state": 1 if pressed else 0,
                "gpio": gpio_pin,
                "value": state,
            }
        )
    except Exception as e:
        logger.error(f"讀取按鈕狀態失敗: {e}")
        return (
            jsonify(
                {
                    "success": False,
                    "pressed": False,
                    "message": "讀取按鈕狀態失敗",
                    "error": str(e),
                }
            ),
            500,
        )


@app.route("/api/button", methods=["GET"])
def get_button():
    """獲取按鈕狀態（簡化端點）"""
    return get_button_state()


if __name__ == "__main__":
    # 啟動 Flask 服務器
    logger.info("啟動旋鈕和按鈕 API 服務器...")
    logger.info("旋鈕 API 端點: http://0.0.0.0:5001/api/knob/position")
    logger.info("按鈕 API 端點: http://0.0.0.0:5001/api/button/state?gpio=4")
    logger.info(f"按鈕 GPIO: {button_gpio_pin} (實體針腳 7，接 3V3)")
    app.run(host="0.0.0.0", port=5001, debug=False)

