# Mô hình Camera AI

Các tệp `.task` ở đây không được commit (xem `.gitignore`); tải bằng `scripts/fetch-ai-models.sh`.
Runtime WASM của MediaPipe được webpack chép từ `node_modules/@mediapipe/tasks-vision/wasm` sang `static/mediapipe/wasm`.

## Nguồn

| Tệp | Nguồn | Giấy phép | Chủ sở hữu | SHA-256 |
|---|---|---|---|---|
| `gesture_recognizer.task` (8,4 MB) | https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task (MediaPipe Solutions; model card: https://ai.google.dev/edge/mediapipe/solutions/vision/gesture_recognizer) | Apache-2.0 | Google LLC | `97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482` |
| `@mediapipe/tasks-vision` 0.10.21 | https://github.com/google-ai-edge/mediapipe | Apache-2.0 | Google LLC | theo `package-lock.json` |
