// Downloads the Camera AI models into static/ai-models (they are not committed: see the README there).
// Plain Node so it runs the same on Windows, macOS and Linux; a file that already matches its SHA-256 is kept.
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'static', 'ai-models');

const MODELS = [
    {
        file: 'gesture_recognizer.task',
        url: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
        sha: '97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482'
    },
    {
        file: 'pose_landmarker_lite.task',
        url: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        sha: '59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a'
    }
];

const sha256 = data => createHash('sha256').update(data)
    .digest('hex');

for (const {file, url, sha} of MODELS) {
    const path = join(dir, file);
    if (existsSync(path) && sha256(readFileSync(path)) === sha) {
        console.log(`${file}: ok`);
        continue;
    }
    console.log(`${file}: downloading`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${file}: HTTP ${res.status} from ${url}`);
    const data = Buffer.from(await res.arrayBuffer());
    const got = sha256(data);
    if (got !== sha) throw new Error(`${file}: SHA-256 ${got} does not match ${sha}`);
    writeFileSync(path, data);
    console.log(`${file}: OK`);
}
