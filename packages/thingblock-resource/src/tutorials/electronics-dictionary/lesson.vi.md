---
id: electronics-dictionary
name: Từ điển điện tử cho người mới
group: getting-started
order: 2
board: thingbot
duration: 20
---

## Từ điển bằng đồ vật quen thuộc

Trong các bài học, em sẽ gặp những từ lạ: **chân IO**, **đầu vào**, **I2C**, **mạch công suất**, **servo**, **ngưỡng**, **Sân chơi**… Bài này giải thích từng từ bằng một đồ vật em đã thấy ở nhà, ngoài đường hay trong cơ thể mình.

Bài này không chấm điểm. Em đọc từng bước, trả lời câu **Đoán trước** trong đầu, rồi bấm **Gợi ý** để xem đáp án. Quên từ nào thì mở lại bài này để tra.

## Chip: bộ não của robot

**Chip** là một miếng nhỏ màu đen trên mạch. Nó nhận tin, suy nghĩ theo chương trình em viết, rồi ra lệnh.

- **Đời thường:** điện thoại, máy giặt, nồi cơm điện đều có một con chip. Nồi cơm biết lúc nào chuyển sang "ủ ấm" là nhờ chip.
- **Ở ThingBot:** bộ não là chip **ESP32-C3**.

Chip chỉ làm đúng điều em dặn. Dặn thiếu một bước thì robot cũng thiếu một bước, như người làm bánh làm theo công thức.

**Đoán trước:** nồi cơm điện có cần chương trình không?

- Có
- Không

> hint: Đáp án: **có**. Người làm nồi đã viết sẵn chương trình: nấu tới khi nồi đủ nóng thì chuyển sang ủ ấm. Em viết chương trình cho ThingBot cũng y như vậy.

## Điện: nước chảy trong ống

Hãy tưởng tượng điện như **nước trong ống**:

- **Điện áp** (đo bằng **vôn**, viết **V**) giống độ cao của bồn nước. Bồn đặt càng cao thì nước đẩy càng mạnh.
- **Dòng điện** giống lượng nước chảy qua ống mỗi giây.
- **Dây điện** là cái ống. **Công tắc** là cái van: đóng van thì nước ngừng chảy.

ThingBot dùng điện nhỏ, từ pin hoặc từ dây USB nối máy tính, nên em chạm vào mạch không sao. Điện ổ cắm trong nhà thì mạnh hơn rất nhiều lần: **không bao giờ** cắm robot hay dây trần vào ổ điện.

**Đoán trước:** bóng đèn sáng khi nào?

- Khi có dòng điện chạy qua
- Khi có dây nối vào, dù công tắc đang tắt

> hint: Đáp án: **khi có dòng điện chạy qua**. Công tắc tắt giống van đóng: ống vẫn nối, nhưng nước không chảy nên đèn không sáng.

## Chân IO: dây thần kinh có số

Bộ não nối ra ngoài bằng nhiều sợi dây gọi là **chân**. Mỗi chân có một số riêng: **IO0**, **IO3**, **IO4**… "IO" là viết tắt của tiếng Anh _Input/Output_, nghĩa là "vào/ra".

- **Đời thường:** như **dây thần kinh** nối não với ngón tay. Hoặc như các ổ cắm trên ổ điện kéo dài có đánh số, mỗi ổ cắm một đồ dùng.
- **Ở ThingBot:** nút **SW** nối vào chân **IO3**. Cảm biến cắm vào các cổng có chân **IO0/IO1** và **IO4/IO5**.

Khi khối hỏi "chân số mấy", em chỉ cần nhìn chữ in cạnh cổng trên mạch để biết.

**Đoán trước:** nếu em cắm cảm biến vào cổng IO4 nhưng trong chương trình lại chọn chân IO5, chuyện gì xảy ra?

- Robot vẫn đọc đúng
- Robot đọc nhầm chỗ, nên không thấy cảm biến

> hint: Đáp án: **robot đọc nhầm chỗ**. Giống gọi điện nhầm số: máy vẫn đổ chuông, nhưng là nhà khác. Số chân trong chương trình phải trùng với cổng em cắm.

## Đầu vào và đầu ra

