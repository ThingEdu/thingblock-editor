// "Âm nhạc" examples: well-known children's tunes played on the ThingBot buzzer with the "play note"
// block. Melodies only (no lyrics); every tune here is traditional or long out of copyright:
//   Happy Birthday (melody of "Good Morning to All", Mildred & Patty Hill, 1893),
//   Twinkle Twinkle Little Star (French folk tune "Ah! vous dirai-je, maman", 1761),
//   Jingle Bells (James Lord Pierpont, 1857), Ode to Joy (Beethoven, Symphony No. 9, 1824),
//   Baby Shark (traditional campfire song — the melody only, not any recorded arrangement),
//   Kìa con bướm vàng (Vietnamese children's lyrics on the traditional French tune "Frère Jacques").
import { init, note, playNote, rest, tempo, whenBegin, whenLoop } from './dsl.mjs'

const MUSIC = 'Âm nhạc'

/**
 * A tune written as text: `G4:0.75` is note G, octave 4, for 0.75 beats (the beats default to 1);
 * `R:2` rests for 2 beats; `|` separates the phrases, each of which starts with a comment.
 * @param {string[]} labels - one comment per phrase.
 * @param {string} tune - the notes.
 * @returns {object[]} play-note and rest blocks.
 */
const melody = (labels, tune) => {
  const phrases = tune.split('|').map((p) => p.trim().split(/\s+/))
  if (phrases.length !== labels.length) throw new Error(`${labels.length} labels for ${phrases.length} phrases`)
  return phrases.flatMap((tokens, i) =>
    tokens.map((token, j) => {
      const [pitch, beats = '1'] = token.split(':')
      const block =
        pitch === 'R' ? rest(Number(beats)) : playNote(pitch.slice(0, -1), Number(pitch.slice(-1)), Number(beats))
      return j === 0 ? note(labels[i], block) : block
    }),
  )
}

const song = ({ id, title, level = 1, bpm, origin, description, labels, tune }) => ({
  id: `am-nhac-${id}`,
  title,
  group: MUSIC,
  level,
  source: origin,
  hardware: ['Còi có sẵn trên mạch'],
  description,
  note:
    `Âm nhạc · ${title}\n` +
    `Nhiệm vụ: làm đồ chơi biết hát, như thiệp sinh nhật có nhạc. Còi nhỏ trên mạch ThingBot chơi bài "${title}".\n` +
    'Não ra lệnh, mạch công suất cấp điện cho còi.\n' +
    'Mỗi khối «chơi nốt» là một nốt nhạc: tên nốt (C là Đô, D là Rê, E là Mi, F là Fa, G là Son, A là La, B là Si), ' +
    'quãng (số càng lớn nốt càng cao) và độ dài tính bằng phách.\n' +
    'Phách là một tiếng đếm đều, như "một, hai, một, hai". ' +
    `Nhịp ${bpm} BPM là ${bpm} phách mỗi phút, nên mỗi phách dài ${(60 / bpm).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} giây.\n` +
    'Thử: đổi nhịp, đổi nốt, hoặc thêm câu nhạc của riêng em.',
  variables: [],
  stacks: [
    whenBegin(init(), note(`Nhịp ${bpm} BPM: ${bpm} phách mỗi phút. Số càng lớn, nhạc càng nhanh.`, tempo(bpm))),
    whenLoop(...melody(labels, tune), note('Nghỉ 2 phách rồi chơi lại từ đầu.', rest(2))),
  ],
})

