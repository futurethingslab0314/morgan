#!/usr/bin/env bash
# 安裝開機自動啟動：TTS(5005) + 旋鈕/按鈕(5001)
# 用法（在樹莓派上）：
#   cd ~/morgan
#   git pull origin NewBOBO
#   bash raspberrypi-dsi/install_boot_services.sh
set -euo pipefail

USER_NAME="${SUDO_USER:-$USER}"
if [[ "$USER_NAME" == "root" ]]; then
  echo "請用一般使用者執行（或 sudo -u morgan bash ...），不要直接用 root 當服務使用者。"
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DSI_DIR="$REPO_ROOT/raspberrypi-dsi"
VENV_PY="$REPO_ROOT/venv/bin/python3"
LOG_DIR="$REPO_ROOT/logs"

echo "==> 使用者: $USER_NAME"
echo "==> 專案:   $REPO_ROOT"

if [[ ! -x "$VENV_PY" ]]; then
  echo "找不到 $VENV_PY"
  echo "若 venv 路徑不同，請先建立或修改 service template。"
  exit 1
fi

mkdir -p "$LOG_DIR"

# 背景音樂檔中有 MPEG-4 容器但沿用 .mp3 副檔名；pygame Sound 無法直接解碼，
# web_tts_server 會透過 ffmpeg 轉成 WAV 後再播放。
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "⚠️  找不到 ffmpeg，飛機餐／甦醒背景音樂將無法播放。"
  echo "   請先執行：sudo apt update && sudo apt install -y ffmpeg"
fi

# 確保相依套件在 venv 內（systemd 用 venv，系統 Python 有 RPi.GPIO 也不會被用到）
"$VENV_PY" -m pip install -q flask flask-cors openai pygame RPi.GPIO 2>/dev/null || \
  "$VENV_PY" -m pip install -q flask flask-cors openai pygame RPi.GPIO --break-system-packages || true

if ! "$VENV_PY" -c "import RPi.GPIO" 2>/dev/null; then
  echo "⚠️  venv 仍無法 import RPi.GPIO。若是 Pi 5 請改裝 lgpio/gpiozero；先嘗試："
  echo "   $VENV_PY -m pip install RPi.GPIO"
fi

# 產生實例化的 unit（把 %i 換成使用者名稱路徑）
# 使用 systemd 的 user instance 模板寫法較複雜；這裡直接寫死路徑較穩
write_unit() {
  local name="$1"
  local port="$2"
  local script="$3"
  local unit_path="/etc/systemd/system/${name}.service"

  sudo tee "$unit_path" >/dev/null <<EOF
[Unit]
Description=WakeUpMap ${name} (port ${port})
After=network-online.target sound.target
Wants=network-online.target

[Service]
Type=simple
User=${USER_NAME}
Group=${USER_NAME}
WorkingDirectory=${DSI_DIR}
EnvironmentFile=-${REPO_ROOT}/.env
Environment=PATH=${REPO_ROOT}/venv/bin:/usr/local/bin:/usr/bin:/bin
Environment=XDG_RUNTIME_DIR=/run/user/$(id -u "${USER_NAME}")
Environment=PULSE_RUNTIME_PATH=/run/user/$(id -u "${USER_NAME}")/pulse
ExecStartPre=/bin/mkdir -p ${LOG_DIR}
ExecStart=${VENV_PY} ${DSI_DIR}/${script}
Restart=always
RestartSec=5
StandardOutput=append:${LOG_DIR}/${name}.log
StandardError=append:${LOG_DIR}/${name}-error.log

[Install]
WantedBy=multi-user.target
EOF
  echo "✅ 已寫入 $unit_path"
}

write_unit "wakeupmap-tts" "5005" "web_tts_server.py --host 0.0.0.0 --port 5005"
write_unit "wakeupmap-knob" "5001" "knob_api_server.py"

sudo systemctl daemon-reload
sudo systemctl enable wakeupmap-tts.service wakeupmap-knob.service
sudo systemctl restart wakeupmap-tts.service wakeupmap-knob.service

sleep 1
echo ""
echo "==> 服務狀態"
systemctl --no-pager --full status wakeupmap-tts.service | sed -n '1,12p' || true
systemctl --no-pager --full status wakeupmap-knob.service | sed -n '1,12p' || true

echo ""
echo "==> 健康檢查"
curl -sS "http://127.0.0.1:5005/health" || echo "TTS health 失敗"
echo
curl -sS -o /dev/null -w "knob HTTP %{http_code}\n" "http://127.0.0.1:5001/api/button/state?gpio=4" || echo "knob 失敗"

echo ""
echo "完成。重開機後應自動啟動 5005(TTS/喇叭) 與 5001(旋鈕/按鈕)。"
echo "若 TTS 無聲，檢查：${LOG_DIR}/wakeupmap-tts-error.log 與 .env 的 OPENAI_API_KEY"
