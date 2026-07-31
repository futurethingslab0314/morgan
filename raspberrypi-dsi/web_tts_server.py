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
from flask import Flask, request, jsonify, make_response
try:
    from flask_cors import CORS
    CORS_AVAILABLE = True
except Exception:
    CORS_AVAILABLE = False
from pathlib import Path

from audio_manager import get_audio_manager


def _cors_headers(resp):
    """無論有無 flask-cors，都補齊瀏覽器從 Vercel 打本機所需的 CORS。"""
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    resp.headers["Access-Control-Max-Age"] = "86400"
    return resp


def create_app():
    app = Flask(__name__)
    # 啟用 CORS，允許從 https 網站呼叫 http://127.0.0.1:5005
    if CORS_AVAILABLE:
        CORS(
            app,
            resources={r"/*": {"origins": "*"}},
            supports_credentials=False,
            allow_headers=["Content-Type", "Authorization"],
            methods=["GET", "POST", "OPTIONS"],
        )
    logger = logging.getLogger("pi-tts-server")
    audio = get_audio_manager()

    @app.after_request
    def add_cors(resp):
        return _cors_headers(resp)

    @app.route("/", methods=["OPTIONS"])
    @app.route("/<path:any_path>", methods=["OPTIONS"])
    def cors_preflight(any_path=None):
        # 沒裝 flask-cors 時，也要明確回應 preflight，否則 Chrome 會報 CORS
        return _cors_headers(make_response(("", 204)))

    @app.route("/health", methods=["GET"])  # 簡單健康檢查
    def health():
        return jsonify({
            "ok": True,
            "cors": True,
            "flask_cors": CORS_AVAILABLE
        })

    def _parse_tts_request(data):
        """從前端 JSON 取出 text / language / voice / speed。"""
        text = (data.get("text") or "").strip()
        language_code = (data.get("languageCode") or "zh").strip()
        voice = (data.get("voice") or "").strip() or None
        # 允許 gender 別名：male → onyx，female → nova
        gender = (data.get("gender") or "").strip().lower()
        if not voice and gender:
            voice = "onyx" if gender == "male" else "nova" if gender == "female" else None
        # 機長廣播預設男聲（前端若漏傳，也不再落到 config 的 nova）
        if not voice:
            voice = "onyx"
        speed = data.get("speed", None)
        return text, language_code, voice, speed

    @app.route("/tts/play", methods=["POST"])  # 播放文字（舊版：即時生成並播放）
    def tts_play():
        """
        舊版端點：接收文字，立即呼叫 OpenAI TTS 生成音檔並播放。
        注意：這會在 HTTP 請求期間同步等待整段語音播放完成。
        body 可含 voice（如 onyx）與 speed（0.25–4.0）。
        """
        try:
            data = request.get_json(force=True, silent=True) or {}
            text, language_code, voice, speed = _parse_tts_request(data)

            if not text:
                return jsonify({"success": False, "error": "text is required"}), 400

            logger.info("/tts/play voice=%s speed=%s", voice, speed)
            audio_file = audio._generate_audio_openai_direct(
                text, language_code, voice=voice, speed=speed
            )
            if not audio_file:
                return jsonify({"success": False, "error": "TTS generation failed"}), 500

            played = audio.play_audio_file_direct(audio_file)
            if not played:
                return jsonify({"success": False, "error": "audio playback failed"}), 500

            return jsonify({"success": True, "voice": voice, "speed": speed})

        except Exception as e:
            logger.exception("/tts/play error")
            return jsonify({"success": False, "error": str(e)}), 500

    @app.route("/tts/generate", methods=["POST"])  # 只生成音檔，不播放
    def tts_generate():
        """
        新端點：只生成 OpenAI TTS 音檔，不播放。
        用於「先準備好」，之後再透過 /tts/play_cached 播放。
        body 可含 voice（如 onyx）與 speed（0.25–4.0）。
        """
        try:
            data = request.get_json(force=True, silent=True) or {}
            text, language_code, voice, speed = _parse_tts_request(data)

            if not text:
                return jsonify({"success": False, "error": "text is required"}), 400

            logger.info("/tts/generate voice=%s speed=%s", voice, speed)
            audio_file = audio._generate_audio_openai_direct(
                text, language_code, voice=voice, speed=speed
            )
            if not audio_file:
                return jsonify({"success": False, "error": "TTS generation failed"}), 500

            return jsonify({
                "success": True,
                "audio_id": audio_file.name,      # 檔名（快取目錄下）
                "path": str(audio_file),          # 完整路徑（除非必要，前端可不用）
                "voice": voice,
                "speed": speed
            })

        except Exception as e:
            logger.exception("/tts/generate error")
            return jsonify({"success": False, "error": str(e)}), 500

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

            return jsonify({"success": True})

        except Exception as e:
            logger.exception("/tts/play_cached error")
            return jsonify({"success": False, "error": str(e)}), 500

    @app.route("/audio/play_url", methods=["POST"])
    def audio_play_url():
        """
        瀏覽器被 Autoplay 擋住時的後備：優先播本機 sounds/，否則下載遠端 mp3。
        body: { url, path?, max_duration?, volume? }
        """
        try:
            import tempfile
            import threading
            import urllib.request

            data = request.get_json(force=True, silent=True) or {}
            url = (data.get("url") or "").strip()
            rel_path = (data.get("path") or "").strip().lstrip("./")
            max_duration = data.get("max_duration")
            volume = data.get("volume", 1.0)

            if not url and not rel_path:
                return jsonify({"success": False, "error": "url or path is required"}), 400

            # 僅允許安全的相對路徑（例如 sounds/captain.mp3）
            local_file = None
            if rel_path and ".." not in rel_path and not rel_path.startswith("/"):
                # web_tts_server.py 位於 raspberrypi-dsi/，專案根目錄在上一層
                project_root = Path(__file__).resolve().parent.parent
                candidate = (project_root / rel_path).resolve()
                if str(candidate).startswith(str(project_root)) and candidate.exists():
                    local_file = candidate
                    logger.info("audio/play_url 使用本機檔案: %s", candidate)

            tmp_path = None
            play_path = local_file
            try:
                if play_path is None:
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

                    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                        tmp_path = Path(tmp.name)
                    # 下載逾時，避免卡死起飛流程
                    with urllib.request.urlopen(url, timeout=10) as resp, open(tmp_path, "wb") as out:
                        out.write(resp.read())
                    play_path = tmp_path

                def _play_with_limit(path_obj):
                    if max_duration is not None:
                        try:
                            max_seconds = float(max_duration)
                        except (TypeError, ValueError):
                            max_seconds = 0

                        if max_seconds > 0:
                            result = {"ok": False}

                            def _play():
                                result["ok"] = bool(audio.play_audio_file_direct(path_obj))

                            t = threading.Thread(target=_play, daemon=True)
                            t.start()
                            t.join(timeout=max_seconds)
                            try:
                                import pygame
                                if pygame.mixer.get_init():
                                    pygame.mixer.music.stop()
                            except Exception:
                                pass
                            t.join(timeout=1.0)
                            return True

                    return bool(audio.play_audio_file_direct(path_obj))

                played = _play_with_limit(play_path)
                if not played:
                    return jsonify({"success": False, "error": "audio playback failed"}), 500

                return jsonify({
                    "success": True,
                    "volume": volume,
                    "source": "local" if local_file else "download",
                    "truncated": bool(max_duration)
                })
            finally:
                if tmp_path and tmp_path.exists():
                    try:
                        tmp_path.unlink()
                    except Exception:
                        pass

        except Exception as e:
            logger.exception("/audio/play_url error")
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
