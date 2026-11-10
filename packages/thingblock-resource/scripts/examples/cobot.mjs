// The CoBot examples: the Maker Village line-following robot, from its first wheel turn to a simple maze.
// Each entry is an index.json record plus the program, written with dsl.mjs; build-examples.mjs writes
// them to src/examples/cobot/. The line-following logic follows makerviet/cobot-arduino's
// `cobot_simple_line_following` sample (commit 4854f9c), rebuilt from blocks.
import {
  call,
  cobotDrive,
  cobotInit,
  cobotStop,
  cobotTrim,
  colourIs,
  define,
  eye,
  ifElse,
  ifThen,
  join,
  lineWhen,
  not,
  note,
  onLine,
  or,
  pattern,
  patternIs,
  repeatUntil,
  serialBegin,
  serialPrint,
  serialPrintln,
  wait,
  whenBegin,
  whenLoop,
  whiteLight,
} from './dsl.mjs'

const COBOT = 'CoBot'
const SOURCE = 'makerviet/cobot-arduino (Maker Việt · ThingEdu)'

/**
 * One step of line following, as the maker's sample does it: spin back when an outer eye sees the line.
 * @param {number} speed Wheel speed in %.
 * @returns {object} The if-else block.
 */
const followStep = (speed) =>
  ifElse(
    or(patternIs('1000'), patternIs('1100')),
    [cobotDrive('spinLeft', speed)],
    [
      ifElse(
        or(patternIs('0001'), patternIs('0011')),
        [cobotDrive('spinRight', speed)],
        [cobotDrive('forward', speed)],
      ),
    ],
  )

