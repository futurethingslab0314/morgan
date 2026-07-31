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

    @app.route("/audio/play_url", methods=["POST"])
    def audio_play_url():
        """
        瀏覽器被 Autoplay 擋住時的後備：下載遠端 mp3 並用本地喇叭播放。
        body: { url, max_duration?, volume? }
        """
        try:
            import tempfile
            import threading
            import time
            import urllib.request

            data = request.get_json(force=True, silent=True) or {}
            url = (data.get("url") or "").strip()
            max_duration = data.get("max_duration")
            volume = data.get("volume", 1.0)

            if not url:
                return jsonify({"success": False, "error": "url is required"}), 400

            # 僅允許 http(s)，避免任意檔案讀取
            if not (url.startswith("http://") or url.startswith("https://")):
                return jsonify({"success": False, "error": "only http(s) urls allowed"}), 400

            suffix = ".mp3"
            lower = url.lower().split("?")[0]
            if lower.endswith(".wav"):
                suffix = ".wav"
            elif lower.endswith(".ogg"):
                suffix = ".ogg"
            elif lower.endswith(".m4a"):
                suffix = ".m4a"

            tmp_path = None
            try:
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                    tmp_path = Path(tmp.name)
                urllib.request.urlretrieve(url, str(tmp_path))

                # 若有 max_duration：背景播放並在時限後停止，避免 captain.mp3 整首播完
                if max_duration is not None:
                    try:
                        max_seconds = float(max_duration)
                    except (TypeError, ValueError):
                        max_seconds = 0

                    if max_seconds > 0:
                        result = {"ok": False}

                        def _play():
                            result["ok"] = bool(audio.play_audio_file_direct(tmp_path))

                        t = threading.Thread(target=_play, daemon=True)
                        t.start()
                        t.join(timeout=max_seconds)
                        # 超時則嘗試停止 pygame 播放
                        try:
                            import pygame
                            if pygame.mixer.get_init():
                                pygame.mixer.music.stop()
                        except Exception:
                            pass
                        # 再給一點時間讓執行緒收尾
                        t.join(timeout=1.0)
                        if not result["ok"] and t.is_alive():
                            # 播放可能仍在進行但已強制停止；視為成功觸發
                            pass
                        resp = jsonify({"success": True, "volume": volume, "truncated": True, "max_duration": max_seconds})
                        resp.headers["Access-Control-Allow-Origin"] = "*"
                        return resp

                played = audio.play_audio_file_direct(tmp_path)
                if not played:
                    return jsonify({"success": False, "error": "audio playback failed"}), 500

                resp = jsonify({"success": True, "volume": volume})
                resp.headers["Access-Control-Allow-Origin"] = "*"
                return resp
            finally:
                if tmp_path and tmp_path.exists():
                    try:
                        tmp_path.unlink()
                    except Exception:
                        pass

        except Exception as e:
            logger.exception("/audio/play_url error")
            resp = jsonify({"success": False, "error": str(e)})
            resp.headers["Access-Control-Allow-Origin"] = "*"
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


