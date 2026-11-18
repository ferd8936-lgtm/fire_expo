/* Word Guardians - 단어 데이터베이스
 * 학년별 20개 × 6학년 = 120개 (스테이지당 5개, 학년당 4스테이지)
 * 형식: [영어, 한글뜻, 이모지, 예문]
 */
const _RAW_WORDS = {
  1: [
    // 스테이지 1: 동물 친구들
    ["apple", "사과", "🍎", "I like red apples."],
    ["dog", "강아지", "🐶", "The dog is cute."],
    ["cat", "고양이", "🐱", "The cat is sleeping."],
    ["bird", "새", "🐦", "A bird can fly."],
    ["fish", "물고기", "🐟", "I see a fish."],
    // 스테이지 2: 맛있는 음식
    ["banana", "바나나", "🍌", "I eat a banana."],
    ["milk", "우유", "🥛", "I drink milk."],
    ["egg", "달걀", "🥚", "I have an egg."],
    ["bread", "빵", "🍞", "I like bread."],
    ["cake", "케이크", "🍰", "This cake is sweet."],
    // 스테이지 3: 내 물건
    ["book", "책", "📖", "I read a book."],
    ["ball", "공", "⚽", "I kick the ball."],
    ["car", "자동차", "🚗", "The car is fast."],
    ["bus", "버스", "🚌", "I go by bus."],
    ["hat", "모자", "🎩", "I wear a hat."],
    // 스테이지 4: 하늘과 자연
    ["sun", "해", "☀️", "The sun is hot."],
    ["moon", "달", "🌙", "The moon is bright."],
    ["star", "별", "⭐", "I see a star."],
    ["tree", "나무", "🌳", "The tree is tall."],
    ["flower", "꽃", "🌸", "The flower is pretty."]
  ],
  2: [
    ["pig", "돼지", "🐷", "The pig is pink."],
    ["cow", "소", "🐮", "The cow says moo."],
    ["duck", "오리", "🦆", "The duck can swim."],
    ["frog", "개구리", "🐸", "The frog can jump."],
    ["rabbit", "토끼", "🐰", "The rabbit likes carrots."],
    ["grape", "포도", "🍇", "I like purple grapes."],
    ["orange", "오렌지", "🍊", "I eat an orange."],
    ["pizza", "피자", "🍕", "I love pizza."],
    ["rice", "밥", "🍚", "I eat rice."],
    ["candy", "사탕", "🍬", "I like candy."],
    ["pencil", "연필", "✏️", "I have a pencil."],
    ["bag", "가방", "🎒", "My bag is new."],
    ["chair", "의자", "🪑", "Sit on the chair."],
    ["clock", "시계", "⏰", "Look at the clock."],
    ["door", "문", "🚪", "Open the door."],
    ["rain", "비", "🌧️", "I like the rain."],
    ["snow", "눈", "❄️", "I play in the snow."],
    ["cloud", "구름", "☁️", "I see a white cloud."],
    ["wind", "바람", "🌬️", "The wind is strong."],
    ["fire", "불", "🔥", "The fire is hot."]
  ],
  3: [
    ["lion", "사자", "🦁", "The lion is strong."],
    ["tiger", "호랑이", "🐯", "The tiger is big."],
    ["monkey", "원숭이", "🐵", "The monkey eats a banana."],
    ["elephant", "코끼리", "🐘", "The elephant has a long nose."],
    ["horse", "말", "🐴", "I ride a horse."],
    ["school", "학교", "🏫", "I go to school."],
    ["teacher", "선생님", "🧑‍🏫", "My teacher is kind."],
    ["doctor", "의사", "🧑‍⚕️", "The doctor helps people."],
    ["police", "경찰", "👮", "The police help us."],
    ["farmer", "농부", "🧑‍🌾", "The farmer grows rice."],
    ["red", "빨간색", "🔴", "I like the red apple."],
    ["blue", "파란색", "🔵", "The sky is blue."],
    ["green", "초록색", "🟢", "The grass is green."],
    ["yellow", "노란색", "🟡", "The banana is yellow."],
    ["black", "검은색", "⚫", "I have a black cat."],
    ["hand", "손", "✋", "Wash your hands."],
    ["eye", "눈(신체)", "👁️", "I close my eyes."],
    ["nose", "코", "👃", "I touch my nose."],
    ["mouth", "입", "👄", "Open your mouth."],
    ["ear", "귀", "👂", "I have two ears."]
  ],
  4: [
    ["breakfast", "아침 식사", "🥣", "I eat breakfast at seven."],
    ["lunch", "점심", "🍱", "We have lunch at school."],
    ["dinner", "저녁 식사", "🍽️", "Dinner is ready."],
    ["soup", "수프", "🍲", "I like hot soup."],
    ["salad", "샐러드", "🥗", "I eat a fresh salad."],
    ["train", "기차", "🚆", "I take the train."],
    ["plane", "비행기", "✈️", "The plane is in the sky."],
    ["ship", "배", "🚢", "The ship is on the sea."],
    ["bicycle", "자전거", "🚲", "I ride a bicycle."],
    ["taxi", "택시", "🚕", "We take a taxi."],
    ["hospital", "병원", "🏥", "The doctor is at the hospital."],
    ["library", "도서관", "📚", "I read books in the library."],
    ["park", "공원", "🏞️", "I play in the park."],
    ["market", "시장", "🛒", "We buy fruit at the market."],
    ["bank", "은행", "🏦", "My mom is at the bank."],
    ["spring", "봄", "🌱", "Flowers bloom in spring."],
    ["summer", "여름", "🍉", "I swim in summer."],
    ["autumn", "가을", "🍂", "Leaves fall in autumn."],
    ["winter", "겨울", "⛄", "It is cold in winter."],
    ["garden", "정원", "🌷", "Flowers grow in the garden."]
  ],
  5: [
    ["swim", "수영하다", "🏊", "I can swim very well."],
    ["dance", "춤추다", "💃", "She likes to dance."],
    ["sing", "노래하다", "🎤", "I sing a happy song."],
    ["read", "읽다", "👓", "I read a book every night."],
    ["draw", "그리다", "🎨", "I draw a picture."],
    ["happy", "행복한", "😊", "I am happy today."],
    ["sad", "슬픈", "😢", "He is sad now."],
    ["angry", "화난", "😠", "Mom is angry."],
    ["tired", "피곤한", "🥱", "I am tired after school."],
    ["hungry", "배고픈", "🤤", "I am hungry now."],
    ["mountain", "산", "⛰️", "We climb the mountain."],
    ["sea", "바다", "🌊", "I swim in the sea."],
    ["island", "섬", "🏝️", "We visit an island."],
    ["forest", "숲", "🌲", "Many animals live in the forest."],
    ["desert", "사막", "🏜️", "The desert is hot and dry."],
    ["computer", "컴퓨터", "💻", "I use a computer."],
    ["phone", "전화기", "📱", "My phone is ringing."],
    ["camera", "카메라", "📷", "I take photos with a camera."],
    ["robot", "로봇", "🤖", "The robot can walk."],
    ["rocket", "로켓", "🚀", "The rocket goes to space."]
  ],
  6: [
    ["weather", "날씨", "🌤️", "The weather is nice today."],
    ["earth", "지구", "🌍", "We live on the earth."],
    ["space", "우주", "🌌", "Astronauts go to space."],
    ["planet", "행성", "🪐", "Mars is a red planet."],
    ["volcano", "화산", "🌋", "The volcano is erupting."],
    ["music", "음악", "🎵", "I love music."],
    ["museum", "박물관", "🏛️", "We visit the museum."],
    ["movie", "영화", "🎬", "We watch a movie."],
    ["festival", "축제", "🎉", "The festival is fun."],
    ["holiday", "휴가", "🏖️", "We go on holiday."],
    ["health", "건강", "💪", "Health is important."],
    ["medicine", "약", "💊", "Take your medicine."],
    ["exercise", "운동하다", "🏋️", "I exercise every day."],
    ["vegetable", "채소", "🥦", "Eat your vegetables."],
    ["sleep", "자다", "😴", "I sleep eight hours."],
    ["energy", "에너지", "⚡", "The sun gives us energy."],
    ["future", "미래", "🔮", "I think about the future."],
    ["adventure", "모험", "🧭", "We go on an adventure."],
    ["treasure", "보물", "💎", "They find a treasure."],
    ["dragon", "용", "🐉", "The dragon breathes fire."]
  ]
};

const WORD_DATABASE = [];
Object.keys(_RAW_WORDS).forEach(function (g) {
  _RAW_WORDS[g].forEach(function (r, i) {
    WORD_DATABASE.push({
      id: "g" + g + "_" + (i + 1),
      grade: Number(g),
      stage: Math.floor(i / 5) + 1,
      en: r[0],
      ko: r[1],
      emoji: r[2],
      sentence: r[3]
    });
  });
});

// 학년별 스테이지 테마 이름
const STAGE_THEMES = {
  1: ["동물 친구들", "맛있는 음식", "내 물건", "하늘과 자연"],
  2: ["농장 동물", "간식 시간", "교실 물건", "날씨 마법"],
  3: ["동물원 탐험", "우리 동네 직업", "알록달록 색깔", "내 몸 구석구석"],
  4: ["하루 식사", "탈것 대모험", "우리 동네 장소", "사계절 정원"],
  5: ["동작 마스터", "내 마음 기분", "대자연 탐험", "미래 기술"],
  6: ["우주와 지구", "문화와 여가", "건강한 생활", "꿈과 모험"]
};