- **Đầu vào** báo tin cho não: nút bấm, cảm biến, tay cầm điều khiển. Như **mắt, tai, da** của em.
- **Đầu ra** nhận lệnh từ não: đèn, còi, động cơ, servo, màn hình. Như **tay, chân, miệng** của em.

**Đời thường:** ở cửa nhà, **nút chuông** là đầu vào, **tiếng chuông** là đầu ra. Ở ngã tư, **nút bấm sang đường** cho người đi bộ là đầu vào, **đèn giao thông** là đầu ra.

**Đoán trước:** trong xe ô tô có **cảm biến lùi** kêu "tít tít" khi gần tường. Cái nào là đầu vào, cái nào là đầu ra?

- Cảm biến là đầu vào, loa "tít tít" là đầu ra
- Cả hai đều là đầu ra

> hint: Đáp án: **cảm biến là đầu vào, loa là đầu ra**. Cảm biến báo cho chip "tường còn 30 cm". Chip ra lệnh cho loa kêu nhanh hơn khi xe lùi gần tường hơn.

## Bật/tắt và mức to/nhỏ

Có hai kiểu tin mà não đọc được:

- **Kiểu bật/tắt** (gọi là **số**, tiếng Anh _digital_): chỉ có hai giá trị, như **công tắc đèn**: bật hoặc tắt, không có "nửa bật".
- **Kiểu mức** (gọi là **tương tự**, tiếng Anh _analog_): có nhiều mức liền nhau, như **núm vặn âm lượng** của loa hay **vòi nước** mở to mở nhỏ.

**Ở ThingBot:** nút **SW** là kiểu bật/tắt. Một điều lạ: khi em bấm, chân IO3 xuống **0 V**. Khối đọc nút đã tính sẵn chuyện này và đảo lại, nên bấm thì khối trả về **đúng**, em không cần nhớ.

**Đoán trước:** nhiệt kế đo nhiệt độ phòng là kiểu nào?

- Bật/tắt
- Mức

> hint: Đáp án: **mức**. Nhiệt độ có thể là 25, 26, 27 độ… chứ không chỉ "nóng" hay "lạnh". Còn cảm biến chuyển động ở cửa siêu thị thì gần như bật/tắt: có người hoặc không.

## Độ sáng và tốc độ: chớp thật nhanh

Đèn và động cơ thật ra chỉ biết **bật** hoặc **tắt**. Vậy sao đèn L1 sáng được 30%?

Mạch bật rồi tắt đèn **rất nhanh**, rất nhiều lần mỗi giây. Mắt em không kịp thấy chớp, chỉ thấy đèn mờ đi. Bật càng lâu trong mỗi lần chớp thì đèn càng sáng, động cơ càng quay nhanh. Người ta gọi cách này là **PWM**. Một lần bật cộng một lần tắt gọi là một **chu kỳ**.

- **Đời thường:** phim hoạt hình là nhiều bức ảnh đứng yên lật thật nhanh, mắt thấy như đang chạy. Hay em đạp xe: đạp một chút rồi thả, đạp nhiều hơn thì xe đi nhanh hơn.
- **Ở ThingBot:** khối ghi độ sáng hay tốc độ bằng **%**. 0% là tắt hẳn, 100% là bật liên tục. Bên trong, mạch chia mỗi lần chớp thành 4096 phần nhỏ để chỉnh thật mịn.

**Đoán trước:** đèn ở 50% thì trong mỗi lần chớp, đèn bật bao lâu?

- Khoảng một nửa thời gian
- Cả thời gian, nhưng điện yếu đi một nửa

> hint: Đáp án: **khoảng một nửa thời gian**. Điện mỗi lần bật vẫn mạnh như cũ, chỉ là bật một nửa rồi tắt một nửa, lặp lại thật nhanh.

## Thử ngay: đèn sáng một phần ba

Giờ em tự làm đèn mờ trên mạch ảo ở khung **Mô phỏng**:

1. Mở nhóm **Sự kiện**, kéo khối **khi Arduino khởi động** ra vùng lập trình.
2. Mở nhóm **ThingBot**, kéo khối **khởi động ThingBot** vào trong. Khối này đánh thức mạch công suất (em sẽ gặp ở bước sau).
3. Thêm khối **đặt đèn L1 độ sáng** ngay dưới, rồi đổi số thành **30**.
4. Bấm **Chạy**.

