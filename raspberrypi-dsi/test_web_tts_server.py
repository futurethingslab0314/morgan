import io
import sys
import threading
import types
import unittest
from pathlib import Path
from unittest.mock import Mock, patch


sys.path.insert(0, str(Path(__file__).resolve().parent))
try:
    import flask  # noqa: F401
    FLASK_AVAILABLE = True
except ModuleNotFoundError:
    FLASK_AVAILABLE = False
    flask_stub = types.ModuleType("flask")
    flask_stub.Flask = object
    flask_stub.request = object()
    flask_stub.jsonify = lambda *args, **kwargs: None
    flask_stub.make_response = lambda *args, **kwargs: None
    sys.modules["flask"] = flask_stub

audio_manager_stub = types.ModuleType("audio_manager")
audio_manager_stub.get_audio_manager = Mock()
sys.modules["audio_manager"] = audio_manager_stub
import web_tts_server


class FakeTimer:
    def __init__(self, delay, callback):
        self.delay = delay
        self.callback = callback
        self.cancelled = False
        self.started = False

    def start(self):
        self.started = True

    def cancel(self):
        self.cancelled = True


class ImmediateThread:
    def __init__(self, target, daemon=True):
        self.target = target

    def start(self):
        self.target()


class FakeChannel:
    def __init__(self):
        self.play_calls = []
        self.volumes = []
        self.stop_calls = 0

    def play(self, sound):
        self.play_calls.append(sound)

    def set_volume(self, volume):
        self.volumes.append(volume)

    def stop(self):
        self.stop_calls += 1


class FakeMusic:
    def __init__(self):
        self.stop_calls = 0

    def stop(self):
        self.stop_calls += 1


class FakeMixer:
    def __init__(self):
        self.channel = FakeChannel()
        self.music = FakeMusic()
        self.sound_paths = []
        self.initialized = True
        self.init_calls = 0

    def get_init(self):
        return self.initialized

    def init(self):
        self.init_calls += 1
        self.initialized = True

    def Sound(self, path):
        self.sound_paths.append(path)
        return {"path": path}

    def Channel(self, index):
        self.channel_index = index
        return self.channel


class BlockingMixer(FakeMixer):
    def __init__(self):
        super().__init__()
        self.started = {}
        self.release = {}

    def block(self, path):
        self.started[path] = threading.Event()
        self.release[path] = threading.Event()

    def Sound(self, path):
        self.sound_paths.append(path)
        if path in self.started:
            self.started[path].set()
            self.release[path].wait(timeout=2)
        return {"path": path}


class FakeRequest:
    def __init__(self, data):
        self.method = "POST"
        self._data = data

    def get_json(self, **_kwargs):
        return self._data


class FakeResponse:
    def __init__(self, payload, status_code):
        self.payload = payload
        self.status_code = status_code


class FakeClient:
    def __init__(self, app):
        self.app = app

    def post(self, path, json):
        web_tts_server.request = FakeRequest(json)
        result = self.app.routes[path]()
        if isinstance(result, tuple):
            payload, status = result
        else:
            payload, status = result, 200
        return FakeResponse(payload, status)


class FakeFlask:
    def __init__(self, _name):
        self.routes = {}

    def route(self, path, **_kwargs):
        def decorator(function):
            self.routes[path] = function
            return function
        return decorator

    def after_request(self, function):
        return function

    def test_client(self):
        return FakeClient(self)


