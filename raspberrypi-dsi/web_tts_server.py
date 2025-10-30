#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
樹莓派本地 TTS 服務
- 提供 HTTP 端點，讓前端傳入文字，透過 OpenAI TTS 生成語音並由喇叭播放
- 依賴 raspberrypi-dsi/audio_manager.py

啟動方式:
  python3 raspberrypi-dsi/web_tts_server.py --port 5005
"""

import argparse
import logging
from flask import Flask, request, jsonify
from pathlib import Path

from audio_manager import get_audio_manager


def create_app():
    app = Flask(__name__)
    logger = logging.getLogger("pi-tts-server")
    audio = get_audio_manager()

    @app.route("/health", methods=["GET"])  # 簡單健康檢查
    def health():
        return jsonify({"ok": True})

    @app.route("/tts/play", methods=["POST"])  # 播放文字
    def tts_play():
        try:
            data = request.get_json(force=True, silent=True) or {}
            text = (data.get("text") or "").strip()
            language_code = (data.get("languageCode") or "zh").strip()

            if not text:
                return jsonify({"success": False, "error": "text is required"}), 400

            # 直接用 OpenAI 生成音檔並播放
            audio_file = audio._generate_audio_openai_direct(text, language_code)
            if not audio_file:
                return jsonify({"success": False, "error": "TTS generation failed"}), 500

            played = audio.play_audio_file_direct(audio_file)
            if not played:
                return jsonify({"success": False, "error": "audio playback failed"}), 500

            return jsonify({"success": True})

        except Exception as e:
            logger.exception("/tts/play error")
            return jsonify({"success": False, "error": str(e)}), 500

    return app


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=5005)
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)
    app = create_app()
    app.run(host=args.host, port=args.port)


if __name__ == "__main__":
    main()