Đèn L1 sáng nhưng mờ hơn lúc 100%. Đó chính là "chớp thật nhanh": đèn bật khoảng 30% thời gian, tắt 70% còn lại.

> hint: Ô đầu của khối **đặt đèn** chọn **L1**, ô sau là độ sáng. Gõ **30** vào ô sau.
> hint: Đổi thử thành 5 rồi 100 và bấm Chạy lại để so độ sáng.

check: L1 on

## I2C: hai sợi dây và số nhà

**I2C** (đọc là "i-hai-xê") là cách não **nói chuyện với nhiều thiết bị chỉ bằng hai sợi dây**: dây **SDA** chở tin, dây **SCL** giữ nhịp như người đánh trống.

Mỗi thiết bị trên hai sợi dây có một **địa chỉ**, giống **số nhà** trên một con phố.

- **Đời thường:** một con phố chỉ có một đường, nhưng bác đưa thư vẫn giao đúng thư nhờ số nhà. Hay như lớp học: cô gọi tên bạn nào thì bạn đó trả lời, các bạn khác ngồi yên.
- **Ở ThingBot:** hai sợi dây I2C nối vào chân **IO8** (SDA) và **IO9** (SCL). Màn hình OLED ở "số nhà" **0x3C**. Mạch công suất cũng nằm trên hai sợi dây này, ở một số nhà khác.

Chữ "0x" chỉ là cách người lập trình viết số, em đọc "0x3C" như một cái tên là đủ.

**Đoán trước:** hai thiết bị cùng số nhà, cắm chung hai sợi dây I2C. Chuyện gì xảy ra?

- Cả hai cùng trả lời, tin bị lẫn
- Não tự đổi số nhà cho một cái

> hint: Đáp án: **cả hai cùng trả lời, tin bị lẫn**. Như hai bạn cùng tên trong lớp: cô gọi, hai bạn đứng lên một lúc. Mỗi thiết bị I2C phải có số nhà riêng.

## Màn hình OLED: điểm ảnh và con trỏ

Màn **OLED** là màn nhỏ cắm vào cổng I2C. Nó gồm **128 × 64** chấm sáng gọi là **điểm ảnh**: 128 chấm theo chiều ngang, 64 chấm theo chiều dọc. Màn chỉ có chữ **không dấu**.

- **Đời thường:** như bảng đèn chạy chữ ở hiệu thuốc, hay bảng tỉ số sân bóng: mỗi chữ ghép từ nhiều bóng đèn nhỏ.
- **Ở ThingBot:** vị trí viết bằng hai số, **x** đếm từ mép trái, **y** đếm từ mép trên; (0, 0) là góc trên bên trái. Chữ cỡ nhỏ **6x8** cao 8 điểm ảnh, cỡ **12x16** cao 16.

**Con trỏ** là chỗ đầu bút đang đặt trên màn; khối **đặt con trỏ OLED x: … y: …** nhấc bút đặt sang chỗ mới. Khối **OLED in** viết vào **bản nháp** trong bộ nhớ, còn **hiện lên màn OLED** chép cả bản nháp ra màn một lần, nên màn không bị nháy.

**Đoán trước:** em in chữ nhưng quên khối **hiện lên màn OLED**. Màn hình hiện gì?

- Vẫn hiện chữ
- Không hiện gì

> hint: Đáp án: **không hiện gì**. Chữ còn nằm trên bản nháp, chưa được chép ra màn. Như em viết nháp xong mà chưa chép lên bảng.

## Mạch công suất: cái loa phóng thanh

Não chỉ "nói thầm": dòng điện ra từ chip rất nhỏ, không đủ làm quay động cơ hay kêu còi. **Mạch công suất** nghe lời thầm của não qua hai dây I2C, rồi đẩy điện đủ mạnh ra đèn, còi, động cơ và servo.

- **Đời thường:** cô giáo nói nhỏ vào micro, **loa phóng thanh** làm cả sân trường nghe thấy. Hay như cần cẩu: người lái chỉ gạt một cần nhỏ, máy nâng cả khối bê tông.
- **Ở ThingBot:** đèn **L1**, **L2**, **còi**, cổng động cơ **M1–M4** và cổng servo **S1–S5** đều do mạch công suất cấp điện.

