# Writing lessons

Each lesson is a folder `src/tutorials/<id>/` holding `lesson.<lang>.md` (currently only `lesson.vi.md`) and any
images the lesson uses. `npm run build` compiles the lessons to JSON in `dist/thingblock-resource/tutorials/`.

Everything a developer or author types — front-matter keys and values, markers, rules, file and folder names — is
English. Only the learner-facing text (lesson name, step titles, body, hints) is written in the lesson's language.

## Front matter

```markdown
---
id: light-on-off
name: Bật tắt đèn
group: outputs
order: 1
board: thingbot
duration: 10
---
```

- `id`: identifier, equal to the folder name.
- `name`: the lesson name shown to learners.
- `group`: one of `getting-started`, `outputs`, `motors`, `inputs`.
- `order`: position within the group, a number. Two lessons in the same `group` cannot share an `order`.
- `board`: the lesson's board (for example `thingbot`), or `none` to open the lesson without a board.
- `duration`: estimated minutes, a number.
- `peripherals` (optional): extra devices the lesson needs, comma-separated, named by their folder in
  `src/extensions/peripheral/` (for example `peripherals: oled`). Opening the lesson adds them to the palette, so
  learners don't have to find **Add Peripheral**.
- `image` (optional): a `.png` or `.gif` in the lesson folder, shown on the lesson's card in the library. Without
  one, the card shows a placeholder. Use a 600×372 image, the shape of a Scratch library card.
- `start` (optional): a `.tb` project in the lesson folder the lesson opens with. Without one, the lesson opens a
  blank project on its board.

## Steps

Each `## Step title` line starts a step. The first step is a greeting (not graded) and the last one a wrap-up.
Use `##` only; a `###` heading is an error. A step's content is plain Markdown: paragraphs, lists, bold
(`**bold**` or `__bold__`), italic (`*italic*` or `_italic_`) and images (the image file must be in the lesson
folder).

Lessons name blocks by the labels the palette shows in the lesson's language, in **bold**, for example
**khi Arduino khởi động**.

### Hints

A `> hint: ...` line adds a hint to the step. Consecutive `> hint:` lines are separate hints, revealed one at a
time.

### Point at

A `point at: <anchor>` line highlights part of the editor during the step. Anchors are listed in
`scripts/lessons/tour-markers.mjs`.

### Rules

A `check: ...` line adds a rule the virtual board must satisfy for the step to pass. A step can have several rules
(all must hold). A step without `check:` is not graded. Case does not matter. Known forms:

| Rule                                       | Meaning                                                       |
| ------------------------------------------ | ------------------------------------------------------------- |
| `check: L1 on` / `L2 off`                  | Light L1 or L2 is on / off                                    |
| `check: buzzer on` / `buzzer off`          | The buzzer is sounding / silent                               |
| `check: L1 blinks every 1 s`               | The light blinks with this period, default tolerance 20%      |
| `check: L1 blinks every 0.5 s ± 10%`       | As above with a chosen tolerance; the period is at most 1.5 s |
| `check: M1 forward` / `backward` / `stop`  | Motor M1 (M1 to M4) turns forward / backward / stands still   |
| `check: M1 speed ≥ 50%`                    | The motor reaches at least this speed (percent)               |
| `check: servo S1 at 90 deg ± 5`            | Servo S1 (S1 to S5) is at this angle; default tolerance 5     |
| `check: OLED shows "Xin chào"`             | The OLED contains this text                                   |
| `check: OLED shows exactly "Xin chào"`     | The OLED shows exactly this text on a line, nothing more      |
| `check: OLED shows "ThingBot" at y 16`     | This text is printed starting at line y = 16                  |
| `check: OLED shows "Xin chao" size 12x16`  | This text is printed at size 12x16 (set oled text size block) |
| `check: servo S1 sweeps from 0 to 180 deg` | The servo reached near both angles; default tolerance 5       |
| `check: hold SW` / `release SW`            | The learner holds / has released SW on the virtual board      |
| `check: distance < 20 cm`                  | The distance slider is below 20 cm (`≤ > ≥` also work)        |
| `check: hold PS2 up`                       | The learner holds ▲ on the virtual PS2 gamepad                |

The last three are things the learner does on the virtual board, not things the program does. Pair them with an
output rule in the same step, for example `hold SW` and `L1 on`: the step passes when both hold at the same time.
When grading `solutions/`, the test sets the virtual board for these rules (holds the switch, moves the distance
slider) before grading. PS2 buttons are named (`up`, `down`, `left`, `right`, `triangle`, `circle`, `cross`,
`square`, `L1`, `L2`, `R1`, `R2`, `select`, `start`) or written as the gamepad symbol (`▲ ▼ ◀ ▶ △ ○ ✕ □`).

Decimals may use a point or a comma. A malformed rule stops `npm run build`, which reports `file:line`.

## Solutions

A lesson with `check:` rules needs `.tb` projects in `solutions/` that prove the grading is right. This folder is
not part of the build. `<n>` is the step number in the lesson, counting from 1 and including the greeting.

- `pass.tb`: a solution that must pass **every** graded step.
- `pass-<n>.tb`: a solution for step n only, used instead of `pass.tb` for that step. Use it when two steps
  exclude each other (for example `blink`: a 1 s period and a 0.5 s period cannot both pass, so it has
  `pass-2.tb` and `pass-3.tb` and no `pass.tb`).
- `fail-<n>.tb`: a counterexample that must **fail** step n.

Keep a `*.project.json` with the same name next to each `.tb` so reviewers can read it.

### Making a `.tb`

- Usually: build the program in the editor, choose **Save project**, and copy the file into `solutions/` with
  the right name.
- By hand: write the `*.project.json`, then pack it with the package's tool:

```sh
cd packages/thingblock-resource
node scripts/lessons/make-tb.mjs src/tutorials/light-on-off/solutions/pass-2.project.json \
  src/tutorials/light-on-off/solutions/pass-2.tb
```

## Build and check

```sh
cd packages/thingblock-resource
node scripts/build-lessons.mjs
```

A successful build prints `Built N lesson(s)` and writes `dist/thingblock-resource/tutorials/index.json`. On an
error it exits with code 1 and prints each problem as `file:line: message`.