export const MUSIC_LESSONS = [
  song({
    id: 'kia-con-buom-vang',
    title: 'Kìa con bướm vàng',
    bpm: 120,
    origin: 'Giai điệu dân gian Pháp "Frère Jacques"',
    description: 'Bài hát thiếu nhi quen thuộc ở lớp mẫu giáo: mỗi câu nhạc lặp lại hai lần, rất dễ nhớ.',
    labels: [
      'Kìa con bướm vàng (2 lần)',
      'Xòe đôi cánh (2 lần)',
      'Tung cánh bay lên trời (2 lần)',
      'Em ngồi xem (2 lần)',
    ],
    tune:
      'C4 D4 E4 C4 C4 D4 E4 C4 | E4 F4 G4:2 E4 F4 G4:2 | ' +
      'G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4 C4 G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4 C4 | C4 G3 C4:2 C4 G3 C4:2',
  }),
  song({
    id: 'twinkle',
    title: 'Ngôi sao lấp lánh (Twinkle Twinkle Little Star)',
    bpm: 110,
    origin: 'Giai điệu dân gian Pháp "Ah! vous dirai-je, maman"',
    description: 'Bài hát ru quen thuộc; giai điệu đi lên rồi đi xuống từng bậc, hợp để học tên các nốt Đô Rê Mi.',
    labels: ['Câu 1', 'Câu 2', 'Câu 3', 'Câu 4', 'Câu 5', 'Câu 6'],
    tune:
      'C4 C4 G4 G4 A4 A4 G4:2 | F4 F4 E4 E4 D4 D4 C4:2 | G4 G4 F4 F4 E4 E4 D4:2 | ' +
      'G4 G4 F4 F4 E4 E4 D4:2 | C4 C4 G4 G4 A4 A4 G4:2 | F4 F4 E4 E4 D4 D4 C4:2',
  }),
  song({
    id: 'happy-birthday',
    title: 'Chúc mừng sinh nhật (Happy Birthday)',
    bpm: 120,
    origin: 'Giai điệu "Good Morning to All" (Mildred và Patty Hill, 1893)',
    description: 'Nhạc cho buổi tiệc sinh nhật; có nốt ngắn 0,25 phách và nốt dài 2 phách.',
    labels: ['Câu 1', 'Câu 2', 'Câu 3 (lên cao)', 'Câu 4'],
    tune:
      'G4:0.75 G4:0.25 A4 G4 C5 B4:2 | G4:0.75 G4:0.25 A4 G4 D5 C5:2 | ' +
      'G4:0.75 G4:0.25 G5 E5 C5 B4 A4:2 | F5:0.75 F5:0.25 E5 C5 D5 C5:2',
  }),
  song({
    id: 'baby-shark',
    title: 'Cá mập con (Baby Shark)',
    bpm: 115,
    origin: 'Bài hát truyền thống (giai điệu dân gian, không phải bản thu âm nào)',
    description: 'Bài hát vui nhộn cho cả lớp vận động; một câu nhạc lặp ba lần rồi kết, nhiều nốt Son đi liền nhau.',
    labels: ['Lần 1', 'Lần 2', 'Lần 3', 'Kết'],
    tune:
      'D4 E4 G4:0.5 G4:0.5 G4:0.5 G4:0.25 G4:0.5 G4:0.25 G4:0.5 | ' +
      'D4 E4 G4:0.5 G4:0.5 G4:0.5 G4:0.25 G4:0.5 G4:0.25 G4:0.5 | ' +
      'D4 E4 G4:0.5 G4:0.5 G4:0.5 G4:0.25 G4:0.5 G4:0.25 G4:0.5 | D4 E4 F#4:2',
  }),
  song({
    id: 'jingle-bells',
    title: 'Tiếng chuông ngân (Jingle Bells)',
    level: 2,
    bpm: 140,
    origin: 'James Lord Pierpont, 1857',
    description:
      'Nhạc Giáng sinh quen thuộc; có nốt dài 1,5 phách (nốt chấm dôi) và nốt ngắn 0,5 phách (nốt móc đơn).',
    labels: ['Jingle bells (1)', 'Jingle all the way', 'Câu tiếp', 'Jingle bells (2)', 'Câu kết'],
    tune:
      'E4 E4 E4:2 E4 E4 E4:2 | E4 G4 C4:1.5 D4:0.5 E4:4 | F4 F4 F4:1.5 F4:0.5 F4 E4 E4 E4:0.5 E4:0.5 | ' +
      'E4 D4 D4 E4 D4:2 G4:2 | F4 F4 F4 F4 F4 E4 E4 E4:0.5 E4:0.5 G4 G4 F4 D4 C4:4',
  }),
  song({
    id: 'ode-to-joy',
    title: 'Khúc hoan ca (Ode to Joy)',
    level: 2,
    bpm: 120,
    origin: 'Ludwig van Beethoven, Giao hưởng số 9 (1824)',
    description:
      'Bản nhạc nổi tiếng của Beethoven; giai điệu đi từng bậc liền nhau, hai câu giống nhau, chỉ khác nốt kết.',
    labels: ['Câu 1', 'Câu 2 (kết trên Re)', 'Câu 3', 'Câu 4 (kết trên Do)'],
    tune:
      'E4 E4 F4 G4 G4 F4 E4 D4 | C4 C4 D4 E4 E4:1.5 D4:0.5 D4:2 | ' +
      'E4 E4 F4 G4 G4 F4 E4 D4 | C4 C4 D4 E4 D4:1.5 C4:0.5 C4:2',
  }),
]