Vì thế các bài ThingBot đều mở đầu bằng khối **khởi động ThingBot**: khối này đánh thức mạch công suất. Các khối đèn, động cơ, servo cũng tự đánh thức được mạch này, nhưng đặt khối đó đầu tiên là thói quen tốt: nhìn vào là biết chương trình chạy trên ThingBot.

**Đoán trước:** robot thật đã nạp chương trình, đèn sáng, nhưng bánh xe không quay. Em kiểm tra gì trước?

- Pin hoặc công tắc nguồn của robot
- Viết lại cả chương trình

> hint: Đáp án: **pin hoặc công tắc nguồn**. Dây USB đủ điện cho não và đèn nhỏ, nhưng động cơ cần điện mạnh từ pin. Như loa phóng thanh: micro vẫn bật, nhưng loa chưa cắm điện thì sân trường không ai nghe.

## Động cơ và servo

- **Động cơ** (gọi đầy đủ là động cơ DC) quay **mãi** khi có điện, như **bánh xe đạp** hay **quạt trần**. Em chỉnh **chiều quay** (tiến, lùi) và **tốc độ** (%).
- **Servo** quay tới **đúng một góc** rồi đứng lại giữ yên, như **khớp khuỷu tay**, **cần gạt nước ô tô** hay **thanh chắn barie** ở bãi xe. Góc tính từ 0 đến 180 độ.

**Ở ThingBot:** động cơ **M1** là bánh trái, **M2** là bánh phải. Servo cắm vào **S1** đến **S5**.

**Đoán trước:** làm xe rẽ trái tại chỗ, hai bánh quay thế nào?

- Bánh trái lùi, bánh phải tiến
- Cả hai cùng tiến, nhanh như nhau

> hint: Đáp án: **bánh trái lùi, bánh phải tiến**. Xe quay quanh giữa thân, như em xoay người bằng cách bước một chân lên, một chân lùi. Hai bánh cùng tiến đều nhau thì xe chỉ đi thẳng.

## Cảm biến siêu âm: tiếng vang của dơi

Cảm biến siêu âm có hai "mắt" tròn. Một bên **kêu** một tiếng rất cao mà tai người không nghe được, bên kia **nghe tiếng vọng** dội lại. Tiếng vọng về càng nhanh thì vật càng gần.

- **Đời thường:** **con dơi** bay trong đêm tối bằng cách kêu rồi nghe tiếng vọng. Em hét trong hang hay giữa hai dãy núi cũng nghe tiếng mình vọng lại. Cảm biến lùi xe ô tô làm đúng việc này.
- **Ở ThingBot:** chân phát tiếng **TRIG** cắm vào **IO0**, chân nghe tiếng vọng **ECHO** cắm vào **IO4**. Khối đọc trả về khoảng cách bằng **cm**.

**Đoán trước:** cảm biến đặt trước một tấm rèm vải dày. Số đo có chính xác không?

- Có thể sai, vì vải mềm "nuốt" bớt tiếng vọng
- Luôn chính xác

> hint: Đáp án: **có thể sai**. Tường cứng dội tiếng tốt, còn rèm, gối, thú bông hút bớt tiếng. Khi thử robot tránh vật cản, em nên dùng hộp giấy cứng làm vật cản.

## Mắt hồng ngoại và ngưỡng

**Mắt hồng ngoại** có một bóng đèn hồng ngoại (mắt người không thấy) và một "con ngươi" đo ánh sáng hắt lại. Đồ màu sáng hắt lại nhiều, đồ màu tối "nuốt" ánh sáng.

- **Đời thường:** em rọi đèn pin vào tờ giấy trắng thì chói, rọi vào áo đen thì không. Mắt hồng ngoại cũng chỉ thấy "hắt nhiều hay ít", **không thấy màu**.
- **Ở ThingBot:** mắt cắm ở cổng cảm biến, chân tín hiệu **IO4**. Khối **đọc mắt hồng ngoại 1 · IO4** (nhóm **Cobot IR**) cho một số từ **0 đến 4095**: bóng trắng khoảng 3500, bóng đen khoảng 300. Xe Cobot có bốn mắt như vậy dưới gầm để dò vạch.

