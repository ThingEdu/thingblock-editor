// The Camera AI examples: games played with a hand in front of the webcam, or with the mouse on a computer
// without one. They need no board, so build-examples.mjs writes them without `board` into their own folder.
// Each entry is an index.json record plus the program, in the scratch-blocks serialization tb-builder reads.

const N = (n) => ({ shadow: { type: 'math_number', fields: { NUM: String(n) } } })
const T = (s) => ({ shadow: { type: 'text', fields: { TEXT: s } } })
// A reporter dropped into a number or text input keeps the input's shadow underneath, as the editor saves it.
const num = (block) => ({ block, shadow: N(0).shadow })
const str = (block) => ({ block, shadow: T('').shadow })
const bool = (block) => ({ block })

const cam = (op, fields = {}, inputs = {}) => ({ type: `cameraAi_${op}`, fields, inputs })
const player = (p) => ({ shadow: { type: 'cameraAi_menu_PLAYER', fields: { PLAYER: String(p) } } })

/**
 * Chain blocks into a stack: each one's `next` is the one after it.
 * @param {...object} blocks The blocks, top first.
 * @returns {object} The top block.
 */
const stack = (...blocks) => {
  for (let i = 0; i < blocks.length - 1; i++) blocks[i].next = { block: blocks[i + 1] }
  return blocks[0]
}
const body = (...blocks) => ({ block: stack(...blocks) })

// Events and control.
const whenFlag = (...then) => stack({ type: 'event_whenflagclicked' }, ...then)
const forever = (...then) => ({ type: 'control_forever', inputs: { SUBSTACK: body(...then) } })
const wait = (s) => ({
  type: 'control_wait',
  inputs: { DURATION: { shadow: { type: 'math_positive_number', fields: { NUM: String(s) } } } },
})
const ifThen = (cond, ...then) => ({ type: 'control_if', inputs: { CONDITION: bool(cond), SUBSTACK: body(...then) } })
const ifElse = (cond, then, otherwise) => ({
  type: 'control_if_else',
  inputs: { CONDITION: bool(cond), SUBSTACK: body(...then), SUBSTACK2: body(...otherwise) },
})
const waitUntil = (cond) => ({ type: 'control_wait_until', inputs: { CONDITION: bool(cond) } })
const repeatUntil = (cond, ...then) => ({
  type: 'control_repeat_until',
  inputs: { CONDITION: bool(cond), SUBSTACK: body(...then) },
})

// Operators and data.
const random = (from, to) => ({ type: 'operator_random', inputs: { FROM: N(from), TO: N(to) } })
const textIn = (x) => (typeof x === 'object' ? str(x) : T(String(x)))
const join = (a, b) => ({ type: 'operator_join', inputs: { STRING1: textIn(a), STRING2: textIn(b) } })
const eq = (a, b) => ({ type: 'operator_equals', inputs: { OPERAND1: textIn(a), OPERAND2: textIn(b) } })
const gt = (a, b) => ({ type: 'operator_gt', inputs: { OPERAND1: textIn(a), OPERAND2: textIn(b) } })
const and = (a, b) => ({ type: 'operator_and', inputs: { OPERAND1: bool(a), OPERAND2: bool(b) } })
const or = (a, b) => ({ type: 'operator_or', inputs: { OPERAND1: bool(a), OPERAND2: bool(b) } })
const not = (a) => ({ type: 'operator_not', inputs: { OPERAND: bool(a) } })
const v = (name) => ({ type: 'data_variable', fields: { VARIABLE: { name } } })
const set = (name, value) => ({
  type: 'data_setvariableto',
  fields: { VARIABLE: { name } },
  inputs: { VALUE: textIn(value) },
})
const item = (index, list) => ({
  type: 'data_itemoflist',
  fields: { LIST: { name: list } },
  inputs: { INDEX: typeof index === 'object' ? num(index) : N(index) },
})
const itemNum = (value, list) => ({
  type: 'data_itemnumoflist',
  fields: { LIST: { name: list } },
  inputs: { ITEM: textIn(value) },
})

// Camera AI.
const cameraOn = () => cam('cameraOn', { MIRROR: 'mirror' })
const numIn = (x) => (typeof x === 'object' ? num(x) : N(x))
const spawn = (kind, name, x, y, size) =>
  cam('spawn', { KIND: kind }, { NAME: T(name), X: numIn(x), Y: numIn(y), SIZE: N(size) })
const handX = (part) => cam('handX', { PART: part, HAND: 'ANY' })
const handY = (part) => cam('handY', { PART: part, HAND: 'ANY' })
const moveTo = (name, x, y) =>
  cam(
    'moveTo',
    {},
    { NAME: T(name), X: typeof x === 'object' ? num(x) : N(x), Y: typeof y === 'object' ? num(y) : N(y) },
  )