export const COBOT_EXAMPLES = [
  {
    id: 'cobot-01-chay-thu-dong-co',
    title: 'Xe giao hàng chạy thử',
    group: COBOT,
    device: 'cobot',
    level: 1,
    source: `${SOURCE}: cobot_motors_test`,
    hardware: ['CoBot (hai động cơ: bánh trái IO2/IO10, bánh phải IO6/IO5)'],
    description: 'Trước giờ giao hàng, xe chạy thử: tiến, lùi, rẽ, xoay tại chỗ rồi dừng.',
    note: 'CoBot · Bài 1: Xe giao hàng chạy thử\nTrong kho hàng, xe tự hành phải chạy thử mỗi sáng trước khi chở hàng. CoBot có hai bánh, mỗi bánh một động cơ. Xe không có vô lăng: nó rẽ nhờ cho hai bánh quay khác nhau. Cách lái này gọi là "vi sai": khác nhau một chút thì xe rẽ.\nHai bánh cùng tiến: xe đi thẳng. Một bánh đứng, bánh kia chạy: xe rẽ. Hai bánh quay ngược chiều: xe xoay tại chỗ. Tốc độ tính theo phần trăm, 100% là nhanh nhất.\nĐặt xe trên sàn rộng rồi bật công tắc. Xe chạy một lượt lúc khởi động rồi dừng.',
    variables: [],
    stacks: [
      whenBegin(
        note('Chuẩn bị hai động cơ và các mắt của xe.', cobotInit()),
        note('Hai động cơ không quay nhanh y hệt nhau. Bánh phải nhanh hơn 10% để xe đi thẳng.', cobotTrim(10)),
        cobotDrive('forward', 50),
        wait(1),
        cobotDrive('backward', 50),
        wait(1),
        note('Rẽ: một bánh đứng, bánh kia chạy, xe vòng quanh bánh đứng.', cobotDrive('turnLeft', 50)),
        wait(1),
        cobotDrive('turnRight', 50),
        wait(1),
        note('Xoay: hai bánh chạy ngược chiều, xe quay tại chỗ như con quay.', cobotDrive('spinLeft', 50)),
        wait(1),
        cobotDrive('spinRight', 50),
        wait(1),
        cobotStop(),
      ),
      whenLoop(),
    ],
  },
  {
    id: 'cobot-02-doc-bon-mat',
    title: 'Bốn mắt nhìn sàn',
    group: COBOT,
    device: 'cobot',
    level: 1,
    source: `${SOURCE}: cobot_simple_line_following`,
    hardware: ['CoBot (4 mắt hồng ngoại: IO4, IO3, IO1, IO0)', 'Cáp USB để xem số trên Serial Monitor'],
    description: 'Đọc số của 4 mắt dò line và in lên Serial Monitor; tìm ngưỡng chia vạch và nền.',
    note: 'CoBot · Bài 2: Bốn mắt nhìn sàn\nDưới mũi CoBot có 4 mắt hồng ngoại, đánh số 1 đến 4 từ trái sang phải. Mỗi mắt có một đèn chiếu ánh sáng hồng ngoại (mắt người không thấy) xuống sàn và một ô đón ánh sáng hắt lên. Mặt sàn khác màu thì hắt lại khác nhau, nên số đọc khác nhau, từ 0 đến 4095.\nMở Serial Monitor, đặt xe lên nền rồi lên vạch, ghi lại hai số. Ngưỡng là con số ở giữa hai số đó: nó chia "vạch" và "nền". Chương trình mẫu của Maker Việt dùng ngưỡng 2000: số đọc nhỏ hơn hoặc bằng 2000 là thấy vạch.\nDòng "mẫu" gộp 4 mắt thành 4 chữ số: 1 là thấy vạch, 0 là không. "0110" nghĩa là hai mắt giữa đang thấy vạch.',
    variables: [],
    stacks: [
      whenBegin(
        cobotInit(),
        note('Serial là đường để mạch gửi chữ lên máy tính qua cáp USB.', serialBegin(115200)),
        note('Ngưỡng 2000 như chương trình mẫu. Đổi số này theo số em đo được.', lineWhen('below', 2000)),
      ),
      whenLoop(
        serialPrint('mắt: '),
        serialPrint(eye(1)),
        serialPrint('  '),
        serialPrint(eye(2)),
        serialPrint('  '),
        serialPrint(eye(3)),
        serialPrint('  '),
        serialPrint(eye(4)),
        serialPrintln(join('   mẫu: ', pattern())),
        wait(0.2),
      ),
    ],
  },
  {
    id: 'cobot-03-do-line-co-ban',
    title: 'Dò line: xe theo vạch',
    group: COBOT,
    device: 'cobot',
    level: 2,
    source: `${SOURCE}: cobot_simple_line_following`,
    hardware: ['CoBot', 'Sân có vạch dò line (băng dính dán trên nền)'],
    description:
      'Xe bám theo vạch như chương trình mẫu: mắt ngoài cùng thấy vạch thì xoay về phía đó, còn lại đi thẳng.',
    note: 'CoBot · Bài 3: Dò line\nXe chở hàng trong nhà máy thường chạy theo một vạch kẻ trên sàn. Dò line nghĩa là đi theo vạch đó.\nMỗi vòng lặp, xe nhìn mẫu 4 mắt. Mắt 1 (bên trái) thấy vạch: vạch đang lệch sang trái, xe xoay trái để quay về. Mắt 4 (bên phải) thấy vạch: xe xoay phải. Các trường hợp khác: xe đi thẳng. Đây đúng là cách chương trình mẫu của Maker Việt làm.\nThấy xe lắc nhiều quá thì giảm tốc độ. Xe không thấy vạch thì làm lại bài 2 để chọn ngưỡng.',
    variables: [],
    stacks: [
      whenBegin(cobotInit(), cobotTrim(10), lineWhen('below', 2000)),
      whenLoop(
        note(
          'Mẫu "1000" hoặc "1100": vạch lệch sang trái, xoay trái. Mẫu "0001" hoặc "0011": xoay phải. Còn lại: đi thẳng.',
          followStep(40),
        ),
        wait(0.01),
      ),
    ],
  },
  {
    id: 'cobot-04-dung-o-vach-do',
    title: 'Xe buýt dừng ở trạm đỏ',
    group: COBOT,
    device: 'cobot',
    level: 2,
    source: `${SOURCE}: cảm biến màu TCS34725 trên đế CoBot`,
    hardware: ['CoBot (cảm biến màu nối I2C: SDA IO8, SCL IO9)', 'Sân dò line có dán một ô màu đỏ trên vạch'],
    description: 'Xe dò line; cảm biến màu thấy ô đỏ thì dừng 3 giây như xe buýt đón khách, rồi đi tiếp.',
    note: 'CoBot · Bài 4: Xe buýt dừng ở trạm đỏ\nXe buýt chạy theo tuyến và dừng ở mỗi trạm. Trạm của CoBot là một ô màu đỏ dán trên vạch.\nGiữa đế xe có một cảm biến màu. Nó đo ánh sáng đỏ, xanh lá, xanh dương hắt lên rồi đoán màu. Cảm biến nói chuyện với não qua I2C: hai sợi dây (SDA và SCL) mà nhiều thiết bị dùng chung, mỗi thiết bị có một số nhà riêng. Số nhà của cảm biến màu là 0x29.\nĐèn trắng bật lên để chiếu sáng mặt sàn, nhờ vậy màu đọc như nhau dù phòng sáng hay tối. Khối "dò line một bước" là phần dò line của bài 3, gói lại thành một khối riêng.',
    variables: [],
    stacks: [
      whenBegin(
        cobotInit(),
        cobotTrim(10),
        lineWhen('below', 2000),
        note('Đèn trắng chiếu xuống sàn cho cảm biến màu nhìn rõ.', whiteLight(true)),
      ),
      whenLoop(
        note(
          'Thấy màu đỏ: dừng đón khách 3 giây, rồi đi thẳng một đoạn ngắn để ra khỏi ô đỏ.',
          ifElse(
            colourIs(1),
            [cobotStop(), wait(3), cobotDrive('forward', 40), wait(0.5)],
            [call('dò line một bước')],
          ),
        ),
        wait(0.01),
      ),
      define('dò line một bước', followStep(40)),
    ],
  },
  {
    id: 'cobot-05-tim-duong-me-cung',
    title: 'Tìm đường trong mê cung vạch',
    group: COBOT,
    device: 'cobot',
    level: 3,
    source: 'ThingBlock: quy tắc bám tường trái của micromouse, làm trên mê cung vạch',
    hardware: ['CoBot', 'Mê cung vẽ bằng vạch: các ngã rẽ vuông góc, có ngõ cụt'],
    description: 'Robot dò đường thi đấu: gặp ngã rẽ trái thì rẽ trái, gặp ngõ cụt thì quay đầu, cứ thế tới đích.',
    note: 'CoBot · Bài 5: Tìm đường trong mê cung\nTrong cuộc thi micromouse, chú chuột robot phải tự tìm đường ra mê cung. Một cách dễ là quy tắc "tay trái": luôn đặt tay trái lên tường mà đi. Với mê cung vạch, tay trái là: có đường rẽ trái thì rẽ trái; không có thì đi thẳng; đi thẳng cũng không được thì rẽ phải; ngõ cụt thì quay đầu.\nMắt 1 và mắt 2 cùng thấy vạch ("11xx") là có ngã rẽ trái. Cả 4 mắt không thấy gì ("0000") là ngõ cụt. Mắt 3 và mắt 4 cùng thấy vạch ("xx11") là có đường bên phải: xe nhích lên xem phía trước còn đường không.\nKhi xoay, xe xoay cho tới khi mắt giữa lại thấy vạch. Khối "lặp lại cho tới khi" giúp làm việc đó. Chỉnh tốc độ và thời gian nhích lên cho hợp với sân của em.',
    variables: [],
    stacks: [
      whenBegin(cobotInit(), cobotTrim(10), lineWhen('below', 2000)),
      whenLoop(
        ifElse(
          patternIs('11xx'),
          [call('rẽ trái ở ngã rẽ')],
          [
            ifElse(
              patternIs('0000'),
              [call('quay đầu')],
              [ifElse(patternIs('xx11'), [call('rẽ phải nếu hết đường thẳng')], [call('bám vạch')])],
            ),
          ],
        ),
        wait(0.01),
      ),
      define(
        'bám vạch',
        note(
          'Mắt 2 thấy vạch mà mắt 3 không: vạch lệch trái, rẽ trái nhẹ. Ngược lại thì rẽ phải nhẹ.',
          ifElse(
            onLine(2),
            [ifElse(onLine(3), [cobotDrive('forward', 40)], [cobotDrive('turnLeft', 40)])],
            [ifElse(onLine(3), [cobotDrive('turnRight', 40)], [cobotDrive('forward', 40)])],
          ),
        ),
      ),
      define(
        'rẽ trái ở ngã rẽ',
        note('Nhích lên để bánh xe tới giữa ngã rẽ.', cobotDrive('forward', 40)),
        wait(0.15),
        note('Xoay trái một chút cho mắt rời vạch cũ.', cobotDrive('spinLeft', 40)),
        wait(0.2),
        repeatUntil(onLine(2), cobotDrive('spinLeft', 40)),
      ),
      define('quay đầu', cobotDrive('spinRight', 40), wait(0.3), repeatUntil(onLine(3), cobotDrive('spinRight', 40))),
      define(
        'rẽ phải nếu hết đường thẳng',
        cobotDrive('forward', 40),
        wait(0.15),
        note(
          'Phía trước vẫn còn vạch thì đi thẳng (tay trái vẫn ưu tiên đường thẳng hơn đường phải).',
          ifThen(
            not(or(onLine(2), onLine(3))),
            cobotDrive('spinRight', 40),
            wait(0.2),
            repeatUntil(onLine(3), cobotDrive('spinRight', 40)),
          ),
        ),
      ),
    ],
  },
]