**Ngưỡng** là con số dùng để chia đôi: trên ngưỡng là "sáng", dưới ngưỡng là "tối". Như vạch mức trên cốc đo: nước trên vạch là đủ, dưới vạch là thiếu. Các bài dùng ngưỡng **1500**.

Muốn biết đỏ hay vàng thì cần **cảm biến màu**: nó có ba "con ngươi" đỏ, lục, lam, giống ba loại tế bào nhìn màu trong mắt người.

**Đoán trước:** mắt đọc được 2300. Với ngưỡng 1500, não coi đó là sáng hay tối?

- Sáng
- Tối

> hint: Đáp án: **sáng**, vì 2300 lớn hơn 1500. Trên robot thật số đọc đổi theo khoảng cách và đèn trong phòng, nên kỹ sư đo từng vật rồi mới chọn ngưỡng.

## Tay cầm PS2 và bộ thu

**Tay cầm PS2** gửi lệnh bằng **sóng radio**, không cần dây. Một **bộ thu** nhỏ cắm ở cổng PS2 trên mạch nghe sóng đó rồi báo cho não.

- **Đời thường:** như điều khiển tivi: em bấm ở xa, tivi có "tai" nhận lệnh. Bộ thu là đôi tai của robot.
- **Ở ThingBot:** khối **khởi động tay cầm PS2 trên ThingBot** nối não với bộ thu. Trong vòng lặp, khối **đọc dữ liệu tay cầm PS2** hỏi bộ thu "nút nào đang bấm?", rồi khối **nút lên của PS2 đang bấm?** trả lời đúng hoặc sai. Mỗi nút chỉ có bấm hay không, kiểu bật/tắt.

**Đoán trước:** em quên khối **đọc dữ liệu tay cầm PS2** trong vòng lặp. Bấm nút thì sao?

- Xe vẫn chạy
- Xe không phản ứng

> hint: Đáp án: **xe không phản ứng**. Não không hỏi thì bộ thu không báo, não cứ tưởng chưa ai bấm.

## Biến, vòng lặp, sự kiện và điều kiện

Bốn từ này không phải linh kiện, nhưng bài nào cũng gặp:

- **Biến** là **cái hộp có dán tên** để não nhớ một con số: số điểm, số lần bấm nút. Như bảng tỉ số trên sân bóng, đổi số mỗi khi có bàn thắng.
- **Vòng lặp** làm đi làm lại một việc. **khi Arduino khởi động** chạy **một lần** lúc bật máy, như em đánh răng buổi sáng. **vòng lặp Arduino** chạy **mãi mãi**, như kim đồng hồ quay hết vòng lại quay tiếp. Ở bài Camera AI, khối **liên tục** cũng lặp mãi như vậy.
- **Sự kiện** là "khi có chuyện gì đó thì làm": **khi** có người bấm chuông **thì** chuông kêu. Khối có mũ tròn ở trên (**khi Arduino khởi động**, **khi gật đầu**…) gọi là **khối mũ**: nó tự chạy khi chuyện đó xảy ra.
- **Điều kiện** là câu hỏi chỉ có **đúng** hoặc **sai**: "nút có đang bấm không?". Khối **nếu … thì … nếu không thì** hỏi câu đó: đúng thì làm nhánh **thì**, sai thì làm nhánh **nếu không thì**.

**Đoán trước:** muốn đèn nhấp nháy suốt đến khi tắt robot, em đặt khối bật/tắt đèn ở đâu?

- Trong **khi Arduino khởi động**
- Trong **vòng lặp Arduino**

> hint: Đáp án: **trong vòng lặp Arduino**. Đặt trong khi Arduino khởi động thì đèn chỉ chớp một lần lúc bật máy rồi thôi.

## Camera AI: máy học nhìn bàn tay

**Trí tuệ nhân tạo (AI)** ở đây là một chương trình đã **học** từ rất nhiều ảnh bàn tay, nên nhìn qua webcam là nó tìm được bàn tay em. Nó đánh dấu **21 điểm mốc** trên mỗi bàn tay: đầu ngón, các khớp ngón và cổ tay, rồi đoán **cử chỉ** (dáng bàn tay): **nắm tay**, **xoè tay**, **chữ V** hay **ngón cái lên**. Một AI thứ hai tên **Pose** (tư thế) tìm **33 điểm** trên người em: mũi, mắt, vai, cổ tay… để biết đầu em ở đâu, nghiêng hay gật.