class BackgroundAudioControllerTests(unittest.TestCase):
    def make_controller(self):
        self.mixer = FakeMixer()
        self.timers = []

        def timer_factory(delay, callback):
            timer = FakeTimer(delay, callback)
            self.timers.append(timer)
            return timer

        return web_tts_server.BackgroundAudioController(
            self.mixer,
            timer_factory=timer_factory,
            thread_factory=ImmediateThread,
            sleep=lambda _seconds: None,
        )

    def test_play_loads_sound_sets_volume_and_returns_without_waiting(self):
        controller = self.make_controller()

        controller.play("/tmp/background.mp3", volume=0.6, max_duration=12)

        self.assertEqual(self.mixer.sound_paths, ["/tmp/background.mp3"])
        self.assertEqual(self.mixer.channel.play_calls, [{"path": "/tmp/background.mp3"}])
        self.assertEqual(self.mixer.channel.volumes[-1], 0.6)
        self.assertTrue(self.timers[0].started)
        self.assertEqual(self.timers[0].delay, 12)

    def test_play_initializes_mixer_when_needed(self):
        controller = self.make_controller()
        self.mixer.initialized = False

        controller.play("/tmp/background.mp3")

        self.assertEqual(self.mixer.init_calls, 1)

    def test_reservations_are_monotonically_increasing(self):
        controller = self.make_controller()

        first = controller.reserve()
        second = controller.reserve()

        self.assertGreater(second, first)

    def test_starting_new_track_stops_previous_and_cancels_timer(self):
        controller = self.make_controller()
        controller.play("/tmp/first.mp3", max_duration=10, playback_id=100)
        first_timer = self.timers[0]

        controller.play("/tmp/second.mp3", playback_id=200)

        self.assertTrue(first_timer.cancelled)
        self.assertEqual(self.mixer.channel.stop_calls, 1)
        self.assertEqual(self.mixer.sound_paths, ["/tmp/first.mp3", "/tmp/second.mp3"])
        self.assertEqual(controller.current_playback_id, 200)

    def test_fade_to_zero_stops_and_clears_background(self):
        controller = self.make_controller()
        controller.play("/tmp/background.mp3", volume=0.8)

        controller.set_volume(0, fade_ms=100)

        self.assertEqual(self.mixer.channel.volumes[-1], 0)
        self.assertEqual(self.mixer.channel.stop_calls, 1)
        self.assertFalse(controller.is_playing)

    def test_volume_is_clamped(self):
        controller = self.make_controller()
        controller.play("/tmp/background.mp3")

        self.assertEqual(controller.set_volume(2), 1)
        self.assertEqual(controller.set_volume(-1), 0)

    def test_volume_fade_does_not_cancel_max_duration_stop(self):
        controller = self.make_controller()
        controller.play("/tmp/background.mp3", max_duration=10)
        stop_timer = self.timers[0]

        controller.set_volume(0.5, fade_ms=100)
        stop_timer.callback()

        self.assertFalse(controller.is_playing)
        self.assertEqual(self.mixer.channel.stop_calls, 1)

    def test_stop_while_sound_load_is_blocked_cancels_stale_play(self):
        mixer = BlockingMixer()
        mixer.block("/tmp/blocked.mp3")
        controller = web_tts_server.BackgroundAudioController(mixer)
        result = {}

        worker = threading.Thread(
            target=lambda: result.setdefault("value", controller.play("/tmp/blocked.mp3"))
        )
        worker.start()
        self.assertTrue(mixer.started["/tmp/blocked.mp3"].wait(timeout=1))

        controller.stop()
        mixer.release["/tmp/blocked.mp3"].set()
        worker.join(timeout=1)

        self.assertEqual(result["value"], web_tts_server.BackgroundAudioController.CANCELLED)
        self.assertEqual(mixer.channel.play_calls, [])

    def test_reverse_completion_allows_only_newest_start_to_play(self):
        mixer = BlockingMixer()
        mixer.block("/tmp/first.mp3")
        controller = web_tts_server.BackgroundAudioController(mixer)
        results = {}

        first = threading.Thread(
            target=lambda: results.setdefault(
                "first",
                controller.play("/tmp/first.mp3", playback_id=100),
            )
        )
        first.start()
        self.assertTrue(mixer.started["/tmp/first.mp3"].wait(timeout=1))

        second = threading.Thread(
            target=lambda: results.setdefault(
                "second",
                controller.play("/tmp/second.mp3", playback_id=200),
            )
        )
        second.start()
        second.join(timeout=1)
        mixer.release["/tmp/first.mp3"].set()
        first.join(timeout=1)

        self.assertEqual(results["first"], web_tts_server.BackgroundAudioController.CANCELLED)
        self.assertTrue(results["second"])
        self.assertEqual(mixer.channel.play_calls, [{"path": "/tmp/second.mp3"}])

    def test_stop_through_rejects_late_old_play_but_allows_newer_id(self):
        controller = self.make_controller()
        reservation = controller.reserve(playback_id=100)

        stop_result = controller.stop(through_id=100)
        stale = controller.play(
            "/tmp/stale.mp3",
            generation=reservation,
            playback_id=100,
        )
        newer = controller.play("/tmp/newer.mp3", playback_id=101)

        self.assertTrue(stop_result["cancelled"])
        self.assertEqual(stale, web_tts_server.BackgroundAudioController.CANCELLED)
        self.assertTrue(newer)
        self.assertEqual(self.mixer.channel.play_calls, [{"path": "/tmp/newer.mp3"}])

    def test_delayed_old_stop_does_not_stop_newer_playback(self):
        controller = self.make_controller()
        controller.play("/tmp/old.mp3", playback_id=100)
        controller.play("/tmp/new.mp3", playback_id=200)
        stops_after_replacement = self.mixer.channel.stop_calls

        result = controller.stop(through_id=100)

        self.assertFalse(result["stopped"])
        self.assertEqual(self.mixer.channel.stop_calls, stops_after_replacement)
        self.assertEqual(controller.current_playback_id, 200)


