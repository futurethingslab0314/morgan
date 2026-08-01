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
import threading
import time
from flask import Flask, request, jsonify, make_response
try:
    from flask_cors import CORS
    CORS_AVAILABLE = True
except Exception:
    CORS_AVAILABLE = False
from pathlib import Path

from audio_manager import get_audio_manager


class BackgroundAudioController:
    """以獨立 pygame Channel 控制可立即回應、可調音量的背景音樂。"""

    CANCELLED = "cancelled"

    def __init__(
        self,
        mixer,
        channel_index=1,
        timer_factory=threading.Timer,
        thread_factory=threading.Thread,
        sleep=time.sleep,
    ):
        self._mixer = mixer
        self._channel_index = channel_index
        self._timer_factory = timer_factory
        self._thread_factory = thread_factory
        self._sleep = sleep
        self._lock = threading.RLock()
        self._channel = None
        self._sound = None
        self._stop_timer = None
        self._generation = 0
        self._fade_generation = 0
        self._volume = 1.0
        self._cancelled_through_id = 0
        self._latest_playback_id = 0
        self._current_playback_id = None

    @property
    def is_playing(self):
        with self._lock:
            return self._sound is not None

    @property
    def current_playback_id(self):
        with self._lock:
            return self._current_playback_id

    @property
    def latest_playback_id(self):
        with self._lock:
            return self._latest_playback_id

    @staticmethod
    def _clamp(volume):
        try:
            return max(0.0, min(1.0, float(volume)))
        except (TypeError, ValueError):
            return 1.0

    @staticmethod
    def _coerce_playback_id(value):
        try:
            return max(0, int(value))
        except (TypeError, ValueError):
            return 0

    def _stop_current_locked(self):
        self._fade_generation += 1
        if self._stop_timer is not None:
            self._stop_timer.cancel()
            self._stop_timer = None
        if self._channel is not None and self._sound is not None:
            self._channel.stop()
        self._sound = None
        self._current_playback_id = None

    def _stop_locked(self):
        self._generation += 1
        self._stop_current_locked()

    def stop(self, through_id=None):
        with self._lock:
            threshold = self._coerce_playback_id(through_id)
            if through_id is None:
                threshold = max(
                    self._cancelled_through_id,
                    self._latest_playback_id,
                    self._current_playback_id or 0,
                )
            self._cancelled_through_id = max(self._cancelled_through_id, threshold)

            if self._latest_playback_id <= threshold:
                self._generation += 1

            stopped = False
            if (
                self._current_playback_id is not None
                and self._current_playback_id <= threshold
            ):
                self._stop_current_locked()
                stopped = True

            return {
                "through_id": threshold,
                "stopped": stopped,
                "cancelled": True,
            }

    def reserve(self, playback_id=None):
        """保留最新播放世代，並使所有較舊載入失效。"""
        with self._lock:
            requested_id = self._coerce_playback_id(playback_id)
            if playback_id is None:
                requested_id = max(
                    self._cancelled_through_id,
                    self._latest_playback_id,
                ) + 1
            if (
                requested_id <= self._cancelled_through_id
                or requested_id <= self._latest_playback_id
            ):
                return self.CANCELLED

            self._generation += 1
            self._stop_current_locked()
            self._latest_playback_id = requested_id
            return self._generation

    def play(
        self,
        path,
        volume=1.0,
        max_duration=None,
        generation=None,
        playback_id=None,
    ):
        requested_id = self._coerce_playback_id(playback_id)
        if generation is None:
            token = self.reserve(playback_id=playback_id)
            if token == self.CANCELLED:
                return self.CANCELLED
            if playback_id is None:
                with self._lock:
                    requested_id = self._latest_playback_id
        else:
            token = generation

        with self._lock:
            if (
                token != self._generation
                or requested_id <= self._cancelled_through_id
                or requested_id != self._latest_playback_id
            ):
                return self.CANCELLED
            needs_init = not self._mixer.get_init()

        if needs_init:
            self._mixer.init()

        # Sound 會先把檔案完整載入；回傳後即可安全刪除下載暫存檔。
        sound = self._mixer.Sound(str(path))

        with self._lock:
            if (
                token != self._generation
                or requested_id <= self._cancelled_through_id
                or requested_id != self._latest_playback_id
            ):
                return self.CANCELLED
            self._volume = self._clamp(volume)
            channel = self._mixer.Channel(self._channel_index)
            channel.set_volume(self._volume)
            # channel.play 前仍持有鎖並再次驗證，stop/新播放不可能插隊。
            if (
                token != self._generation
                or requested_id <= self._cancelled_through_id
                or requested_id != self._latest_playback_id
            ):
                return self.CANCELLED
            channel.play(sound)
            self._sound = sound
            self._channel = channel
            self._current_playback_id = requested_id

            try:
                max_seconds = float(max_duration) if max_duration is not None else 0
            except (TypeError, ValueError):
                max_seconds = 0
            if max_seconds > 0:
                def stop_if_current():
                    with self._lock:
                        if token == self._generation:
                            self._stop_locked()

                self._stop_timer = self._timer_factory(max_seconds, stop_if_current)
                self._stop_timer.daemon = True
                self._stop_timer.start()
        return True

    def set_volume(self, volume, fade_ms=0):
        target = self._clamp(volume)
        try:
            duration = max(0.0, float(fade_ms) / 1000.0)
        except (TypeError, ValueError):
            duration = 0

        with self._lock:
            if self._sound is None or self._channel is None:
                self._volume = target
                return target
            self._fade_generation += 1
            fade_generation = self._fade_generation
            start = self._volume
            channel = self._channel

        if duration <= 0:
            with self._lock:
                if fade_generation == self._fade_generation and self._sound is not None:
                    channel.set_volume(target)
                    self._volume = target
                    if target == 0:
                        self._stop_locked()
            return target

        def fade():
            steps = max(1, min(100, int(duration / 0.05)))
            for step in range(1, steps + 1):
                with self._lock:
                    if fade_generation != self._fade_generation or self._sound is None:
                        return
                    current = start + (target - start) * (step / steps)
                    channel.set_volume(current)
                    self._volume = current
                self._sleep(duration / steps)
            if target == 0:
                with self._lock:
                    if fade_generation == self._fade_generation:
                        self._stop_locked()

        worker = self._thread_factory(target=fade, daemon=True)
        worker.start()
        return target