- **Đời thường:** em nhận ra bạn thân giữa đám đông vì đã nhìn mặt bạn rất nhiều lần. AI cũng vậy: nó không "hiểu" bàn tay như em, nó chỉ đã xem đủ nhiều ảnh để đoán đúng. Mở khóa điện thoại bằng khuôn mặt cũng là một kiểu AI như thế.
- **Ở ThingBlock:** nhóm khối **Camera AI** dùng webcam của máy tính và vẽ trò chơi lên khung **Sân chơi**. Sân chơi là tấm bản đồ: x từ -240 (trái) đến 240 (phải), y từ -180 (dưới) đến 180 (trên). Khối **đặt trọng lực** kéo mọi vật rơi xuống như quả táo rụng. Hình ảnh chỉ xử lý trên máy em, không gửi đi đâu. Bài Camera AI chọn **không cần mạch**.

**Đoán trước:** phòng tối, tay em đeo găng đen. AI có nhận ra tay dễ không?

- Khó hơn, vì ảnh nó học thường là tay rõ, đủ sáng
- Dễ như bình thường

> hint: Đáp án: **khó hơn**. AI chỉ giỏi với những gì giống ảnh nó đã học. Ngồi chỗ đủ sáng, để cả bàn tay trong khung hình thì AI đoán chính xác hơn.

## Mô phỏng và nạp chương trình

**Mô phỏng** là mạch ThingBot **ảo** trong khung **Mô phỏng**. Bấm **Chạy** là chương trình chạy trên mạch ảo: em giữ nút SW, chọn quả bóng, giữ nút tay cầm bằng chuột và xem đèn, động cơ, servo làm theo.

- **Đời thường:** như phi công tập trong buồng lái giả trước khi lái máy bay thật. Sai thì làm lại, không hỏng gì.
- **Ở ThingBlock:** mạch ảo luôn "đủ pin" và dây luôn cắm đúng. Mạch thật thì không: pin yếu, dây lỏng, cắm nhầm cổng đều làm robot đứng im dù chương trình đúng.

**Nạp chương trình** (nút **Nạp code**) là chép chương trình qua dây USB xuống mạch thật, để robot chạy không cần máy tính. Trước khi cắm hay rút dây cảm biến, servo trên mạch thật, em **rút pin** hoặc tắt công tắc nguồn.

**Đoán trước:** chương trình chạy đúng trên mạch ảo, nạp xuống robot thật thì động cơ không quay. Em xem gì trước?

- Pin, công tắc nguồn và dây cắm
- Viết lại chương trình

> hint: Đáp án: **pin, công tắc nguồn và dây cắm**. Chương trình đã chạy đúng trên mạch ảo. Mạch ảo không bao giờ hết pin hay cắm nhầm, nên khác biệt phải nằm ở phần cứng.

## Xong rồi

Giờ em đã có một cuốn từ điển nhỏ:

- **Chip** là bộ não, **chân IO** là dây thần kinh có số.
- **Đầu vào** báo tin cho não, **đầu ra** nhận lệnh từ não.
- **I2C** là hai sợi dây và các số nhà. **Mạch công suất** là cái loa phóng thanh của não. **OLED** là bảng chữ 128 × 64 điểm ảnh.
- **Động cơ** quay mãi, **servo** quay tới một góc rồi đứng lại.
- **Cảm biến siêu âm** đo khoảng cách như con dơi. **Mắt hồng ngoại** thấy sáng hay tối, **ngưỡng** là vạch chia. **Tay cầm PS2** nói với robot qua bộ thu.
- **Camera AI** đã học nhìn bàn tay và dáng người, vẽ trò chơi lên **Sân chơi**. **Mô phỏng** là mạch ảo để tập trước khi **nạp chương trình** xuống mạch thật.

Bài tiếp theo: mở **ThingBot Sim 1: Làm quen ThingBot** để tự bật đèn đầu tiên trên mạch ảo.
