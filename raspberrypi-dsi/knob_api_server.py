#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
旋鈕 API 服務器
提供 HTTP API 來讀取旋鈕位置
"""

from flask import Flask, jsonify
from flask_cors import CORS
import logging
import sys
from pathlib import Path

# 設定日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # 允許跨域請求

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
    GPIO.setup(button_gpio_pin, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)  # 下拉電阻（按下時連到 3V3 = HIGH）
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
    """獲取當前旋鈕位置"""
    if knob_handler is None:
        return jsonify({
            'success': False,
            'message': '旋鈕處理器未初始化（可能不在樹莓派上運行）'
        }), 503
    
    try:
        pos = knob_handler.read_position()
        task = knob_handler.get_current_task()
        
        if pos is not None:
            return jsonify({
                'success': True,
                'position': pos,
                'name': knob_handler.names[pos],
                'task': task
            })
        else:
            return jsonify({
                'success': False,
                'message': '無法讀取旋鈕位置（可能沒有選中任何位置）'
            })
    except Exception as e:
        logger.error(f"讀取旋鈕位置失敗: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route("/api/knob/health", methods=["GET"])
def health_check():
    """健康檢查"""
    return jsonify({
        'status': 'ok',
        'knob_handler_available': knob_handler is not None
    })

@app.route("/api/button/state", methods=["GET"])
def get_button_state():
    """獲取按鈕狀態（GPIO 4，接 3V3）"""
    from flask import request
    
    # 獲取 GPIO 參數（如果提供）
    gpio_param = request.args.get('gpio', str(button_gpio_pin))
    try:
        gpio_pin = int(gpio_param)
    except ValueError:
        gpio_pin = button_gpio_pin
    
    if button_handler is None:
        return jsonify({
            'success': False,
            'pressed': False,
            'message': '按鈕處理器未初始化（可能不在樹莓派上運行）'
        }), 503
    
    try:
        import RPi.GPIO as GPIO
        # 讀取 GPIO 狀態
        # 按鈕接 3V3，按下時 GPIO 4 會是 HIGH (1)，釋放時是 LOW (0)（使用下拉電阻）
        state = GPIO.input(gpio_pin)
        pressed = (state == GPIO.HIGH)  # HIGH = 按下（連到 3V3）
        
        return jsonify({
            'success': True,
            'pressed': pressed,
            'state': 1 if pressed else 0,
            'gpio': gpio_pin,
            'value': state
        })
    except Exception as e:
        logger.error(f"讀取按鈕狀態失敗: {e}")
        return jsonify({
            'success': False,
            'pressed': False,
            'error': str(e)
        }), 500

@app.route("/api/button", methods=["GET"])
def get_button():
    """獲取按鈕狀態（簡化端點）"""
    return get_button_state()

@app.route("/api/gpio/<int:gpio>", methods=["GET"])
def get_gpio_state(gpio):
    """獲取指定 GPIO 的狀態"""
    if button_handler is None:
        return jsonify({
            'success': False,
            'state': 0,
            'message': 'GPIO 處理器未初始化'
        }), 503
    
    try:
        import RPi.GPIO as GPIO
        state = GPIO.input(gpio)
        pressed = (state == GPIO.HIGH)
        
        return jsonify({
            'success': True,
            'pressed': pressed,
            'state': 1 if pressed else 0,
            'gpio': gpio,
            'value': state,
            'gpio' + str(gpio): 1 if pressed else 0,
            'gpio_' + str(gpio): 1 if pressed else 0
        })
    except Exception as e:
        logger.error(f"讀取 GPIO {gpio} 狀態失敗: {e}")
        return jsonify({
            'success': False,
            'state': 0,
            'error': str(e)
        }), 500

@app.route("/api/knob/debug", methods=["GET"])
def debug_gpio():
    """調試端點：檢查所有 GPIO 的狀態"""
    if knob_handler is None:
        return jsonify({
            'success': False,
            'message': '旋鈕處理器未初始化'
        }), 503
    
    try:
        import RPi.GPIO as GPIO
        gpio_states = {}
        for i, pin in enumerate(knob_handler.pins):
            try:
                state = GPIO.input(pin)
                gpio_states[pin] = {
                    'state': 'LOW' if state == GPIO.LOW else 'HIGH',
                    'value': state,
                    'gpio_index': i,
                    'ui_position': knob_handler.gpio_to_position.get(i),
                    'task': knob_handler.task_map.get(knob_handler.gpio_to_position.get(i)) if knob_handler.gpio_to_position.get(i) is not None else None
                }
            except Exception as e:
                gpio_states[pin] = {'error': str(e)}
        
        current_pos = knob_handler.read_position()
        return jsonify({
            'success': True,
            'gpio_states': gpio_states,
            'current_position': current_pos,
            'last_stable_position': knob_handler.last_stable_position,
            'pins_mapping': {
                'gpio_pins': knob_handler.pins,
                'gpio_to_position': knob_handler.gpio_to_position,
                'task_map': knob_handler.task_map
            }
        })
    except Exception as e:
        logger.error(f"調試 GPIO 失敗: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == "__main__":
    # 啟動 Flask 服務器
    logger.info("啟動旋鈕和按鈕 API 服務器...")
    logger.info("旋鈕 API 端點: http://0.0.0.0:5001/api/knob/position")
    logger.info("按鈕 API 端點: http://0.0.0.0:5001/api/button/state?gpio=4")
    logger.info(f"按鈕 GPIO: {button_gpio_pin} (實體針腳 7，接 3V3)")
    app.run(host='0.0.0.0', port=5001, debug=False)