const moveToHand = (name, part) => moveTo(name, handX(part), handY(part))
const moveRandom = (name) => moveTo(name, random(-200, 200), random(-140, 140))
const remove = (name) => cam('remove', {}, { NAME: T(name) })
const say = (text) => cam('say', {}, { TEXT: textIn(text) })
const setScore = (p, n) => cam('setScore', {}, { PLAYER: player(p), N: N(n) })
const addScore = (n, p = 1) => cam('addScore', {}, { N: N(n), PLAYER: player(p) })
const score = (p = 1) => cam('score', {}, { PLAYER: player(p) })
const startTimer = (s) => cam('startTimer', {}, { SECONDS: N(s) })
const timeLeft = () => cam('timeLeft')
const setVelocity = (name, vx, vy) =>
  cam('setVelocity', {}, { NAME: T(name), VX: typeof vx === 'object' ? num(vx) : N(vx), VY: N(vy) })
const setGravity = (g) => cam('setGravity', {}, { G: N(g) })
const gesture = () => cam('handGesture', { HAND: 'ANY' })
const touching = (name, part) => cam('touching', { PART: part, HAND: 'ANY' }, { NAME: T(name) })
const whenTimeUp = (...then) => stack(cam('whenTimeUp'), ...then)
const whenGesture = (g, ...then) => stack(cam('whenGesture', { HAND: 'ANY', GESTURE: g }), ...then)
const whenTouching = (name, target, ...then) =>
  stack(
    cam(
      'whenTouching',
      {},
      { NAME: T(name), TARGET: { shadow: { type: 'cameraAi_menu_TARGET', fields: { TARGET: target } } } },
    ),
    ...then,
  )
const timeUpScore = () => say(join('Hết giờ! Điểm: ', score()))
const add = (a, b) => ({ type: 'operator_add', inputs: { NUM1: numIn(a), NUM2: numIn(b) } })
const mul = (a, b) => ({ type: 'operator_multiply', inputs: { NUM1: numIn(a), NUM2: numIn(b) } })
const atEdge = (name, edge) => cam('atEdge', { EDGE: edge }, { NAME: T(name) })
const objectTouching = (name, other) => cam('objectTouching', {}, { NAME: T(name), OTHER: T(other) })
const headX = () => cam('headX')
const headY = () => cam('headY')
const headTilt = () => cam('headTilt')
const whenNod = (...then) => stack(cam('whenNod'), ...then)
const whenHeadTilt = (dir, ...then) => stack(cam('whenHeadTilt', { DIR: dir }), ...then)
const whenFlap = (...then) => stack(cam('whenFlap'), ...then)
// Attach a Vietnamese note to a block (shown beside it in the editor).
const comment = (text, block) => ({ ...block, comment: text })

const GROUP = 'Camera AI'
const HARDWARE = ['Webcam, hoặc chuột nếu máy không có webcam']
/** The last lines of every note: how to play without a webcam. */
const MOUSE_TIP =
  'Máy không có webcam? Ở khung Sân chơi, chọn "Chuột (không cần webcam)". ' +
  'Ngón trỏ đi theo con chuột. Giữ chuột trái là nắm tay. Bấm chuột phải hoặc phím 1–7 để đổi cử chỉ.'
const note = (title, ...lines) => [`${title} · Camera AI`, ...lines, MOUSE_TIP].join('\n')
/** How to play the head games without a webcam. */
const HEAD_MOUSE_TIP =
  'Máy không có webcam? Ở khung Sân chơi, chọn "Chuột (không cần webcam)". Đầu đi theo con chuột. ' +
  'Giữ phím ← hoặc → để nghiêng đầu dần, phím ↑ để đầu thẳng lại, phím ↓ để gật đầu (con trỏ nằm trên sân chơi).'
const headNote = (title, ...lines) => [`${title} · Camera AI · Bài tập thể dục`, ...lines, HEAD_MOUSE_TIP].join('\n')
/** A short safety line every exercise game repeats. */
const SAFE =
  'An toàn: làm chậm thôi. Thấy chóng mặt, mỏi hay đau thì dừng lại, ngồi nghỉ. Dọn chỗ trống quanh em trước khi tập.'
/** What the AI does, said once in each hand game. */
const AI_HAND =
  'AI là chương trình máy tính học cách nhìn. Ở đây AI nhìn ảnh webcam, tìm bàn tay em và đánh dấu 21 điểm mốc trên đó.'

