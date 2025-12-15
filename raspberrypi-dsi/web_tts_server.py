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
try:
    from flask_cors import CORS
    CORS_AVAILABLE = True
except Exception:
    CORS_AVAILABLE = False
from pathlib import Path

from audio_manager import get_audio_manager


def create_app():
    app = Flask(__name__)
    # 啟用 CORS，允許從 https 網站呼叫 http://127.0.0.1:5005
    if CORS_AVAILABLE:
        CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=False)
    logger = logging.getLogger("pi-tts-server")
    audio = get_audio_manager()

    @app.route("/health", methods=["GET"])  # 簡單健康檢查
    def health():
        return jsonify({"ok": True})

    @app.route("/tts/play", methods=["POST"])  # 播放文字（舊版：即時生成並播放）
    def tts_play():
        """
        舊版端點：接收文字，立即呼叫 OpenAI TTS 生成音檔並播放。
        注意：這會在 HTTP 請求期間同步等待整段語音播放完成。
        """
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

            resp = jsonify({"success": True})
            resp.headers['Access-Control-Allow-Origin'] = '*'
            return resp

        except Exception as e:
            logger.exception("/tts/play error")
            resp = jsonify({"success": False, "error": str(e)})
            resp.headers['Access-Control-Allow-Origin'] = '*'
            return resp, 500

    @app.route("/tts/generate", methods=["POST"])  # 只生成音檔，不播放
    def tts_generate():
        """
        新端點：只生成 OpenAI TTS 音檔，不播放。
        用於「先準備好」，之後再透過 /tts/play_cached 播放。
        """
        try:
            data = request.get_json(force=True, silent=True) or {}
            text = (data.get("text") or "").strip()
            language_code = (data.get("languageCode") or "zh").strip()

            if not text:
                return jsonify({"success": False, "error": "text is required"}), 400

            audio_file = audio._generate_audio_openai_direct(text, language_code)
            if not audio_file:
                return jsonify({"success": False, "error": "TTS generation failed"}), 500

            resp = jsonify({
                "success": True,
                "audio_id": audio_file.name,      # 檔名（快取目錄下）
                "path": str(audio_file)           # 完整路徑（除非必要，前端可不用）
            })
            resp.headers['Access-Control-Allow-Origin'] = '*'
            return resp

        except Exception as e:
            logger.exception("/tts/generate error")
            resp = jsonify({"success": False, "error": str(e)})
            resp.headers['Access-Control-Allow-Origin'] = '*'
            return resp, 500

    @app.route("/tts/play_cached", methods=["POST"])  # 播放已生成的音檔
    def tts_play_cached():
        """
        播放先前透過 /tts/generate 生成並快取的音檔。
        參數：
            - audio_id: 檔名（建議用這個）
            - path:    完整路徑（可選，除非有特殊需求）
        """
        try:
            data = request.get_json(force=True, silent=True) or {}
            audio_id = (data.get("audio_id") or "").strip()
            audio_path = (data.get("path") or "").strip()

            if not audio_id and not audio_path:
                return jsonify({"success": False, "error": "audio_id or path is required"}), 400

            if audio_path:
                audio_file = Path(audio_path)
            else:
                # 使用快取目錄 + 檔名
                cache_dir = getattr(audio, "cache_dir", None)
                if not cache_dir:
                    return jsonify({"success": False, "error": "cache_dir is not configured"}), 500
                audio_file = cache_dir / audio_id

            if not audio_file.exists():
                return jsonify({"success": False, "error": f"audio file not found: {audio_file}"}), 404

            played = audio.play_audio_file_direct(audio_file)
            if not played:
                return jsonify({"success": False, "error": "audio playback failed"}), 500

            resp = jsonify({"success": True})
            resp.headers['Access-Control-Allow-Origin'] = '*'
            return resp

        except Exception as e:
            logger.exception("/tts/play_cached error")
            resp = jsonify({"success": False, "error": str(e)})
            resp.headers['Access-Control-Allow-Origin'] = '*'
            return resp, 500

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


