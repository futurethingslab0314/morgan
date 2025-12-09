#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
旋鈕控制處理模組（優化版 - 增加防抖處理）
讀取 GPIO 5, 6, 13, 19, 26, 21 的狀態來判斷旋鈕位置
"""

import RPi.GPIO as GPIO
import time
import logging
import threading
from typing import Optional, Callable

logger = logging.getLogger(__name__)

class RotaryKnobHandler:
    """旋鈕處理器（帶防抖功能）"""
    
    def __init__(self):
        # GPIO 腳位配置（順序：5, 6, 13, 19, 26, 21）
        self.pins = [5, 6, 13, 19, 26, 21]
        self.names = ["選單 1", "選單 2", "選單 3", "選單 4", "選單 5", "選單 6"]
        
        # GPIO 索引到 UI 位置的映射
        # GPIO順序: [5, 6, 13, 19, 26, 21]
        # 對應任務: [讀書, 工作, 創作, 冥想, 遊戲, 休息]
        # UI位置:   [0,   1,   2,   4,   5,   3]  (位置3是底部，給休息)
        self.gpio_to_position = {
            0: 0,  # GPIO 5 (索引0) -> 位置0 -> 讀書（頂部）
            1: 1,  # GPIO 6 (索引1) -> 位置1 -> 工作
            2: 2,  # GPIO 13 (索引2) -> 位置2 -> 創作
            3: 4,  # GPIO 19 (索引3) -> 位置4 -> 冥想
            4: 5,  # GPIO 26 (索引4) -> 位置5 -> 遊戲
            5: 3   # GPIO 21 (索引5) -> 位置3 -> 休息（底部）
        }
        
        # 任務對應（6個任務，按 UI 位置順序）
        self.task_map = {
            0: 'READING',    # 位置0 -> 讀書（頂部）
            1: 'WORK',       # 位置1 -> 工作
            2: 'CREATIVE',   # 位置2 -> 創作
            3: 'REST',       # 位置3 -> 休息（底部）
            4: 'MEDITATION', # 位置4 -> 冥想
            5: 'GAME'        # 位置5 -> 遊戲
        }
        
        self.current_position = None
        self.last_stable_position = None  # 上次穩定的位置
        self.on_position_change: Optional[Callable] = None
        
        # 防抖處理參數
        self.debounce_count = 0  # 連續讀取到相同位置的次數
        self.debounce_threshold = 3  # 需要連續讀取3次才確認（可調整）
        self.candidate_position = None  # 候選位置
        
        # 運行狀態
        self.running = False
        self.monitor_thread = None
        self._stop_event = threading.Event()
        
        # 初始化 GPIO
        self._setup_gpio()
    
    def _setup_gpio(self):
        """初始化 GPIO 設定"""
        try:
            GPIO.setmode(GPIO.BCM)
            
            # 啟用每個 GPIO 的內部上拉電阻
            for p in self.pins:
                GPIO.setup(p, GPIO.IN, pull_up_down=GPIO.PUD_UP)
            
            logger.info("旋鈕 GPIO 設定完成")
        except Exception as e:
            logger.error(f"GPIO 設定失敗: {e}")
            raise
    
    def read_position(self) -> Optional[int]:
        """讀取當前旋鈕位置（0-5），多次讀取取平均值以提高穩定性"""
        try:
            # 連續讀取5次，取最常見的值（增加讀取次數以提高穩定性）
            readings = []
            gpio_states = {}  # 記錄每個 GPIO 的狀態，用於調試
            
            for _ in range(5):
                # 讀取所有 GPIO 的狀態
                active_pins = []
                for i, p in enumerate(self.pins):
                    state = GPIO.input(p)
                    gpio_states[p] = state
                    if state == GPIO.LOW:
                        active_pins.append(i)
                
                # 如果有多個 pin 是 LOW，記錄所有（但通常應該只有一個）
                if active_pins:
                    # 如果有多個，選擇第一個（或者可以記錄所有）
                    readings.append(active_pins[0])
                else:
                    # 沒有讀取到任何 LOW，記錄 None
                    readings.append(None)
                
                time.sleep(0.01)  # 短暫延遲
            
            # 過濾掉 None 值
            valid_readings = [r for r in readings if r is not None]
            
            if not valid_readings:
                # 所有讀取都是 None，記錄調試信息
                logger.warning(f"無法讀取到任何有效位置，GPIO 狀態: {gpio_states}")
                return None
            
            # 返回最常見的 GPIO 索引
            gpio_index = max(set(valid_readings), key=valid_readings.count)
            
            # 將 GPIO 索引轉換為 UI 位置
            ui_position = self.gpio_to_position.get(gpio_index)
            
            # 調試信息：如果讀取到創作（索引2）或休息（索引5），記錄詳細信息
            if gpio_index == 2 or gpio_index == 5:
                logger.info(f"讀取到 GPIO 索引 {gpio_index} (GPIO {self.pins[gpio_index]}) -> UI 位置 {ui_position}, GPIO 狀態: {gpio_states}, 有效讀取: {valid_readings}")
            
            return ui_position
        except Exception as e:
            logger.error(f"讀取旋鈕位置失敗: {e}")
            return None
    
    def get_current_task(self) -> Optional[str]:
        """獲取當前對應的任務類型（使用穩定的位置）"""
        pos = self.last_stable_position if self.last_stable_position is not None else self.read_position()
        if pos is not None and pos in self.task_map:
            return self.task_map[pos]
        return None
    
    def start_monitoring(self, callback: Optional[Callable] = None):
        """開始監控旋鈕位置變化"""
        if self.running:
            logger.warning("旋鈕監控已在運行")
            return
        
        if callback:
            self.on_position_change = callback
        
        self.running = True
        self._stop_event.clear()
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        logger.info("旋鈕監控已啟動（防抖模式）")
    
    def _monitor_loop(self):
        """監控循環（帶防抖處理）"""
        while self.running and not self._stop_event.is_set():
            pos = self.read_position()
            
            # 防抖處理邏輯
            if pos is not None:
                # 讀取到有效位置
                if pos == self.candidate_position:
                    # 與候選位置相同，增加計數
                    self.debounce_count += 1
                else:
                    # 位置改變，重置候選位置
                    self.candidate_position = pos
                    self.debounce_count = 1
                
                # 如果連續讀取到相同位置達到閾值，確認位置變更
                if self.debounce_count >= self.debounce_threshold:
                    if pos != self.current_position:
                        # 位置確實改變了
                        self.current_position = pos
                        self.last_stable_position = pos
                        task = self.task_map.get(pos)
                        logger.info(f"旋鈕位置變更: {self.names[pos]} -> 任務: {task}")
                        
                        if self.on_position_change:
                            try:
                                self.on_position_change(pos, task)
                            except Exception as e:
                                logger.error(f"位置變更回調執行失敗: {e}")
            else:
                # 讀取到 None（空檔），保持上次穩定位置，重置防抖計數
                self.debounce_count = 0
                self.candidate_position = None
                # 不更新 current_position，保持上次有效位置
            
            time.sleep(0.05)  # 50ms 輪詢間隔
    
    def stop_monitoring(self):
        """停止監控"""
        self.running = False
        self._stop_event.set()
        if self.monitor_thread:
            self.monitor_thread.join(timeout=1)
        logger.info("旋鈕監控已停止")
    
    def cleanup(self):
        """清理 GPIO 資源"""
        self.stop_monitoring()
        try:
            GPIO.cleanup()
            logger.info("GPIO 清理完成")
        except Exception as e:
            logger.error(f"GPIO 清理失敗: {e}")

# 全域實例
_knob_handler = None

def get_knob_handler() -> RotaryKnobHandler:
    """獲取旋鈕處理器單例"""
    global _knob_handler
    if _knob_handler is None:
        _knob_handler = RotaryKnobHandler()
    return _knob_handler