export const CAMERA_AI_EXAMPLES = [
  {
    id: 'cam-01-tay-em-tren-san-choi',
    title: 'Tay em trên sân chơi',
    level: 1,
    description: 'Ngôi sao đi theo ngón trỏ; sân chơi gọi tên cử chỉ em làm.',
    note: note(
      'Tay em trên sân chơi',
      'Nhiệm vụ: làm cây đũa thần. Ngôi sao bay theo đầu ngón trỏ của em.',
      AI_HAND,
      'Điểm mốc là các điểm AI đánh dấu trên bàn tay: cổ tay, các khớp, các đầu ngón.',
      'Khối «x của ngón trỏ» và «y của ngón trỏ» cho biết đầu ngón trỏ đang ở đâu trên sân chơi. Ngôi sao đi tới đó, mãi.',
      'Cử chỉ là dáng bàn tay: nắm tay, xoè tay, chữ V. Mỗi lần em đổi cử chỉ, sân chơi nói tên nó.',
      'Thử: đổi "ngón trỏ" thành "ngón cái" trong hai khối x, y.',
    ),
    stacks: [
      whenFlag(
        comment('Bật webcam. "Soi gương" lật ảnh như gương, để tay phải của em ở bên phải.', cameraOn()),
        comment('Tạo một ngôi sao tên "sao" ở giữa sân chơi (x: 0, y: 0), cỡ 50.', spawn('star', 'sao', 0, 0, 50)),
        say('Giơ tay lên nào!'),
        comment('Mỗi khung hình, đưa sao tới chỗ đầu ngón trỏ.', forever(moveToHand('sao', 'indexTip'))),
      ),
      comment('Khối mũ: chạy mỗi khi AI thấy cử chỉ này.', whenGesture('FIST', say('Nắm tay ✊'))),
      whenGesture('OPEN', say('Xòe tay ✋')),
      whenGesture('VICTORY', say('Chữ V ✌️')),
    ],
  },
  {
    id: 'cam-02-bat-de',
    source: 'Ý tưởng trò Bắt Dế của NeoAiSport (ThingEdu)',
    title: 'Bắt Dế',
    level: 1,
    description: 'Quả bóng theo ngón trỏ; chạm con dế để ghi điểm trong 30 giây.',
    note: note(
      'Bắt Dế',
      'Nhiệm vụ: con dế nhảy khắp sân. Em đưa ngón trỏ chạm dế để bắt. Bắt được càng nhiều càng giỏi, trong 30 giây.',
      AI_HAND,
      'Quả bóng đi theo đầu ngón trỏ của em, mỗi khung hình một lần.',
      'Khối «de chạm ngón trỏ?» hỏi: đầu ngón trỏ có nằm trên con dế không? Có thì cộng 1 điểm, dế nhảy chỗ khác.',
      'Ngẫu nhiên là máy tự chọn một số, không ai biết trước. Dế nhảy tới chỗ ngẫu nhiên.',
      'Nắm tay lại: dế giật mình, nhảy đi ngay.',
    ),
    stacks: [
      whenFlag(
        cameraOn(),
        spawn('ball', 'bong', 0, 0, 44),
        spawn('cricket', 'de', 120, 60, 70),
        setScore(1, 0),
        comment('Đồng hồ đếm ngược 30 giây. Hết giờ thì khối «khi hết giờ» chạy.', startTimer(30)),
        say('Chạm ngón trỏ vào con dế!'),
        forever(
          moveToHand('bong', 'indexTip'),
          comment(
            'Ngón trỏ chạm dế: +1 điểm, dế nhảy tới chỗ ngẫu nhiên. Đợi 0,3 giây để không tính hai lần.',
            ifThen(touching('de', 'indexTip'), addScore(1), moveRandom('de'), wait(0.3)),
          ),
        ),
      ),
      whenTimeUp(timeUpScore(), remove('de')),
      whenGesture('FIST', say('Nắm tay: dế nhảy!'), moveRandom('de')),
    ],
  },
  {
    id: 'cam-03-hung-mua',
    source: 'Ý tưởng trò Hứng Mưa của NeoAiSport (ThingEdu)',
    title: 'Hứng Mưa',
    level: 2,
    description: 'Rổ theo lòng bàn tay; hứng giọt mưa +1, để rơi xuống đáy −1, trong 30 giây.',
    note: note(
      'Hứng Mưa',
      'Nhiệm vụ: trời mưa, em cầm rổ hứng nước cho cây. Hứng được +1, để rơi mất −1, trong 30 giây.',
      AI_HAND,
      'Cái rổ đi theo lòng bàn tay. Lòng bàn tay là điểm giữa năm điểm mốc quanh bàn tay.',
      'Tốc độ là số bước vật đi mỗi giây. Giọt mưa có tốc độ y bằng −150: mỗi giây rơi xuống 150 bước.',
      'Giọt chạm lòng bàn tay: +1, rồi rơi lại từ trên. Giọt chạm mép dưới sân: rơi mất, −1.',
      'Thử: đổi −150 thành −250 cho mưa rơi nhanh hơn.',
    ),
    stacks: [
      whenFlag(
        cameraOn(),
        setScore(1, 0),
        comment('Rổ ở gần đáy sân (y: −120). Giọt mưa ở sát mép trên (y: 170).', spawn('basket', 'ro', 0, -120, 80)),
        spawn('drop', 'giot', 0, 170, 36),
        comment('Tốc độ y −150: mỗi giây giọt rơi xuống 150 bước.', setVelocity('giot', 0, -150)),
        startTimer(30),
        say('Hứng giọt mưa bằng lòng bàn tay!'),
        forever(moveToHand('ro', 'palm')),
      ),
      comment(
        'Giọt chạm lòng bàn tay: +1, rồi đưa giọt lên mép trên ở chỗ ngẫu nhiên và cho rơi lại.',
        whenTouching(
          'giot',
          'PALM',
          addScore(1),
          say('+1'),
          moveTo('giot', random(-200, 200), 170),
          setVelocity('giot', 0, -150),
        ),
      ),
      comment(
        'Giọt chạm mép dưới: rơi mất, −1, rồi cũng rơi lại từ trên.',
        whenTouching(
          'giot',
          'BOTTOM',
          addScore(-1),
          say('Rơi mất!'),
          moveTo('giot', random(-200, 200), 170),
          setVelocity('giot', 0, -150),
        ),
      ),
      whenTimeUp(timeUpScore(), remove('giot')),
    ],
  },
  {
    id: 'cam-04-do-bong',
    source: 'Ý tưởng trò Đỡ Bóng của NeoAiSport (ThingEdu)',
    title: 'Đỡ Bóng',
    level: 2,
    description: 'Bóng rơi theo trọng lực; đưa lòng bàn tay vào bóng để đỡ nó bay lên.',
    note: note(
      'Đỡ Bóng',
      'Nhiệm vụ: tâng bóng như cầu thủ, nhưng bằng lòng bàn tay. Đừng để bóng chạm đất.',
      AI_HAND,
      'Trọng lực kéo mọi vật rơi xuống, như quả táo rơi khỏi cây. Khối «đặt trọng lực 250» bật nó lên; số càng lớn, bóng rơi càng nhanh.',
      'Lòng bàn tay chạm bóng: bóng được cho tốc độ bay lên, lệch sang trái hoặc phải một chút ngẫu nhiên.',
      'Bóng chạm mép dưới là thua. Sân chơi đọc số lần em đỡ được, rồi chơi lại.',
      'Thử: đổi 250 thành 150 cho bóng rơi chậm hơn.',
    ),
    stacks: [
      whenFlag(
        cameraOn(),
        setScore(1, 0),
        spawn('ball', 'bong', 0, 120, 56),
        comment('Trọng lực 250: bóng rơi nhanh dần. Đặt 0 là tắt trọng lực.', setGravity(250)),
        say('Đỡ bóng bằng lòng bàn tay, đừng để rơi!'),
      ),
      comment(
        'Đỡ được: +1, bóng bay lên 330 bước mỗi giây, lệch ngang ngẫu nhiên từ −120 đến 120.',
        whenTouching('bong', 'PALM', addScore(1), setVelocity('bong', random(-120, 120), 330), say('Đỡ!')),
      ),
      comment(
        'Bóng chạm mép dưới: đọc điểm, đợi 2 giây, về 0 điểm và thả bóng lại từ trên.',
        whenTouching(
          'bong',
          'BOTTOM',
          say(join('Rơi rồi! Đỡ được: ', score())),
          wait(2),
          setScore(1, 0),
          moveTo('bong', 0, 120),
          say('Lại nào!'),
        ),
      ),
    ],
  },
  {
    id: 'cam-05-hai-sao-ne-bom',
    source: 'Ý tưởng FingerFoodNinja của Dancing with AI (MIT RAISE)',
    title: 'Hái sao né bom',
    level: 2,
    description: 'Lướt ngón trỏ qua ngôi sao +1, chạm quả bom −3; bom đổi chỗ mỗi 2 giây.',
    note: note(
      'Hái sao né bom',
      'Nhiệm vụ: lướt ngón trỏ hái thật nhiều sao trong 30 giây, nhưng phải tránh quả bom.',
      AI_HAND,
      'Ngẫu nhiên là máy tự chọn một số, không ai biết trước. Sao và bom hiện ở chỗ ngẫu nhiên.',
      'Ngón trỏ chạm sao: +1. Chạm bom: −3. Điểm có thể xuống dưới 0, đó là số âm.',
      'Cứ 2 giây bom lại đổi chỗ. Em phải nhìn kỹ trước khi lướt tay.',
      'Thử: đổi 2 giây thành 1 giây cho bom nhảy nhanh hơn.',
    ),
    stacks: [
      whenFlag(
        cameraOn(),
        setScore(1, 0),
        spawn('star', 'sao', 0, 80, 50),
        spawn('bomb', 'bom', -120, -60, 50),
        startTimer(30),
        say('Lướt ngón trỏ qua ngôi sao, tránh quả bom!'),
        comment('Cứ 2 giây, bom đổi sang chỗ ngẫu nhiên.', forever(wait(2), moveRandom('bom'))),
      ),
      comment('Chạm sao: +1, sao hiện ở chỗ khác.', whenTouching('sao', 'INDEX_TIP', addScore(1), moveRandom('sao'))),
      comment(
        'Chạm bom: −3 (cộng số âm là trừ), bom hiện ở chỗ khác.',
        whenTouching('bom', 'INDEX_TIP', addScore(-3), say('Ối, bom! −3'), moveRandom('bom')),
      ),
      whenTimeUp(timeUpScore(), remove('sao'), remove('bom')),
    ],
  },
  {
    id: 'cam-06-oan-tu-ti',
    source: 'Trò chơi dân gian oẳn tù tì',
    title: 'Oẳn tù tì',
    level: 3,
    description: 'Đếm 3-2-1 rồi ra búa ✊, bao ✋ hoặc kéo ✌️; máy chọn ngẫu nhiên, bảng điểm em và máy.',
    note: note(
      'Oẳn tù tì',
      'Nhiệm vụ: chơi oẳn tù tì với máy tính. Người chơi 1 là em, người chơi 2 là máy.',
      'Máy đếm 3-2-1. Lúc đó em giơ ✊ nắm tay (búa), ✋ xoè tay (bao) hoặc ✌️ chữ V (kéo).',
      AI_HAND,
      'Máy chọn ngẫu nhiên một trong ba. Búa thắng kéo, kéo thắng bao, bao thắng búa. Hai bên giống nhau là hoà.',
      'Danh sách là một dãy ô có tên, mỗi ô một thứ. Danh sách "lựa chọn" giữ tên máy của ba cử chỉ; "ký hiệu" giữ ba hình ✊ ✋ ✌️ cùng thứ tự.',
      'Biến là một cái hộp có tên để não nhớ một thứ. "số máy" là ô máy chọn (1, 2 hay 3); "số em" là ô của cử chỉ em làm, bằng 0 khi không thấy tay.',
      'Chơi bằng chuột: giữ chuột trái là búa, phím 1 là bao, phím 2 là kéo.',
    ),
    variables: [{ name: 'số máy' }, { name: 'máy' }, { name: 'cử chỉ em' }, { name: 'số em' }, { name: 'kết quả' }],
    lists: [
      { name: 'lựa chọn', items: ['fist', 'open', 'victory'] },
      { name: 'ký hiệu', items: ['✊', '✋', '✌️'] },
    ],
    stacks: [
      whenFlag(
        cameraOn(),
        setScore(1, 0),
        setScore(2, 0),
        say('Oẳn tù tì! Giơ ✊ ✋ ✌️ khi đếm xong'),
        wait(2),
        forever(
          say('3'),
          wait(1),
          say('2'),
          wait(1),
          say('1'),
          wait(1),
          comment('Máy chọn ngẫu nhiên ô 1, 2 hay 3 của danh sách "lựa chọn".', set('số máy', random(1, 3))),
          set('máy', item(v('số máy'), 'lựa chọn')),
          comment(
            'Cử chỉ em đang làm (fist, open, victory). "số em" là số thứ tự của nó trong "lựa chọn": 0 nếu không thấy tay.',
            set('cử chỉ em', gesture()),
          ),
          set('số em', itemNum(v('cử chỉ em'), 'lựa chọn')),
          comment(
            'Chấm điểm theo thứ tự: không thấy tay, hoà, em thắng, còn lại máy thắng.',
            ifElse(
              eq(v('số em'), '0'),
              [set('kết quả', 'Không thấy tay')],
              [
                ifElse(
                  eq(v('cử chỉ em'), v('máy')),
                  [set('kết quả', 'Hoà!')],
                  [
                    comment(
                      'Em thắng khi: búa (fist) gặp kéo (victory), bao (open) gặp búa, hoặc kéo gặp bao.',
                      ifElse(
                        or(
                          and(eq(v('cử chỉ em'), 'fist'), eq(v('máy'), 'victory')),
                          or(
                            and(eq(v('cử chỉ em'), 'open'), eq(v('máy'), 'fist')),
                            and(eq(v('cử chỉ em'), 'victory'), eq(v('máy'), 'open')),
                          ),
                        ),
                        [addScore(1, 1), set('kết quả', 'Em thắng!')],
                        [addScore(1, 2), set('kết quả', 'Máy thắng!')],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          comment(
            'Ghép câu: ký hiệu của máy, ký hiệu của em, rồi kết quả.',
            say(
              join(
                join('Máy ', item(v('số máy'), 'ký hiệu')),
                join(join(' – Em ', item(v('số em'), 'ký hiệu')), join(' → ', v('kết quả'))),
              ),
            ),
          ),
          wait(3),
        ),
      ),
    ],
  },
  {
    id: 'cam-07-phan-xa-cu-chi',
    title: 'Phản xạ cử chỉ',
    level: 3,
    description: 'Sân chơi gọi một cử chỉ; làm đúng thật nhanh để ghi điểm trong 30 giây.',
    note: note(
      'Phản xạ cử chỉ',
      'Nhiệm vụ: luyện phản xạ như thủ môn. Sân chơi gọi cử chỉ nào, em làm ngay cử chỉ đó. Làm đúng được +1, trong 30 giây.',
      AI_HAND,
      'Danh sách là một dãy ô có tên. "mã cử chỉ" giữ tên máy của ba cử chỉ; "tên cử chỉ" giữ tên tiếng Việt cùng thứ tự.',
      'Ngẫu nhiên là máy tự chọn một số, không ai biết trước. Biến "số" là ô máy chọn (1, 2 hay 3).',
      'Máy chọn lại cho tới khi khác cử chỉ tay em đang làm, nên em luôn phải đổi tay.',
      'Khối «đợi đến khi» dừng chương trình lại cho tới khi điều kiện đúng: tay em làm đúng, hoặc hết giờ.',
      'Chơi bằng chuột: giữ chuột trái là nắm tay, phím 1 là xoè tay, phím 2 là chữ V.',
    ),
    variables: [{ name: 'số' }],
    lists: [
      { name: 'mã cử chỉ', items: ['fist', 'open', 'victory'] },
      { name: 'tên cử chỉ', items: ['✊ Nắm tay', '✋ Xòe tay', '✌️ Chữ V'] },
    ],
    stacks: [
      whenFlag(
        cameraOn(),
        setScore(1, 0),
        startTimer(30),
        comment(
          'Mỗi lượt: chọn một cử chỉ, gọi tên, đợi em làm đúng, cộng điểm. Lặp tới khi hết giờ.',
          repeatUntil(
            eq(timeLeft(), '0'),
            set('số', random(1, 3)),
            comment(
              'Chọn lại cho tới khi cử chỉ mới khác cử chỉ tay em đang làm.',
              repeatUntil(not(eq(gesture(), item(v('số'), 'mã cử chỉ'))), set('số', random(1, 3))),
            ),
            say(join('Làm nhanh: ', item(v('số'), 'tên cử chỉ'))),
            comment(
              'Đợi tay em làm đúng cử chỉ, hoặc hết giờ.',
              waitUntil(or(eq(gesture(), item(v('số'), 'mã cử chỉ')), eq(timeLeft(), '0'))),
            ),
            comment(
              'Còn giờ nghĩa là em đã làm đúng: +1. Đợi 0,5 giây rồi ra cử chỉ tiếp.',
              ifThen(gt(timeLeft(), '0'), addScore(1), say('Đúng rồi!'), wait(0.5)),
            ),
          ),
        ),
        timeUpScore(),
      ),
    ],
  },
  {
    id: 'cam-08-de-xanh-bay',
    title: 'Dế Xanh bay',
    level: 3,
    description: 'Bài tập tay-vai: vỗ hai tay xuống để Dế Xanh bay lên, lách qua khe giữa hai cây tre.',
    note: [
      'Dế Xanh bay · Camera AI · Bài tập thể dục tay và vai',
      'Nhiệm vụ: Dế Xanh phải bay qua rừng tre. Em là đôi cánh của dế: vỗ tay xuống để dế bật lên, lách qua khe giữa hai cây tre.',
      'Động tác: đứng thẳng, giơ hai tay lên cao quá đầu, rồi vỗ mạnh xuống ngang hông, như chim vỗ cánh. Mỗi lần vỗ, dế bật lên một chút.',
      'Số lần: mỗi lượt vỗ khoảng 10 đến 20 lần. Chơi 3 lượt rồi nghỉ, thả lỏng vai.',
      'AI là chương trình máy tính học cách nhìn. Ở đây AI tìm hai bàn tay và cổ tay em. Hai tay cùng đi từ nửa trên xuống thật nhanh là một lần vỗ.',
      'Trọng lực kéo dế rơi xuống. Dế chạm cây tre hoặc chạm đất là hết lượt. Qua mỗi khe được 1 điểm.',
      SAFE,
      'Máy không có webcam? Ở khung Sân chơi, chọn "Chuột (không cần webcam)", để con trỏ trên sân chơi và bấm phím cách để vỗ hai tay.',
    ].join('\n'),
    stacks: [
      whenFlag(
        cameraOn(),
        setScore(1, 0),
        spawn('cricket', 'de', -120, 40, 50),
        comment('Cây tre có khe, hiện ở sát mép phải (x: 240).', spawn('bamboo', 'tre', 240, 0, 150)),
        forever(
          comment(
            'Đầu lượt: tắt trọng lực, dừng dế và tre, đưa về chỗ cũ. Khe tre ở độ cao ngẫu nhiên.',
            setGravity(0),
          ),
          setVelocity('de', 0, 0),
          moveTo('de', -120, 40),
          setVelocity('tre', 0, 0),
          moveTo('tre', 240, random(-60, 60)),
          setScore(1, 0),
          say('Giơ hai tay lên cao. 3'),
          wait(1),
          say('2'),
          wait(1),
          say('1'),
          wait(1),
          say('Vỗ cánh nào!'),
          comment('Bật trọng lực 300: dế bắt đầu rơi. Tre trôi sang trái 100 bước mỗi giây.', setGravity(300)),
          setVelocity('tre', -100, 0),
          comment(
            'Đợi tới khi dế chạm tre hoặc chạm mép dưới: hết lượt.',
            waitUntil(or(objectTouching('de', 'tre'), atEdge('de', 'bottom'))),
          ),
          setGravity(0),
          setVelocity('de', 0, 0),
          setVelocity('tre', 0, 0),
          say(join('Ối! Dế bay qua ', join(score(), ' khe. Nghỉ tay một chút nhé!'))),
          wait(3),
        ),
      ),
      comment('Mỗi lần vỗ hai tay: dế bật lên 180 bước mỗi giây.', whenFlap(setVelocity('de', 0, 180))),
      comment(
        'Tre ra tới mép trái là dế đã qua một khe: +1. Tre về bên phải với khe ở chỗ mới.',
        whenTouching('tre', 'LEFT', addScore(1), moveTo('tre', 240, random(-60, 60)), setVelocity('tre', -100, 0)),
      ),
    ],
  },
  {
    id: 'cam-09-nghieng-dau-hung-sao',
    title: 'Thể dục cổ: nghiêng đầu hứng sao',
    level: 2,
    description:
      'Bài tập cổ: nghiêng đầu chậm sang trái, sang phải để robot Tre chạy tới hứng sao rơi, trong 60 giây.',
    note: headNote(
      'Thể dục cổ: nghiêng đầu hứng sao',
      'Nhiệm vụ: sao rơi từ trời xuống. Robot Tre của Làng Maker chạy theo đầu em để hứng: nghiêng đầu sang trái, Tre chạy sang trái.',
      'Động tác: nghiêng đầu thật chậm về một bên, tai hướng xuống vai, giữ 2 giây, về giữa, rồi sang bên kia.',
      'Số lần: tập 60 giây, khoảng 10 lần mỗi bên.',
      'AI là chương trình máy tính học cách nhìn. Ở đây AI tìm 33 điểm trên người em: mũi, mắt, tai, vai… Đường nối hai mắt cho biết đầu nghiêng bao nhiêu độ.',
      'Khối «góc nghiêng đầu» ra số độ: âm là nghiêng trái, dương là nghiêng phải. Nhân 7 lên là chỗ của robot Tre trên sân.',
      SAFE,
    ),
    stacks: [
      whenFlag(
        cameraOn(),
        setScore(1, 0),
        comment('Robot Tre đứng ở gần đáy sân (y: −140).', spawn('tre', 'robot', 0, -140, 80)),
        spawn('star', 'sao', random(-180, 180), 170, 40),
        comment('Sao rơi chậm: 70 bước mỗi giây.', setVelocity('sao', 0, -70)),
        startTimer(60),
        say('Nghiêng đầu thật chậm để robot Tre hứng sao'),
        forever(
          comment(
            'Góc nghiêng đầu (độ) × 7 là chỗ của Tre. Nghiêng 20 độ thì Tre ở x = 140.',
            moveTo('robot', mul(headTilt(), 7), -140),
          ),
          comment(
            'Sao chạm Tre: +1, sao rơi lại từ trên ở chỗ ngẫu nhiên.',
            ifThen(
              objectTouching('sao', 'robot'),
              addScore(1),
              say('+1 ⭐'),
              moveTo('sao', random(-180, 180), 170),
              setVelocity('sao', 0, -70),
            ),
          ),
        ),
      ),
      comment(
        'Sao rơi mất (chạm mép dưới): không trừ điểm, rơi lại từ trên.',
        whenTouching('sao', 'BOTTOM', moveTo('sao', random(-180, 180), 170), setVelocity('sao', 0, -70)),
      ),
      whenTimeUp(say(join('Hết giờ! Hứng được ', join(score(), ' ngôi sao. Thả lỏng cổ nhé.'))), remove('sao')),
    ],
  },
  {
    id: 'cam-10-gat-dau-dem-nhip',
    title: 'Gật đầu đếm nhịp',
    level: 1,
    description: 'Bài tập cổ: gật đầu chậm 10 lần, sân chơi đếm giúp em và đội vương miện sao.',
    note: headNote(
      'Gật đầu đếm nhịp',
      'Nhiệm vụ: như thầy thể dục đếm nhịp, máy đếm số lần em gật đầu và đội cho em một vương miện sao.',
      'Động tác: ngồi hoặc đứng thẳng, cúi đầu chậm cho cằm gần ngực, rồi ngẩng lên nhìn thẳng. Đó là một lần.',
      'Số lần: làm 10 lần, rồi nghỉ.',
      'AI là chương trình máy tính học cách nhìn. Ở đây AI tìm mũi và hai vai em. Mũi đi xuống gần vai rồi lên lại là một lần gật.',
      'Ngôi sao đội trên đầu em: nó đi theo «x của đầu» và «y của đầu» cộng thêm 70.',
      SAFE,
    ),
    stacks: [
      whenFlag(
        cameraOn(),
        setScore(1, 0),
        spawn('star', 'sao', 0, 0, 40),
        say('Gật đầu thật chậm 10 lần nhé'),
        comment('Sao đội trên đầu: x của đầu, y của đầu + 70.', forever(moveTo('sao', headX(), add(headY(), 70)))),
      ),
      comment(
        'Mỗi lần gật: +1. Quá 9 (tức đủ 10) thì khen; chưa thì đọc số lần.',
        whenNod(
          addScore(1),
          ifElse(
            gt(score(), 9),
            [say('Giỏi lắm! Đủ 10 lần rồi. Thả lỏng cổ nhé.')],
            [say(join('Gật lần ', score()))],
          ),
        ),
      ),
    ],
  },
  {
    id: 'cam-11-ngoi-xuong-ne-bong',
    title: 'Ngồi xuống né bóng',
    level: 2,
    description: 'Bài tập chân: bóng bay ngang tầm đầu, em ngồi xuống chậm để né rồi đứng lên, trong 60 giây.',
    note: headNote(
      'Ngồi xuống né bóng',
      'Nhiệm vụ: quả bóng bay ngang qua đúng tầm đầu em. Ngồi xuống để bóng bay qua trên đầu, rồi đứng lên.',
      'Động tác: hai chân rộng bằng vai, lưng thẳng, ngồi xuống chậm như ngồi ghế, rồi đứng lên.',
      'Số lần: tập 60 giây, khoảng 10 đến 15 lần ngồi xuống đứng lên.',
      'AI là chương trình máy tính học cách nhìn. Ở đây AI tìm đầu em. Lúc đầu máy nhớ độ cao đầu em khi đứng thẳng vào biến "độ cao đầu". Bóng bay ở đúng độ cao đó.',
      'Biến là một cái hộp có tên để não nhớ một con số.',
      'Bóng chạm đầu là trúng. Bóng bay qua tới mép trái là né được: +1 điểm.',
      'Đứng cách camera đủ xa để thấy cả người.',
      SAFE,
    ),
    variables: [{ name: 'độ cao đầu' }],
    stacks: [
      whenFlag(
        cameraOn(),
        setScore(1, 0),
        say('Đứng thẳng, nhìn vào camera…'),
        wait(3),
        comment('Nhớ độ cao đầu lúc đứng thẳng. Bóng sẽ bay ở đúng độ cao này.', set('độ cao đầu', headY())),
        spawn('ball', 'bong', 240, v('độ cao đầu'), 50),
        comment('Bóng bay sang trái 120 bước mỗi giây, từ mép phải (x: 240).', setVelocity('bong', -120, 0)),
        startTimer(60),
        say('Bóng tới! Ngồi xuống thật chậm để né'),
      ),
      comment(
        'Bóng chạm đầu: trúng, không có điểm. Bóng bay lại từ mép phải.',
        whenTouching(
          'bong',
          'HEAD',
          say('Ối, trúng đầu!'),
          moveTo('bong', 240, v('độ cao đầu')),
          setVelocity('bong', -120, 0),
        ),
      ),
      comment(
        'Bóng qua tới mép trái mà không chạm đầu: em đã né được, +1.',
        whenTouching(
          'bong',
          'LEFT',
          addScore(1),
          say('Né giỏi! Đứng lên nào'),
          moveTo('bong', 240, v('độ cao đầu')),
          setVelocity('bong', -120, 0),
        ),
      ),
      whenTimeUp(say(join('Hết giờ! Né được ', join(score(), ' quả. Đứng thẳng, thở đều nhé.'))), remove('bong')),
    ],
  },
].map((example) => ({
  source: 'ThingBlock Camera AI',
  ...example,
  // Every line of the note wraps at about 60 characters, so it is sized to show all of them.
  noteHeight: 22 * example.note.split('\n').reduce((n, line) => n + Math.max(1, Math.ceil(line.length / 60)), 0) + 24,
  group: GROUP,
  hardware: HARDWARE,
  device: null,
}))

/** The block helpers, for the Camera AI lessons' `solutions` fixtures. */
export const cameraBlocks = {
  add,
  addScore,
  atEdge,
  headTilt,
  headX,
  headY,
  moveTo,
  mul,
  objectTouching,
  setGravity,
  setVelocity,
  whenFlap,
  whenHeadTilt,
  whenNod,
  cameraOn,
  forever,
  ifThen,
  moveRandom,
  moveToHand,
  say,
  setScore,
  spawn,
  touching,
  wait,
  whenFlag,
  whenGesture,
}