def _cors_headers(resp):
    """無論有無 flask-cors，都補齊瀏覽器從 Vercel 打本機所需的 CORS。"""
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    resp.headers["Access-Control-Max-Age"] = "86400"
    return resp


def create_app(audio_manager=None, background_controller=None, pygame_module=None):
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
    audio = audio_manager or get_audio_manager()
    if pygame_module is None:
        try:
            import pygame as pygame_module
        except Exception:
            pygame_module = None
    background_audio = background_controller
    if background_audio is None and pygame_module is not None:
        background_audio = BackgroundAudioController(pygame_module.mixer)

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

    @app.route("/audio/stop", methods=["POST", "OPTIONS"])
    def audio_stop():
        """立刻停止目前喇叭播放（pygame / 背景音檔）。重整頁面或飛機餐結束時用。"""
        if request.method == "OPTIONS":
            return _cors_headers(make_response("", 204))
        data = request.get_json(force=True, silent=True) or {}
        through_id = data.get("through_id")
        scope = data.get("scope", "all")
        if scope not in ("background", "all"):
            return jsonify({
                "success": False,
                "error": "scope must be 'background' or 'all'",
            }), 400
        errors = {}
        stop_result = {
            "through_id": through_id,
            "stopped": False,
            "cancelled": False,
        }
        try:
            if background_audio is not None:
                stop_result = background_audio.stop(through_id=through_id)
        except Exception as e:
            errors["background"] = str(e)
            logger.exception("/audio/stop background error")
        if scope == "all":
            try:
                if pygame_module is not None and pygame_module.mixer.get_init():
                    pygame_module.mixer.music.stop()
            except Exception as e:
                errors["music"] = str(e)
                logger.exception("/audio/stop mixer.music error")
        if errors:
            return jsonify({
                "success": False,
                "errors": errors,
                "scope": scope,
                **stop_result,
            }), 500
        logger.info("audio/stop OK")
        return jsonify({"success": True, "scope": scope, **stop_result})

    @app.route("/audio/volume", methods=["POST"])
    def audio_volume():
        """只調整背景 Channel，不影響 mixer.music 上的 TTS／一次性音效。"""
        try:
            if background_audio is None:
                return jsonify({"success": False, "error": "background audio unavailable"}), 503
            data = request.get_json(force=True, silent=True) or {}
            applied = background_audio.set_volume(
                data.get("volume", 1.0),
                fade_ms=data.get("fade_ms", 0),
            )
            return jsonify({"success": True, "volume": applied})
        except Exception as e:
            logger.exception("/audio/volume error")
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
            background = data.get("background") is True
            playback_id = data.get("playback_id")

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

            background_generation = None
            if background:
                if background_audio is None:
                    return jsonify({"success": False, "error": "background audio unavailable"}), 503
                # 在任何下載或 Sound 載入前保留世代，讓 stop/較新請求可取消本次。
                background_generation = background_audio.reserve(playback_id=playback_id)
                if background_generation == BackgroundAudioController.CANCELLED:
                    return jsonify({
                        "success": False,
                        "cancelled": True,
                        "playback_id": playback_id,
                    }), 409
                if playback_id is None:
                    playback_id = background_audio.latest_playback_id

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

                if background:
                    played = background_audio.play(
                        play_path,
                        volume=volume,
                        max_duration=max_duration,
                        generation=background_generation,
                        playback_id=playback_id,
                    )
                else:
                    played = _play_with_limit(play_path)
                if played == BackgroundAudioController.CANCELLED:
                    return jsonify({
                        "success": False,
                        "cancelled": True,
                        "playback_id": playback_id,
                    }), 409
                if not played:
                    return jsonify({"success": False, "error": "audio playback failed"}), 500

                return jsonify({
                    "success": True,
                    "volume": volume,
                    "background": background,
                    "playback_id": playback_id,
                    "cancelled": False,
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