class WebTtsServerAudioRouteTests(unittest.TestCase):
    def setUp(self):
        if not FLASK_AVAILABLE:
            original_flask = web_tts_server.Flask
            original_jsonify = web_tts_server.jsonify
            web_tts_server.Flask = FakeFlask
            web_tts_server.jsonify = lambda payload=None, **kwargs: payload or kwargs
            self.addCleanup(setattr, web_tts_server, "Flask", original_flask)
            self.addCleanup(setattr, web_tts_server, "jsonify", original_jsonify)
        self.audio = Mock()
        self.background = Mock()
        self.background.reserve.return_value = 42
        self.background.stop.return_value = {
            "through_id": 100,
            "stopped": True,
            "cancelled": True,
        }
        self.pygame = Mock()
        self.pygame.mixer.get_init.return_value = True
        self.app = web_tts_server.create_app(
            audio_manager=self.audio,
            background_controller=self.background,
            pygame_module=self.pygame,
        )
        self.client = self.app.test_client()

    def test_background_play_url_honors_volume_and_duration(self):
        response_context = Mock()
        response_context.__enter__ = Mock(return_value=io.BytesIO(b"audio"))
        response_context.__exit__ = Mock(return_value=False)

        with patch("urllib.request.urlopen", return_value=response_context):
            response = self.client.post("/audio/play_url", json={
                "url": "https://example.com/wakeup.mp3",
                "background": True,
                "playback_id": 100,
                "volume": 0.4,
                "max_duration": 9,
            })

        self.assertEqual(response.status_code, 200)
        play_path = self.background.play.call_args.args[0]
        self.background.reserve.assert_called_once_with(playback_id=100)
        self.background.play.assert_called_once_with(
            play_path,
            volume=0.4,
            max_duration=9,
            generation=42,
            playback_id=100,
        )
        self.assertEqual(response.payload["playback_id"], 100)
        self.assertFalse(response.payload["cancelled"])
        self.assertFalse(Path(play_path).exists())
        self.audio.play_audio_file_direct.assert_not_called()

    def test_audio_volume_controls_only_background_channel(self):
        self.background.set_volume.return_value = 0.25

        response = self.client.post("/audio/volume", json={"volume": 0.25, "fade_ms": 500})

        self.assertEqual(response.status_code, 200)
        self.background.set_volume.assert_called_once_with(0.25, fade_ms=500)
        self.audio.play_audio_file_direct.assert_not_called()

    def test_audio_stop_defaults_to_all_for_backward_compatibility(self):
        response = self.client.post("/audio/stop", json={"through_id": 100})

        self.assertEqual(response.status_code, 200)
        self.background.stop.assert_called_once_with(through_id=100)
        self.pygame.mixer.music.stop.assert_called_once_with()
        self.assertEqual(response.payload["scope"], "all")

    def test_audio_stop_background_scope_never_stops_mixer_music(self):
        response = self.client.post("/audio/stop", json={
            "through_id": 100,
            "scope": "background",
        })

        self.assertEqual(response.status_code, 200)
        self.background.stop.assert_called_once_with(through_id=100)
        self.pygame.mixer.music.stop.assert_not_called()
        self.assertEqual(response.payload["scope"], "background")

    def test_audio_stop_all_scope_stops_background_and_mixer_music(self):
        response = self.client.post("/audio/stop", json={
            "through_id": 100,
            "scope": "all",
        })

        self.assertEqual(response.status_code, 200)
        self.background.stop.assert_called_once_with(through_id=100)
        self.pygame.mixer.music.stop.assert_called_once_with()
        self.assertEqual(response.payload["scope"], "all")

    def test_audio_stop_reports_partial_failure_and_still_stops_music(self):
        self.background.stop.side_effect = RuntimeError("background failed")

        with self.assertLogs("pi-tts-server", level="ERROR"):
            response = self.client.post("/audio/stop", json={
                "through_id": 100,
                "scope": "all",
            })

        self.assertEqual(response.status_code, 500) 
        self.pygame.mixer.music.stop.assert_called_once_with()
        self.assertFalse(response.payload["success"])
        self.assertIn("background", response.payload["errors"])

    def test_stop_during_blocked_download_cancels_request_before_play(self):
        mixer = FakeMixer()
        background = web_tts_server.BackgroundAudioController(mixer)
        app = web_tts_server.create_app(
            audio_manager=self.audio,
            background_controller=background,
            pygame_module=self.pygame,
        )
        client = app.test_client()
        download_started = threading.Event()
        release_download = threading.Event()
        response_holder = {}

        class BlockingDownload:
            def __enter__(self):
                download_started.set()
                release_download.wait(timeout=2)
                return io.BytesIO(b"audio")

            def __exit__(self, *_args):
                return False

        with patch("urllib.request.urlopen", return_value=BlockingDownload()):
            worker = threading.Thread(
                target=lambda: response_holder.setdefault(
                    "response",
                    client.post("/audio/play_url", json={
                        "url": "https://example.com/wakeup.mp3",
                        "background": True,
                        "playback_id": 100,
                    }),
                )
            )
            worker.start()
            self.assertTrue(download_started.wait(timeout=1))
            stop_response = client.post("/audio/stop", json={
                "through_id": 100,
                "scope": "background",
            })
            release_download.set()
            worker.join(timeout=1)

        response = response_holder["response"]
        self.assertEqual(stop_response.status_code, 200)
        self.assertEqual(response.status_code, 409)
        self.assertTrue(response.payload["cancelled"])
        self.assertEqual(response.payload["playback_id"], 100)
        self.assertEqual(mixer.channel.play_calls, [])


if __name__ == "__main__":
    unittest.main()
